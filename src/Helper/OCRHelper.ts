import sharp from "sharp"
import { createScheduler, createWorker, RecognizeResult, Scheduler } from "tesseract.js"

type SwearResult = {
    url: string,
    swears: {
        word: string,
        confidence: number
    }[]
}

// async function

export class SwearScanner {
    swearWords: string[]
    confidence: number
    numWorkers: number
    #scheduler: Scheduler
    constructor(swearWords = [], confidence = 50, numWorkers = 10) {
        this.#scheduler = createScheduler()
        this.swearWords = swearWords
        this.confidence = confidence
        this.numWorkers = numWorkers
    }

    async resetOCR() {
        this.#scheduler.terminate()
        for (let i = 0; i < this.numWorkers; i++) {
            const worker = await createWorker("eng")
            this.#scheduler.addWorker(worker)
        }
    }

    private async ocr(imageURLs: string[]) {
        let timestamp: number[] = []

        let ocrResult: { image_url: string, data: RecognizeResult[] }[] = []
        for (const url of imageURLs) {
            timestamp.push(performance.now())
            const sharp_img = sharp(await (await fetch(url)).arrayBuffer())
                .toFormat("png")
                .resize({ fit: "contain", width: 900, height: 900 })
                .grayscale()
                // .median(3)
                .blur({ sigma: 1 })
                .sharpen({
                    sigma: 7,
                    m1: 2.5,
                    m2: 2.5
                })

            const imgs = [
                sharp_img.threshold(110).toBuffer(),
                sharp_img.threshold(160).toBuffer()
            ]
            timestamp.push(performance.now())

            timestamp.push(performance.now())
            const ocrData: RecognizeResult[] = []
            for (const i of imgs) {
                ocrData.push(await this.#scheduler.addJob("recognize", await i))
            }

            ocrResult.push({
                image_url: url,
                data: ocrData
            })
            timestamp.push(performance.now())
        }

        return {
            timing: timestamp,
            ocrResult
        }
    }

    async scan(imageURLs: string[]) {
        const ocrOutput = await this.ocr(imageURLs)
        const ocrResult = ocrOutput.ocrResult

        let swearResult: SwearResult[] = []
        for (const result of ocrResult) {
            let wordList: SwearResult["swears"] = []
            let swearList = this.swearWords.map(v => v.toLowerCase())

            for (const d of result.data) {
                wordList.push(...d.data.words.map(v => ({word: v.text.toLowerCase(), confidence: v.confidence})))
            }

            wordList = wordList.filter(v => v.confidence >= this.confidence)

            const seenWords = new Set<string>()
            wordList = wordList.filter(v => {
                if (!seenWords.has(v.word)) {
                    seenWords.add(v.word)
                    return true
                }
                return false
            })

            let detectedSwears = wordList.filter(v => swearList.map(swears => v.word.includes(swears)).reduce((a, b) => a || b))
            if (detectedSwears.length <= 0) continue

            swearResult.push({
                url: result.image_url,
                swears: detectedSwears
            })
        }

        return {
            result: swearResult,
            timing: ocrOutput.timing
        }
    }
}