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
import { createCanvas, loadImage } from "canvas"

export default class BingoCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("bingo")
        .setDescription("Create a Bingo card to play while watching Bluey Episodes!")
        async execute(
            interaction: ChatInputCommandInteraction<CacheType>,
            services: Services): Promise<void>
        {
            const BINGO_IMAGE_DIR = path.join(__dirname, "../../Assets/bingo-data")
            const FREE_SPACE_ITEM = "freespace.png"
            const BINGO_FILENAME = "bingo.png"

            var ITEM_LIST = await readdir(BINGO_IMAGE_DIR)
            ITEM_LIST = ITEM_LIST.filter(v => v.startsWith("Prompt - "))
            ITEM_LIST = ITEM_LIST.sort(_ => 0.5 - Math.random()) //? shuffle
            ITEM_LIST = ITEM_LIST.slice(0, 25)

            const BINGO_ITEMS = 5
            const CANVAS_WIDTH = 500, CANVAS_HEIGHT = 500
            const CANVAS_ITEM_WIDTH = CANVAS_WIDTH / BINGO_ITEMS
            const CANVAS_ITEM_HEIGHT = CANVAS_WIDTH / BINGO_ITEMS

            const BINGO_CARD = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT)
            const ctx = BINGO_CARD.getContext("2d")

            for (var i = 0; i < BINGO_ITEMS; i++) {
                for (var j = 0; j < BINGO_ITEMS; j++) {
                    var selectedItem = ITEM_LIST[i * 5 + j]
                    if (i == Math.floor(BINGO_ITEMS / 2) &&
                        j == Math.floor(BINGO_ITEMS / 2)) {
                            selectedItem = FREE_SPACE_ITEM
                    }
                    const IMG = await loadImage(
                        path.join(BINGO_IMAGE_DIR, selectedItem))
                    ctx.drawImage(IMG,
                        i * CANVAS_ITEM_WIDTH,
                        j * CANVAS_ITEM_HEIGHT,
                        CANVAS_ITEM_WIDTH,
                        CANVAS_ITEM_HEIGHT)
                }
            }

            const FILE = new AttachmentBuilder(
                BINGO_CARD.toBuffer(), {name: BINGO_FILENAME});

            const BINGO_EMBED = new EmbedBuilder()
                .setColor(0x7da4ff)
                .setTitle("Bingo!")
                .setDescription(
                    "<:Bluey:965545191270400000> Bluey, <:Bingo:965564211642105867> Bingo!\n" +
                    "A Bingo card to play along to while you watch episodes of Bluey!\n" +
                    `This card is for <@${interaction.user.id}>`
                )
                .setImage(`attachment://${BINGO_FILENAME}`)
                .setTimestamp()
                .setFooter({
                    text: "Bot Billy"
                })

            await interaction.reply({
                embeds: [BINGO_EMBED],
                files: [FILE],
            })
        }
}