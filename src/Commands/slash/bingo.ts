import {
    AttachmentBuilder,
    CacheType,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder
} from "discord.js"
import { Services } from "../../Services"
import SlashCommand from "../SlashCommand"
import path from "path"
import { readdir } from "fs/promises"
import { CanvasRenderingContext2D, createCanvas, loadImage, registerFont } from "canvas"
import { readFileSync } from "fs"

const bingoDataDir = path.join(__dirname, "../../Assets/bingo-data")
const epsDataFile = "eps.txt"
const bgFile = "bg.png"
const fontFile = "font.ttf"
const BINGO_FILENAME = "bingo.png"

const epsData = readFileSync(path.join(bingoDataDir, epsDataFile), "utf-8")

function getLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
    var words = text.split(" ");
    var lines: string[] = [];
    var currentLine = words[0];

    for (var i = 1; i < words.length; i++) {
        var word = words[i];
        var width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

registerFont(path.join(bingoDataDir, fontFile), { family: "Hello Headline" })

export default class BingoCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("bingo")
        .setDescription("Create a Bingo card to play while watching Bluey Episodes!")

    async execute(
        interaction: ChatInputCommandInteraction<CacheType>,
        services: Services): Promise<void>
    {

        // var ITEM_LIST = await readdir(BINGO_IMAGE_DIR)
        // ITEM_LIST = ITEM_LIST.filter(v => v.startsWith("Prompt - "))
        // ITEM_LIST = ITEM_LIST.sort(_ => 0.5 - Math.random()) //? shuffle
        // ITEM_LIST = ITEM_LIST.slice(0, 25)
        const boardSize = 5
        const imageSize = 128
        const fontSize = 16
        const textGap = 16
        const padding = 16
        const textColor = "rgb(90, 90, 135)"
        const canvasSize = boardSize * imageSize

        let eps = epsData.split("\n")
        eps = eps.sort(_ => 0.5 - Math.random())
        eps = eps.slice(0, boardSize ** 2)

        const bingoCard = createCanvas(canvasSize, canvasSize)
        const ctx = bingoCard.getContext("2d")
        const IMG = await loadImage(
            path.join(bingoDataDir, bgFile))

        ctx.font = `${fontSize}px "Hello Headline"`
        ctx.fillStyle = textColor
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        for (var i = 0; i < boardSize; i++) {
            for (var j = 0; j < boardSize; j++) {
                ctx.drawImage(IMG, i * imageSize, j * imageSize, imageSize, imageSize)

                //? manually calculating where to put text. don't ask, it's black magic!
                const texts = getLines(ctx, eps[i * boardSize + j], imageSize - padding * 2)
                const offset = -textGap / 2 * (texts.length - 1)
                for (let k = 0; k < texts.length; k++) {
                    ctx.fillText(texts[k], i * imageSize + imageSize / 2, j * imageSize + imageSize / 2 + offset + k * textGap)
                }
            }
        }

        const FILE = new AttachmentBuilder(
            bingoCard.toBuffer(), {name: BINGO_FILENAME})

        const BINGO_EMBED = new EmbedBuilder()
            .setColor(0xe27a37)
            .setTitle("Bingo!")
            .setDescription(
                "<:Bluey:965545191270400000> Bluey, <:Bingo:965564211642105867> Bingo!\n" +
                "A Bingo card to play along to while you watch episodes of Bluey!\n" +
                `This card is for <@${interaction.user.id}>.`
            )
            .setImage(`attachment://${BINGO_FILENAME}`)
            .setTimestamp()

        await interaction.reply({
            embeds: [BINGO_EMBED],
            files: [FILE],
        })
    }
}