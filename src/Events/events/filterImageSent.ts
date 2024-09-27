import { createWorker, createScheduler, RecognizeResult } from "tesseract.js"
import BotEvent from "../BotEvent"
import { Client, Events, Message, TextChannel } from "discord.js"
import { Services } from "../../Services"
import { isTHHorDevServer } from "../../Helper/EventsHelper"
import { Jimp, ResizeStrategy } from "jimp"
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
    const img = await Jimp.read(url)
    img.scaleToFit({ w: 1000, h: 1000, mode: ResizeStrategy.BICUBIC })
    img.color([{ apply: "desaturate", params: [90] }])
    img.gaussian(1)
    img.invert()
    img.threshold({ max: 145 })
    return await img.getBuffer("image/tiff")
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

        const imageURLs = message.attachments.filter(v => v.contentType.startsWith("image/")).map(v => v.url)
        let ocrResult: { image_url: string, data: RecognizeResult }[] = []
        for (const url of imageURLs) {
            ocrResult.push({
                image_url: url,
                data: await scheduler.addJob("recognize", await processImage(url))
            })
        }

        let swearResult: SwearResult[] = []
        for (const result of ocrResult) {
            let wordList = result.data.data.words.map(v => ({word: v.text.toLowerCase(), confidence: v.confidence}))
            let swearList = services.state.state.swearWords.map(v => v.toLowerCase())

            wordList = wordList.filter(v => v.confidence >= CONFIDENCE_THRESHOLD)

            swearResult.push({
                url: result.image_url,
                swears: wordList.filter(v => swearList.map(swears => v.word.includes(swears)).reduce((a, b) => a || b))
            })
        }

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
        }
    }
}