import { AttachmentBuilder, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js"
import { Services } from "../../Services"
import SlashCommand from "../SlashCommand"
import { randomInt } from "crypto"
import path from "path"
import { readFileSync } from "fs"
import { loadImage, Canvas, ImageData } from "canvas"

class Cell {
    leftWall: boolean
    topWall: boolean
    visited: boolean
    x: number
    y: number

    constructor(x: number, y: number) {
        this.leftWall = true
        this.topWall = true
        this.visited = false
        this.x = x
        this.y = y
    }
}

enum WallType {
    TOP_WALL_NORMAL,
    LEFT_WALL_NORMAL,
    BOTTOM_RIGHT_CORNER_NORMAL
}

const TEXTURE_MAPPING: { [x: number]: [number, number] } = {
    [WallType.TOP_WALL_NORMAL]: [0, 0],
    [WallType.LEFT_WALL_NORMAL]: [1, 0],
    [WallType.BOTTOM_RIGHT_CORNER_NORMAL]: [2, 0]
}

const MAZE_TEXTURE_DIR = path.join(__dirname, "../../Assets/maze-data")
const MAIN_TEXTURE_RAW = readFileSync(path.join(MAZE_TEXTURE_DIR, "texture.png"))

function createGrid(rows: number, cols: number) {
    const grid: Cell[][] = []
    for (let y = 0; y < rows; y++) {
        const row = []
        for (let x = 0; x < cols; x++) {
            row.push(new Cell(x, y))
        }
        grid.push(row)
    }
    return grid
}

function getNeighbors(grid: Cell[][], cell: Cell) {
    const neighbors = []
    const { x, y } = cell

    if (x > 0) neighbors.push(grid[y][x - 1]) // Left
    if (x < grid[0].length - 1) neighbors.push(grid[y][x + 1]) // Right
    if (y > 0) neighbors.push(grid[y - 1][x]) // Up
    if (y < grid.length - 1) neighbors.push(grid[y + 1][x]) // Down

    return neighbors
}

function randomWalk(grid: Cell[][], startCell: Cell, visited: Set<Cell>) {
    let currentCell = startCell
    const path = [currentCell]

    while (!visited.has(currentCell)) {
        const neighbors = getNeighbors(grid, currentCell)
        const nextCell = neighbors[randomInt(0, neighbors.length)]
        path.push(nextCell)
        currentCell = nextCell
    }

    return path
}

function eraseLoops(path: Cell[]) {
    const seen = new Set()
    const newPath: Cell[] = []

    for (let cell of path) {
        if (seen.has(cell)) {
            while (newPath[newPath.length - 1] !== cell)
                seen.delete(newPath.pop())

            continue
        }
        newPath.push(cell)
        seen.add(cell)
    }

    return newPath
}

function connectPath(path: Cell[]) {
    for (let i = 0; i < path.length - 1; i++) {
        const cell = path[i]
        const nextCell = path[i + 1]

        if (cell.x === nextCell.x) {
            if (cell.y > nextCell.y)
                cell.topWall = false
            else
                nextCell.topWall = false
        } else if (cell.y === nextCell.y) {
            if (cell.x > nextCell.x)
                cell.leftWall = false
            else
                nextCell.leftWall = false
        }
    }
}

//? x and y coord start at 0 (for the top-left most cell)
//? use Wilson's algorithm to generate the maze
//? https://en.wikipedia.org/wiki/Maze_generation_algorithm
function generateMaze(rows: number, cols: number) {
    const grid = createGrid(rows, cols)
    const visited = new Set<Cell>()

    // Choose an arbitrary starting cell
    const startCell = grid[randomInt(0, grid.length)][randomInt(0, grid[0].length)]
    visited.add(startCell)
    startCell.visited = true

    while (visited.size < rows * cols) {
        // Choose a random unvisited cell
        let unvisitedCells: Cell[] = []
        for (let row of grid) {
            for (let cell of row) {
                if (!visited.has(cell)) {
                    unvisitedCells.push(cell)
                }
            }
        }
        const randomCell = unvisitedCells[randomInt(0, unvisitedCells.length)]

        // Perform loop-erased random walk
        const path = randomWalk(grid, randomCell, visited)
        const loopErasedPath = eraseLoops(path)

        // Connect the path to the maze
        connectPath(loopErasedPath)

        // Mark the cells in the path as visited
        for (let cell of loopErasedPath) {
            visited.add(cell)
            cell.visited = true
        }
    }

    return grid
}

function blendImageData(imageData: ImageData[]) {
    const checkSameSize = imageData.every((v, i, arr) => {
        if (i == 0) return true
        return v.width == arr[i - 1].width && v.height == arr[i - 1].height
    })
    if (!checkSameSize)
        throw new Error("ImageData objects must have the same dimensions")

    let resultImageData = new ImageData(imageData[0].width, imageData[0].height)
    let resultData = resultImageData.data

    for (const overlayImageData of imageData) {
        var overlayData = overlayImageData.data
        for (var i = 0; i < overlayData.length; i += 4) {
            let baseR = resultData[i]
            let baseG = resultData[i + 1]
            let baseB = resultData[i + 2]
            let baseA = resultData[i + 3] / 255 // Normalize alpha to [0, 1]

            let overlayR = overlayData[i]
            let overlayG = overlayData[i + 1]
            let overlayB = overlayData[i + 2]
            let overlayA = overlayData[i + 3] / 255 // Normalize alpha to [0, 1]

            let outA = overlayA + baseA * (1 - overlayA)
            let outR = Math.round((overlayR * overlayA + baseR * baseA * (1 - overlayA)) / outA)
            let outG = Math.round((overlayG * overlayA + baseG * baseA * (1 - overlayA)) / outA)
            let outB = Math.round((overlayB * overlayA + baseB * baseA * (1 - overlayA)) / outA)

            resultData[i] = outR
            resultData[i + 1] = outG
            resultData[i + 2] = outB
            resultData[i + 3] = Math.round(outA * 255) // Convert alpha back to [0, 255]
        }
    }

    return resultImageData
}

export default class MazeCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("maze")
        .setDescription("Generate a Bluey-themed maze!")
        .addIntegerOption(option =>
            option.setName("width")
                .setDescription('Width of the maze (min: 20, max: 50)')
                .setRequired(true)
                .setMinValue(20)
                .setMaxValue(50)
        )
        .addIntegerOption(option =>
            option.setName("height")
                .setDescription('Height of the maze (min: 20, max: 50)')
                .setRequired(true)
                .setMinValue(20)
                .setMaxValue(50)
        )

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
        const INIT_EMBED = new EmbedBuilder()
            .setTitle("Generating Maze...")
            .setDescription("Please wait, this could take a while.")
            .setColor(0xe27a37)
            .setFooter({ text: "Bot Bilby" })

        await interaction.reply({
            embeds: [INIT_EMBED]
        })

        const MAIN_TEXTURE = await loadImage(MAIN_TEXTURE_RAW)
        const MAIN_TEXTURE_CANVAS = new Canvas(
            MAIN_TEXTURE.naturalWidth,
            MAIN_TEXTURE.naturalHeight
        )

        const MAIN_TEXTURE_CTX = MAIN_TEXTURE_CANVAS.getContext("2d")
        MAIN_TEXTURE_CTX.drawImage(MAIN_TEXTURE, 0, 0)
        const TEXTURE_INFO = {
            size: 64
        }

        const getTexture = (mapping: [number, number]) =>
            MAIN_TEXTURE_CTX.getImageData(
                mapping[0] * TEXTURE_INFO.size,
                mapping[1] * TEXTURE_INFO.size,
                TEXTURE_INFO.size,
                TEXTURE_INFO.size,
            )

        const MAZE_CONFIG = {
            width: interaction.options.getInteger("width"),
            height: interaction.options.getInteger("height")
        }

        const MAZE_BOARD = new Canvas(
            TEXTURE_INFO.size * (MAZE_CONFIG.width + 1),
            TEXTURE_INFO.size * (MAZE_CONFIG.height + 1),
        )
        const MAZE_BOARD_CTX = MAZE_BOARD.getContext("2d")
        const maze = generateMaze(MAZE_CONFIG.height, MAZE_CONFIG.width)

        for (const i of maze) {
            for (const j of i) {
                const textures: ImageData[] = []
                if (j.topWall)
                    textures.push(getTexture(TEXTURE_MAPPING[WallType.TOP_WALL_NORMAL]))

                if (j.leftWall)
                    textures.push(getTexture(TEXTURE_MAPPING[WallType.LEFT_WALL_NORMAL]))

                //? handle edge cases where if the current cell doesn't have any wall set,
                //? it would cause the bottom-right corner for the cell at (x - 1, y - 1)
                //? to be missing
                if (textures.length == 0) {
                    if (
                        j.x > 0 && j.y > 0 &&
                        maze[j.y - 1][j.x].leftWall &&
                        maze[j.y][j.x - 1].topWall
                    )
                        textures.push(getTexture(TEXTURE_MAPPING[WallType.BOTTOM_RIGHT_CORNER_NORMAL]))
                    else continue
                }

                const BLENDED_DATA = blendImageData(textures)
                MAZE_BOARD_CTX.putImageData(
                    BLENDED_DATA,
                    j.x * TEXTURE_INFO.size, j.y * TEXTURE_INFO.size,
                )
            }
        }

        //? fill in the bottom border of the maze
        for (var i = 0; i < MAZE_CONFIG.width; i++) {
            MAZE_BOARD_CTX.putImageData(
                getTexture(TEXTURE_MAPPING[WallType.TOP_WALL_NORMAL]),
                i * TEXTURE_INFO.size, MAZE_CONFIG.height * TEXTURE_INFO.size
            )
        }

        //? fill in the right border of the maze
        for (var i = 0; i < MAZE_CONFIG.height; i++) {
            MAZE_BOARD_CTX.putImageData(
                getTexture(TEXTURE_MAPPING[WallType.LEFT_WALL_NORMAL]),
                MAZE_CONFIG.width * TEXTURE_INFO.size, i * TEXTURE_INFO.size
            )
        }

        //? fill in the bottom-right corner of the maze
        MAZE_BOARD_CTX.putImageData(
            getTexture(TEXTURE_MAPPING[WallType.BOTTOM_RIGHT_CORNER_NORMAL]),
            MAZE_CONFIG.width * TEXTURE_INFO.size,
            MAZE_CONFIG.height * TEXTURE_INFO.size,
        )

        const MAZE_FILE = new AttachmentBuilder(
            MAZE_BOARD.toBuffer(), { name: "maze.png" }
        )

        const MAZE_EMBED = new EmbedBuilder()
            .setTitle("Finished!")
            .setDescription("Here is your maze. Enjoy!")
            .addFields([
                {
                    name: "Size",
                    value: `${MAZE_CONFIG.width} x ${MAZE_CONFIG.height}`,
                    inline: true
                },
                {
                    name: "Theme",
                    value: "Normal",
                    inline: true
                }
            ])
            .setColor(0x72bfed)
            .setImage("attachment://maze.png")
            .setFooter({ text: "Bot Bilby" })

        await interaction.editReply({
            embeds: [MAZE_EMBED],
            files: [MAZE_FILE]
        })
    }
}