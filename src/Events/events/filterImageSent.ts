import { createWorker, createScheduler, RecognizeResult } from "tesseract.js"
import BotEvent from "../BotEvent"
import { Client, Events, Message, TextChannel } from "discord.js"
import { Services } from "../../Services"
import { isTHHorDevServer } from "../../Helper/EventsHelper"
import { Jimp, ResizeStrategy } from "jimp"
import { channelIds } from "../../constants"

let scheduler = createScheduler()

const CONFIDENCE_THRESHOLD = 50
const NUM_WORKERS = 5

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

export default class FilterImageSentEvent extends BotEvent {
    public eventName = Events.MessageCreate;

    async execute(client: Client, services: Services, message: Message): Promise<void> {
        if (!isTHHorDevServer(message.guild.id)) return;
        if (message.author.bot) return

        const imageURLs = message.attachments.filter(v => v.contentType.startsWith("image/")).map(v => v.url)
        let ocrResult: RecognizeResult[] = []
        for (const url of imageURLs) {
            const img = await Jimp.read(url)
            img.scaleToFit({ w: 1000, h: 1000, mode: ResizeStrategy.BICUBIC })
            img.color([{ apply: "desaturate", params: [90] }])
            img.gaussian(1)
            img.invert()
            img.threshold({ max: 145 })
            ocrResult.push(await scheduler.addJob("recognize", await img.getBuffer("image/tiff"), {}, {}, url))
        }

        let swearResult: {url: string, word: string, confidence: number}[] = []
        for (const data of ocrResult) {
            let words = data.data.words.map(v => ({url: data.jobId, word: v.text, confidence: v.confidence}))
            let swears = services.state.state.swearWords.map(v => v.toLowerCase())

            swearResult = words.filter(v => {
                if (v.confidence < CONFIDENCE_THRESHOLD) return false
                let word = v.word.toLowerCase().trim()
                return swears.map(v => word.includes(v)).reduce((a, b) => a || b)
            })
        }

        const logChannel = await message.client.channels.fetch(channelIds.mediaLog) as TextChannel;

        if (swearResult.length > 0) {
            await logChannel.send({
                content: `Swear detected in one of the image: \`${swearResult.map(v => `${v.word} (${v.confidence.toFixed(2)}%)`).join(", ")}\` sent by <@${message.author.id}> in <#${message.channelId}>.`,
                files: swearResult.map(v => ({
                    attachment: v.url
                }))
            })
            await message.reply(`<@${message.author.id}>, Watch your language.`)
        }
    }
}