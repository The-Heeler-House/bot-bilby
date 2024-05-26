// TODO:
//*  - Bluey-ify the game (if possible)
//*  - Optimize the game so it uses as less resource as possible (if that's even a possibility)
//*  - Maybe add a cool down?
//! If not possible, maybe we could scrap the game all together.

import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    EmbedBuilder,
    SlashCommandBuilder
} from "discord.js"
import { Services } from "../../Services"
import SlashCommand from "../SlashCommand"
import { randomInt } from "crypto"
import { Canvas, createCanvas, loadImage } from "canvas"
import path from "path"
import { readFileSync } from "fs"

enum CellType {
    NORMAL,
    EMPTY,
    ONE_BOMB,
    TWO_BOMB,
    THREE_BOMB,
    FOUR_BOMB,
    FIVE_BOMB,
    SIX_BOMB,
    SEVEN_BOMB,
    EIGHT_BOMB,
    BOMB_SHOWN,
    BOMB_EXPOSED,
    BOMB,
    CELL_HEADER
}

type CellData = {
    type: CellType,
    surroundingBombCount: number
}

const CELL_TEXTURE_DIR = path.join(__dirname, "../../Assets/minesweeper-data")
const MAIN_TEXTURE_RAW = readFileSync(path.join(CELL_TEXTURE_DIR, "texture.png"))

const TEXTURE_MAPPING: { [x: number]: [number, number] } = {
    [CellType.EMPTY]: [0, 0],
    [CellType.ONE_BOMB]: [1, 0],
    [CellType.TWO_BOMB]: [2, 0],
    [CellType.THREE_BOMB]: [3, 0],
    [CellType.FOUR_BOMB]: [4, 0],
    [CellType.FIVE_BOMB]: [5, 0],
    [CellType.SIX_BOMB]: [6, 0],
    [CellType.SEVEN_BOMB]: [7, 0],
    [CellType.EIGHT_BOMB]: [0, 1],
    [CellType.BOMB_SHOWN]: [1, 1],
    [CellType.BOMB_EXPOSED]: [2, 1],
    [CellType.CELL_HEADER]: [3, 1],
    [CellType.NORMAL]: [4, 1],
    [CellType.BOMB]: [4, 1]
}

const BOMB_COUNT_TO_CELL = [
    CellType.EMPTY,
    CellType.ONE_BOMB,
    CellType.TWO_BOMB,
    CellType.THREE_BOMB,
    CellType.FOUR_BOMB,
    CellType.FIVE_BOMB,
    CellType.SIX_BOMB,
    CellType.SEVEN_BOMB,
    CellType.EIGHT_BOMB,
]

const DEFAULT_CONFIG = {
    minSize: 7,
    maxSize: 20,
    timeout: 3_600_000, //? 1 hour
    difficulty: {
        hard: {
            width: 7,
            height: 7,
            bomb_count: 8
        },
        harder: {
            width: 12,
            height: 12,
            bomb_count: 21
        },
        hardest: {
            width: 20,
            height: 20,
            bomb_count: 60
        }
    }
}

const INDICATOR_TEXTURE_MAPPING: [number, number][] = [
    [5, 1], [6, 1], [7, 1], [0, 2], [1, 2],
    [2, 2], [3, 2], [4, 2], [5, 2], [6, 2],
    [7, 2], [0, 3], [1, 3], [2, 3], [3, 3],
    [4, 3], [5, 3], [6, 3], [7, 3], [0, 4],
]

const REACTIONS = [
    "🇦", "🇧", "🇨", "🇩", "🇪", "🇫", "🇬", "🇭", "🇮", "🇯",
    "🇰", "🇱", "🇲", "🇳", "🇴", "🇵", "🇶", "🇷", "🇸", "🇹"
]

const SELECTED_COL_MSG = "**Selected x coordinate**: $col"
const SELECTED_ROW_MSG = "**Selected y coordinate**: $row"

export default class MinesweeperCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("minesweeper")
        .setDescription("Bomb Squad Simulator, in Discord.")
        .addSubcommand(subcommand => subcommand
            .setName("mode")
            .setDescription(
                "Select from a predefined mode to play"
            )
            .addStringOption(option => option
                .setName("selected_mode")
                .setDescription("Mode you want to play")
                .setRequired(true)
                .addChoices(
                    ...Object.keys(DEFAULT_CONFIG.difficulty)
                        .map(v => {
                            return { "name": v, "value": v }
                        }
                    )
                )
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("custom")
            .setDescription(
                "Customize your board to your liking"
            )
            .addIntegerOption(option =>
                option.setName("width")
                    .setDescription(`The width of the board (min: ${DEFAULT_CONFIG.minSize}, max: ${DEFAULT_CONFIG.maxSize})`)
                    .setRequired(true)
                    .setMinValue(DEFAULT_CONFIG.minSize)
                    .setMaxValue(DEFAULT_CONFIG.maxSize))
            .addIntegerOption(option =>
                option.setName("height")
                    .setDescription(`The height of the board (min: ${DEFAULT_CONFIG.minSize}, max: ${DEFAULT_CONFIG.maxSize})`)
                    .setRequired(true)
                    .setMinValue(DEFAULT_CONFIG.minSize)
                    .setMaxValue(DEFAULT_CONFIG.maxSize))
            .addIntegerOption(option =>
                option.setName("number_of_bombs")
                    .setDescription(`Number of bombs on the board (min: 5, max: 80% of the total number of cell in the board)`)
                    .setRequired(true)
                    .setMinValue(5))
        ) as SlashCommandBuilder

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
        const MAIN_TEXTURE = await loadImage(MAIN_TEXTURE_RAW)
        const MAIN_TEXTURE_CANVAS = new Canvas(
            MAIN_TEXTURE.naturalWidth,
            MAIN_TEXTURE.naturalHeight
        )

        const MAIN_TEXTURE_CTX = MAIN_TEXTURE_CANVAS.getContext("2d")
        MAIN_TEXTURE_CTX.drawImage(MAIN_TEXTURE, 0, 0)
        const TEXTURE_INFO = {
            size: 128
        }
        const getTexture = (mapping: [number, number]) =>
            MAIN_TEXTURE_CTX.getImageData(
                mapping[0] * TEXTURE_INFO.size,
                mapping[1] * TEXTURE_INFO.size,
                TEXTURE_INFO.size,
                TEXTURE_INFO.size,
            )

        var overlayCoords = {
            x: -1,
            y: -1
        }

        var boardConfig = {
            width: 10,
            height: 10,
            bomb_count: 8
        }

        var selectedCell = {
            cols: -1,
            rows: -1
        }

        var gameStatus = {
            num_of_cleared_cell: 0,
            start_time: 0
        }

        const generateBoard = (width: number, height: number, bomb_count: number) => {
            const BOARD_DATA: CellData[][] = []
            const BOMB_POS = new Set<number>()
            //? init board
            for (var i = 0; i < width; i++) {
                BOARD_DATA.push(new Array(height))
                for (var j = 0; j < height; j++) {
                    BOARD_DATA[i][j] = {
                        type: CellType.NORMAL,
                        surroundingBombCount: 0
                    }
                }
            }

            //? fill with bomb
            var cnt = bomb_count
            while (cnt > 0) {
                const randX = randomInt(0, width)
                const randY = randomInt(0, height)
                //? serialize two number to a single 32-bit integer
                //? this is assuming the first two number (randX/Y) never exceed
                //? the 16-bit integer limit (65535) (which, it shouldn't?!)
                const serializedPos = randX << 16 | randY

                if (BOMB_POS.has(serializedPos)) continue
                BOMB_POS.add(serializedPos)
                BOARD_DATA[randX][randY].type = CellType.BOMB
                cnt--
            }

            //? populate board with data about the bomb
            for (const i of BOMB_POS) {
                //? deserialize the number back to pos
                const pos = {
                    x: (i >> 16) & 0xffff,
                    y: i & 0xffff
                }
                const SURROUND_CELL: [number, number][] = [
                    [pos.x - 1, pos.y - 1],
                    [pos.x - 1, pos.y],
                    [pos.x, pos.y - 1],
                    [pos.x + 1, pos.y + 1],
                    [pos.x + 1, pos.y],
                    [pos.x, pos.y + 1],
                    [pos.x + 1, pos.y - 1],
                    [pos.x - 1, pos.y + 1],
                ]

                for (const j of SURROUND_CELL) {
                    if (j[0] < 0 || j[0] > width - 1 ||
                        j[1] < 0 || j[1] > height - 1
                    ) continue

                    const CELL = BOARD_DATA[j[0]][j[1]]
                    if (CELL.type == CellType.BOMB) continue
                    BOARD_DATA[j[0]][j[1]].surroundingBombCount++
                }
            }

            return {BOARD_DATA, BOMB_POS}
        }

        const generateGameEmbed = (boardFilename: string, extraMessage: string = "") => {
            return new EmbedBuilder()
                .setColor(0x7da4ff)
                .setTitle("Bomb Squad Simulator (BETA)")
                .setImage(`attachment://${boardFilename}`)
                .setDescription(
                    `This game session was created by <@${interaction.user.id}>.\n` +
                    `Only reactions from this user will be accepted.\n` +
                    `Config: ${boardConfig.width} x ${boardConfig.height}, ${boardConfig.bomb_count} bombs\n` +
                    `NOTE: This game session will/has automatically end <t:${Math.floor((gameStatus.start_time + DEFAULT_CONFIG.timeout) / 1000)}:R>\n` +
                    extraMessage
                )
                .setTimestamp()
                .setFooter({ text: "Bot Billy the Bomb Diffuser" })
        }

        switch (interaction.options.getSubcommand()) {
            case "mode":
                const SELECTED_MODE = interaction.options.getString("selected_mode")
                boardConfig = DEFAULT_CONFIG.difficulty[SELECTED_MODE]
                break
            case "custom":
                const WIDTH = interaction.options.getInteger("width")
                const HEIGHT = interaction.options.getInteger("height")
                var NUM_OF_BOMBS = interaction.options.getInteger("number_of_bombs")
                //? cap the number of bombs
                NUM_OF_BOMBS = Math.min(NUM_OF_BOMBS, Math.floor(WIDTH * HEIGHT * 0.8))

                boardConfig.width = WIDTH
                boardConfig.height = HEIGHT
                boardConfig.bomb_count = NUM_OF_BOMBS
                break
        }

        const INIT_EMBED = new EmbedBuilder()
            .setColor("Yellow")
            .setTitle("Initializing")
            .setFooter({ text: "Bot Billy the Bomb Diffuser" })

        await interaction.reply({
            embeds: [INIT_EMBED]
        })

        const COLS_ACTION_ROWS: ActionRowBuilder<ButtonBuilder>[] = []
        for (var i = 0; i < Math.ceil(boardConfig.width / 5); i++) {
            COLS_ACTION_ROWS.push(
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        ...REACTIONS.slice(i * 5, Math.min((i + 1) * 5, boardConfig.width))
                            .map(
                                v => new ButtonBuilder()
                                    .setEmoji(v)
                                    .setCustomId(v)
                                    .setStyle(ButtonStyle.Secondary)
                            )
                    )
            )
        }
        const COLS_MESSAGE = await interaction.channel.send({
            content: SELECTED_COL_MSG.replace("$col", ""),
            components: COLS_ACTION_ROWS
        })
        const COLS_COLLECTOR = COLS_MESSAGE.createMessageComponentCollector({
            time: DEFAULT_CONFIG.timeout,
            filter: i => interaction.user.id == i.user.id,
            componentType: ComponentType.Button
        })

        const ROWS_ACTION_ROWS: ActionRowBuilder<ButtonBuilder>[] = []
        for (var i = 0; i < Math.ceil(boardConfig.height / 5); i++) {
            ROWS_ACTION_ROWS.push(
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        ...REACTIONS.slice(i * 5, Math.min((i + 1) * 5, boardConfig.height))
                            .map(
                                v => new ButtonBuilder()
                                    .setEmoji(v)
                                    .setCustomId(v)
                                    .setStyle(ButtonStyle.Secondary)
                            )
                    )
            )
        }
        const ROWS_MESSAGE = await interaction.channel.send({
            content: SELECTED_ROW_MSG.replace("$row", ""),
            components: ROWS_ACTION_ROWS
        })
        const ROWS_COLLECTOR = ROWS_MESSAGE.createMessageComponentCollector({
            time: DEFAULT_CONFIG.timeout,
            filter: i => interaction.user.id == i.user.id,
            componentType: ComponentType.Button
        })

        const ACTION_BUTTON = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("confirm")
                    .setEmoji("🚀")
                    .setLabel("Confirm!")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("quit")
                    .setEmoji("💣")
                    .setLabel("I GIVE UP!")
                    .setStyle(ButtonStyle.Danger)
            )
        const ACTION_MESSAGE = await interaction.channel.send({
            content: "** **",
            components: [ACTION_BUTTON]
        })
        const ACTION_COLLECTOR = ACTION_MESSAGE.createMessageComponentCollector({
            time: DEFAULT_CONFIG.timeout,
            componentType: ComponentType.Button,
            filter: i => interaction.user.id == i.user.id,
        })

        const {BOARD_DATA, BOMB_POS} =
            generateBoard(boardConfig.width, boardConfig.height, boardConfig.bomb_count)

        const GAME_BOARD = createCanvas(
            boardConfig.width * TEXTURE_INFO.size + TEXTURE_INFO.size,
            boardConfig.height * TEXTURE_INFO.size + TEXTURE_INFO.size
        )
        const ctx = GAME_BOARD.getContext("2d")
        const updateBoard = async (extraMessage: string = "") => {
            ctx.fillStyle = "#888888"
            ctx.fillRect(0, 0, GAME_BOARD.width, GAME_BOARD.height)

            //? draw minesweeper cell
            for (var i = 0; i < boardConfig.width; i++) {
                for (var j = 0; j < boardConfig.height; j++) {
                    const CELL_DATA = BOARD_DATA[i][j]
                    ctx.putImageData(
                        getTexture(TEXTURE_MAPPING[CELL_DATA.type]),
                        i * TEXTURE_INFO.size + TEXTURE_INFO.size,
                        j * TEXTURE_INFO.size + TEXTURE_INFO.size,
                    )
                }
            }

            //? draw cols indicator
            for (var i = 0; i < boardConfig.width; i++) {
                ctx.putImageData(
                    getTexture(INDICATOR_TEXTURE_MAPPING[i]),
                    (i + 1) * TEXTURE_INFO.size, 0,
                )
            }

            //? draw rows indicator
            for (var i = 0; i < boardConfig.height; i++) {
                ctx.putImageData(
                    getTexture(INDICATOR_TEXTURE_MAPPING[i]),
                    0, (i + 1) * TEXTURE_INFO.size,
                )
            }

            //? draw header
            {
                ctx.putImageData(
                    getTexture(TEXTURE_MAPPING[CellType.CELL_HEADER]),
                    0, 0,
                )
            }

            //? draw col indicator
            //? 0.5 is added so the line will draw in the middle
            ctx.strokeStyle = "#ff0000"
            ctx.lineWidth = 6
            ctx.beginPath()
            ctx.moveTo((overlayCoords.x + 0.5) * TEXTURE_INFO.size, 0)
            ctx.lineTo((overlayCoords.x + 0.5) * TEXTURE_INFO.size, GAME_BOARD.height)
            ctx.stroke()

            //? draw row indicator
            //? 0.5 is added so the line will draw in the middle
            ctx.beginPath()
            ctx.moveTo(0, (overlayCoords.y + 0.5) * TEXTURE_INFO.size)
            ctx.lineTo(GAME_BOARD.width, (overlayCoords.y + 0.5) * TEXTURE_INFO.size)
            ctx.stroke()

            const BOARD_FILE = new AttachmentBuilder(
                GAME_BOARD.toBuffer(), {name: "board.png"})

            await interaction.editReply({
                embeds: [generateGameEmbed("board.png", extraMessage)],
                files: [BOARD_FILE]
            })
        }

        const gameOverHandler = async () => {
            for (const i of BOMB_POS) {
                const pos = {
                    x: (i >> 16) & 0xffff,
                    y: i & 0xffff
                }
                BOARD_DATA[pos.x][pos.y].type = CellType.BOMB_EXPOSED
            }
            await updateBoard("Game over! You lose! 💥")
            COLS_COLLECTOR.stop()
            ROWS_COLLECTOR.stop()
            ACTION_COLLECTOR.stop()
        }

        const digCell = async (x: number, y: number) => {
            const DATA = BOARD_DATA[x][y]
            var listOfUpdates: {x: number, y: number}[] = []

            const findAndUpdateEmptyCell = (initX: number, initY: number, ) => {
                var CELL: CellData | undefined = undefined
                try {
                    CELL = BOARD_DATA[initX][initY]
                } catch (_) {}

                if (CELL == undefined) return
                if (listOfUpdates.findIndex(v => { return v.x == initX && v.y == initY }) != -1) return

                listOfUpdates.push({ x: initX, y: initY })
                gameStatus.num_of_cleared_cell++

                if (CELL.surroundingBombCount != 0) {
                    BOARD_DATA[initX][initY].type = BOMB_COUNT_TO_CELL[CELL.surroundingBombCount]
                    return
                }

                BOARD_DATA[initX][initY].type = CellType.EMPTY
                findAndUpdateEmptyCell(initX - 1, initY)
                findAndUpdateEmptyCell(initX + 1, initY)
                findAndUpdateEmptyCell(initX, initY - 1)
                findAndUpdateEmptyCell(initX, initY + 1)
                findAndUpdateEmptyCell(initX - 1, initY - 1)
                findAndUpdateEmptyCell(initX + 1, initY - 1)
                findAndUpdateEmptyCell(initX + 1, initY - 1)
                findAndUpdateEmptyCell(initX + 1, initY + 1)
            }

            //? handle already dug cell
            if (DATA.type != CellType.NORMAL && DATA.type != CellType.BOMB) {
                return
            }

            if (DATA.type == CellType.BOMB) { //? handle bomb
                await gameOverHandler()
                return
            } else if (DATA.surroundingBombCount == 0) { //? handle empty cell
                findAndUpdateEmptyCell(x, y)
            } else {
                gameStatus.num_of_cleared_cell++
                BOARD_DATA[x][y].type = BOMB_COUNT_TO_CELL[BOARD_DATA[x][y].surroundingBombCount]
                listOfUpdates.push({x: x, y: y})
            }

            await updateBoard()
        }

        gameStatus.start_time = new Date().getTime()
        await updateBoard()

        COLS_COLLECTOR.on("collect", async e => {
            const EMOJIS = e.customId
            selectedCell.cols = REACTIONS.findIndex(v => v == EMOJIS)
            await e.message.edit(SELECTED_COL_MSG.replace("$col", EMOJIS))
            overlayCoords = {
                x: selectedCell.cols + 1,
                y: overlayCoords.y
            }
            await e.update({})
            await updateBoard()
        })

        ROWS_COLLECTOR.on("collect", async e => {
            const EMOJIS = e.customId
            selectedCell.rows = REACTIONS.findIndex(v => v == EMOJIS)
            await e.message.edit(SELECTED_ROW_MSG.replace("$row", EMOJIS))
            overlayCoords = {
                x: overlayCoords.x,
                y: selectedCell.rows + 1,
            }
            await e.update({})
            await updateBoard()
        })

        ACTION_COLLECTOR.on("collect", async e => {
            await e.update({})
            switch (e.customId) {
                case "confirm":
                    if (selectedCell.cols == -1 || selectedCell.rows == -1) {
                        await e.reply({
                            content: "You must select a column and a row using the button above!",
                            ephemeral: true
                        })
                        return
                    }
                    overlayCoords = {
                        x: -1,
                        y: -1,
                    }
                    await digCell(selectedCell.cols, selectedCell.rows)
                    COLS_MESSAGE.edit(SELECTED_COL_MSG.replace("$col", ""))
                    ROWS_MESSAGE.edit(SELECTED_ROW_MSG.replace("$row", ""))
                    selectedCell = {
                        cols: -1,
                        rows: -1
                    }

                    if (gameStatus.num_of_cleared_cell == boardConfig.width * boardConfig.height - boardConfig.bomb_count) {
                        for (const i of BOMB_POS) {
                            const pos = {
                                x: (i >> 16) & 0xffff,
                                y: i & 0xffff
                            }
                            BOARD_DATA[pos.x][pos.y].type = CellType.BOMB_SHOWN
                        }
                        await updateBoard("You win! 🎉")
                        COLS_COLLECTOR.stop()
                        ROWS_COLLECTOR.stop()
                        ACTION_COLLECTOR.stop()
                        return
                    }
                    break
                case "quit":
                    await gameOverHandler()
                    break
            }
        })
    }
}