import { createWorker, createScheduler, RecognizeResult } from "tesseract.js"
import BotEvent from "../BotEvent"
import { Client, Events, Message, TextChannel } from "discord.js"
import { Services } from "../../Services"
import { isTHHorDevServer } from "../../Helper/EventsHelper"
import sharp from "sharp"
import { channelIds } from "../../constants"

let scheduler = createScheduler()

const CONFIDENCE_THRESHOLD = 50
const NUM_WORKERS = 10

const initOCR = async () => {
    await scheduler.terminate()
    for (let i = 0; i < NUM_WORKERS; i++) {
        const worker = await createWorker("eng")
        scheduler.addWorker(worker)
    }
}

(async() => {
    await initOCR()
    setInterval(initOCR, 3 * 60 * 60 * 1000) //? reset the OCR every 3 hours
})()

async function processImage(url: string) {
    const sharp_img = sharp(await (await fetch(url)).arrayBuffer())
        .resize({ fit: "contain", width: 1000, height: 1000 })
        .grayscale()
        .blur({ sigma: 1 })
        .sharpen({
            sigma: 7,
            m1: 2.5,
            m2: 2.5
        })
        .threshold(128)
        .toFormat("png")
    await sharp_img.toFile("a.png")
    return sharp_img.toBuffer()
}

type SwearResult = {
    url: string,
    swears: {
        word: string,
        confidence: number
    }[]
}

export default class FilterImageSentEvent extends BotEvent {
    public eventName = Events.MessageCreate;

    async execute(client: Client, services: Services, message: Message): Promise<void> {
        if (!isTHHorDevServer(message.guild.id)) return;
        if (message.author.bot) return

        const timestamp: number[] = []
        const imageURLs = message.attachments.filter(v => v.contentType.startsWith("image/")).map(v => v.url)

        if (message.embeds.length > 0) {
            for (let embed of message.embeds) {
                imageURLs.push(embed.thumbnail.proxyURL)
            }
        }

        let ocrResult: { image_url: string, data: RecognizeResult }[] = []
        for (const url of imageURLs) {
            timestamp.push(performance.now())
            const img = await processImage(url)
            timestamp.push(performance.now())

            timestamp.push(performance.now())
            //? processed image
            ocrResult.push({
                image_url: url,
                data: await scheduler.addJob("recognize", img)
            })
            timestamp.push(performance.now())
        }

        const timing: string[] = []

        for (let i = 0; i < timestamp.length; i += 4) {
            timing.push(`[${((timestamp[i + 1] - timestamp[i]) / 1000).toFixed(3)}s, ${((timestamp[i + 3] - timestamp[i + 2]) / 1000).toFixed(3)}s]`)
        }

        let swearResult: SwearResult[] = []
        for (const result of ocrResult) {
            let wordList = result.data.data.words.map(v => ({word: v.text.toLowerCase(), confidence: v.confidence}))
            let swearList = services.state.state.swearWords.map(v => v.toLowerCase())

            wordList = wordList.filter(v => v.confidence >= CONFIDENCE_THRESHOLD)

            let detectedSwears = wordList.filter(v => swearList.map(swears => v.word.includes(swears)).reduce((a, b) => a || b))
            if (detectedSwears.length <= 0) continue

            swearResult.push({
                url: result.image_url,
                swears: detectedSwears
            })
        }

        //? filter duplicate URL
        const seen = new Set()
        swearResult = swearResult.filter(v => {
            if (!seen.has(v.url)) {
                seen.add(v.url)
                return true
            }
            return false
        })

        const logChannel = await message.client.channels.fetch(channelIds.mediaLog) as TextChannel;

        if (swearResult.length > 0) {
            await message.reply(`<@${message.author.id}>, Watch your language.`)
            for (const result of swearResult) {
                await logChannel.send({
                    content: `Swear detected in this image: \`${result.swears.map(v => `${v.word} (${v.confidence.toFixed(2)}%)`).join(", ")}\` sent by <@${message.author.id}> in <#${message.channelId}>.`,
                    files: [{
                        attachment: result.url
                    }]
                })
            }
            await logChannel.send({
                content: `OCR timing (process image, ocr): \`${timing.join(" | ")}\``
            })
        }
    }
}