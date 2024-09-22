import { createWorker, createScheduler, RecognizeResult, OEM, PSM } from "tesseract.js"
import BotEvent from "../BotEvent"
import { Client, Events, Message } from "discord.js"
import { Services } from "../../Services"
import { isTHHorDevServer } from "../../Helper/EventsHelper"
import { Jimp, ResizeStrategy } from "jimp"

const scheduler = createScheduler()
const workerGen = async () => {
    const worker = await createWorker("eng")
    // worker.setParameters({
    //     tessedit_char_whitelist: "abcdefghijklmnopqrstuvwxyz0123456789",
    //     tessedit_pageseg_mode: PSM.SPARSE_TEXT_OSD
    // })
    scheduler.addWorker(worker)
}

const initOCR = async () => {
    await scheduler.terminate()
    for (let i = 0; i < 5; i++) await workerGen()
}

(async() => {
    await initOCR()
    setInterval(initOCR, 3 * 60 * 60 * 1000) //? reset the OCR every 3 hours
})()

export default class FilterImageSentEvent extends BotEvent {
    public eventName = Events.MessageCreate;

    async execute(client: Client, services: Services, message: Message): Promise<void> {
        if (!isTHHorDevServer(message.guild.id)) return;

        const imageURLs = message.attachments.filter(v => v.contentType.startsWith("image/")).map(v => v.url)
        let ocrResult: RecognizeResult[] = []
        for (const url of imageURLs) {
            const img = await Jimp.read(url)
            img.scaleToFit({ w: 1000, h: 1000, mode: ResizeStrategy.BICUBIC })
            img.greyscale()
            img.contrast(0.75)
            ocrResult.push(await scheduler.addJob("recognize", await img.getBuffer("image/tiff")))
        }

        let swearResult: string[] = []
        for (const data of ocrResult) {
            const t = data.data.text

            swearResult = services.state.state.swearWords.map(v => {
                if (t.trim().toLowerCase().includes(v.toLowerCase())) {
                    return v
                } else {
                    return ""
                }
            }).filter(v => v != "")
        }

        if (swearResult.length > 0) {
            await message.reply(`Swear detected! "${swearResult.join(", ")}"`)
        }
    }
}