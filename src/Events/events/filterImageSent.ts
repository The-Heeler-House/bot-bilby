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

const badWords = [
    "Arse", "Fatass", "Fatasses", "Fetish", "Niggr",
    "Nigr", "anal", "arsehole", "arseholes", "arsenigga",
    "arseniggas", "arsenigger", "arseniggers", "ass", "assnigga",
    "assniggas", "assnigger", "assniggers", "bastard", "bastards",
    "beaner", "beaners", "bellend", "bitch", "bitchass",
    "bitchblower", "bitched", "bitches", "bitching", "bitchs",
    "bitchtits", "bitchy", "childfucker", "childfuckers", "chink",
    "chinkies", "chinks", "chinky", "clitfucker", "clitfuckers",
    "cock", "cocks", "cocksucker", "cocksuckers", "cum",
    "cumdumpster", "cumdumpsters", "cumduzzler", "cumduzzlers",
    "cumming", "cums", "cunt", "cunter", "cunters",
    "cuntgrabber", "cuntgrabbers", "cuntlicker", "cuntlickers", "cunts",
    "dick", "dickhead", "dicks", "dicksucker", "dicksuckers",
    "dickweasel", "dickweasels", "dickweed", "dickweeds", "dumbarse",
    "dumbarses", "dumbass", "dune coon", "dune coons", "dunecoon",
    "dunecoons", "dyke", "dykes", "fag", "faggot",
    "faggoting", "faggots", "faggy", "fags", "fat fuck",
    "fatarse", "fatarses", "fatfuck", "fuck", "fucka",
    "fuckaz", "fucked", "fucker", "fuckers", "fuckhead",
    "fuckheads", "fuckin'", "fucking", "fucks", "fucktard",
    "fucktardis", "fucktards", "gaydo", "gaydoes", "gaydos",
    "gook", "gooks", "gringo", "gringoes", "gringos",
    "jizz", "joto", "kaffir", "kaffirs", "kike",
    "lezzie", "lezzies", "lezzo", "lezzos", "mcfaggot",
    "motherfucker", "motherfuckers", "motherfucking", "motherfuckin’", "niga",
    "nigaz", "niger", "nigerz", "nigga", "niggas",
    "niggaz", "nigger", "niggers", "nigguh", "niggur",
    "niggurz", "nigr", "nigrs", "nigrz", "niguh",
    "paki", "pakis", "poonani", "porn", "porno",
    "pornos", "prick", "queers", "r 34", "r34",
    "rape", "retard", "retarded", "sand nigga", "sand niggas",
    "sand nigger", "sand niggers", "sandnigga", "sandniggas", "sandnigger",
    "sandniggers", "School shooter", "School shooting", "shat", "sheep shagger",
    "sheep shaggers", "sheepshagger", "sheepshaggers", "shit", "shitaz",
    "shithead", "shitheads", "shithouse", "shithouses", "shitpost",
    "shitposter", "shitposters", "shitposting", "shitpostin’", "shitposts",
    "shits", "shitted", "shitter", "shitters", "shittier",
    "shittiest", "shitting", "shittin’", "shitty", "slut",
    "sluts", "snow nigga", "snow niggas", "snow niggaz", "snow nigger",
    "snow niggers", "snowniggas", "snowniggaz", "snownigger", "snowniggers",
    "tacohead", "tacoheads", "thot", "thotbot", "thotbots",
    "thots", "uncle fucka", "uncle fuckaz", "uncle fucker", "uncle fuckers",
    "unclefucka", "unclefuckaz", "unclefucker", "unclefuckers", "wank",
    "wanked", "wanking", "wanks", "wetback", "wetbacks",
    "white cracka", "white crackas", "white crackaz", "white cracker", "white crackers",
    "whitecracka", "whitecrackaz", "whitecracker", "whitecrackers", "whore",
    "whores", "whoresons", "whorseson", "zipperhead", "zipperheads"
]

type SwearResult = {
    word: string,
    confidence: number
}

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

            swearResult = badWords.map(v => {
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