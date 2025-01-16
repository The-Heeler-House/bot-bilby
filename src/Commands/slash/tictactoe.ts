import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    CacheType,
    ChatInputCommandInteraction,
    ComponentType,
    SlashCommandBuilder
} from "discord.js"
import { Services } from "../../Services"
import SlashCommand from "../SlashCommand"

const TIMEOUT = 14.5 * 60_000
const boardMapping = {
    EMPTY: 0,
    PLAYER: 1,
    OPPONENT: 2
}

const emojiMapping = {
    [boardMapping.EMPTY]: "🟦",
    [boardMapping.PLAYER]: "❎",
    [boardMapping.OPPONENT]: "🅾"
}

const buttonColorMapping = {
    [boardMapping.EMPTY]: ButtonStyle.Primary,
    [boardMapping.PLAYER]: ButtonStyle.Success,
    [boardMapping.OPPONENT]: ButtonStyle.Danger
}

// Check for a win condition (5 in a row)
function checkWin(board: number[][], boardSize: number, player: number) {
    const n = boardSize

    // Check rows, columns, and diagonals
    const directions = [
        [0, 1],  // Horizontal
        [1, 0],  // Vertical
        [1, 1],  // Diagonal \
        [1, -1]  // Diagonal /
    ]

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (board[i][j] === player) {
                for (const [dx, dy] of directions) {
                    let count = 0
                    for (let k = 0; k < boardSize; k++) {
                        const x = i + k * dx
                        const y = j + k * dy
                        if (x >= 0 && x < n && y >= 0 && y < n && board[x][y] === player) {
                            count++
                        } else {
                            break
                        }
                    }
                    if (count === boardSize) return true
                }
            }
        }
    }
    return false
}

// Evaluation function (heuristic)
function evaluate(board: number[][], boardSize: number) {
    if (checkWin(board, boardSize, boardMapping.OPPONENT)) return 1000  // Bot wins
    if (checkWin(board, boardSize, boardMapping.PLAYER)) return -1000 // Player wins
    return 0 // Neutral state
}

// Minimax with alpha-beta pruning
function minimax(board: number[][], boardSize: number, depth: number, isMaximizing: boolean, alpha: number, beta: number) {
    const score = evaluate(board, boardSize)
    if (score === 1000 || score === -1000 || depth === 0) return score

    const n = boardSize

    if (isMaximizing) {
        let maxEval = -Infinity
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (board[i][j] === boardMapping.EMPTY) {
                    board[i][j] = boardMapping.OPPONENT
                    const evaluate = minimax(board, boardSize, depth - 1, false, alpha, beta)
                    board[i][j] = boardMapping.EMPTY
                    maxEval = Math.max(maxEval, evaluate)
                    alpha = Math.max(alpha, evaluate)
                    if (beta <= alpha) break // Prune
                }
            }
        }
        return maxEval
    } else {
        let minEval = Infinity
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (board[i][j] === boardMapping.EMPTY) {
                    board[i][j] = boardMapping.PLAYER
                    const evaluate = minimax(board, boardSize, depth - 1, true, alpha, beta)
                    board[i][j] = boardMapping.EMPTY
                    minEval = Math.min(minEval, evaluate)
                    beta = Math.min(beta, evaluate)
                    if (beta <= alpha) break // Prune
                }
            }
        }
        return minEval
    }
}

// Find the best move for the bot
function findBestMove(board: number[][], boardSize: number) {
    let bestMove = null
    let bestValue = -Infinity

    const n = boardSize

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (board[i][j] === boardMapping.EMPTY) {
                board[i][j] = boardMapping.OPPONENT
                const moveValue = minimax(board, boardSize, 4, false, -Infinity, Infinity)
                board[i][j] = boardMapping.EMPTY
                if (moveValue >= bestValue) {
                    bestValue = moveValue
                    bestMove = { x: i, y: j }
                }
            }
        }
    }
    if (bestMove == null) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (board[i][j] === boardMapping.EMPTY) {
                    bestMove = { x: i, y: j }
                }
            }
        }
    }

    return bestMove
}

export default class TicTacToeCommand extends SlashCommand {
    public data = (new SlashCommandBuilder()
        .setName("tictactoe")
        .setDescription("Play a game of Tic-Tac-Toe with me or with other people!")
        .addUserOption(option =>
            option.setName("opponent")
                .setDescription("Opponent (if no one is selected, I will be your opponent)")
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName("size")
                .setDescription("The size of the board (between 3 and 5) (default is 5)")
                .setRequired(false)
                .setMinValue(3)
                .setMaxValue(5)
        )
    ) as SlashCommandBuilder

    async execute(
        interaction: ChatInputCommandInteraction<CacheType>,
        services: Services): Promise<void>
    {
        let board = []
        let boardSize = 0
        const startedAt = Date.now()

        boardSize = interaction.options.getInteger("size") ?? 5
        let opponent = interaction.options.getUser("opponent")
        let users = {
            [boardMapping.PLAYER]: interaction.user.id,
            [boardMapping.OPPONENT]: opponent ? opponent.id : interaction.client.user.id
        }

        if (users[boardMapping.PLAYER] == users[boardMapping.OPPONENT]) {
            await interaction.reply({
                content: "You cannot set the opponent as yourself!",
                ephemeral: true
            })
            return
        }

        let currentTurn = 1
        let winner: string | null = null
        /**
         * `0`: not game over
         * `1`: tie game
         * `2`: someone has win
         */
        let gameOver = 0
        let moveCount = 0

        board = Array.from(
            {length: boardSize},
            () => Array.from(
                {length: boardSize},
                () => boardMapping.EMPTY
            )
        )

        const maxMoveCount = boardSize * boardSize

        let boardButtons = () => {
            let components: ActionRowBuilder<ButtonBuilder>[] = []
            for (let i = 0; i < boardSize; i++) {
                let builder = new ActionRowBuilder<ButtonBuilder>()
                for (let j = 0; j < boardSize; j++) {
                    builder.addComponents(
                        new ButtonBuilder()
                            .setEmoji(emojiMapping[board[i][j]])
                            .setCustomId(`${i}:${j}`)
                            .setStyle(buttonColorMapping[board[i][j]])
                            .setDisabled(gameOver != 0)
                    )
                }
                components.push(builder)
            }
            return components
        }

        let message = () => {
            let output = ""
            switch (gameOver) {
                case 0:
                    output = `Tic-Tac-Toe! First to get **${boardSize}** X or O in a row is the winner!\n❎ is <@${users[1]}>, 🅾 is <@${users[2]}>. Current turn is <@${users[currentTurn]}>.\nThis game sessions will end automatically at <t:${Math.floor((startedAt + TIMEOUT) / 1000)}>`
                    break
                case 1:
                    output = `Tic-Tac-Toe! Game Over, no one wins!`
                    break
                case 2:
                    output = `Tic-Tac-Toe! Game Over, <@${winner}> wins!`
                    break
            }
            return output
        }

        let checkWin = (lastX: number, lastY: number) => {
            const directions = [
                [0, 1],
                [1, 0],
                [1, 1],
                [1, -1]
            ]

            const countInDirection = (dr: number, dc: number) => {
                let count = 0
                let r = lastX + dr
                let c = lastY + dc

                while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === currentTurn) {
                    count++
                    r += dr
                    c += dc
                }

                return count
            }

            for (let [dr, dc] of directions) {
                const posCount = countInDirection(dr, dc)
                const negCount = countInDirection(-dr, -dc)
                const totalCount = 1 + posCount + negCount
                if (totalCount >= boardSize) {
                    return true
                }
            }
            return false
        }

        //? -- CODE START HERE -------------------------------------------------

        const reply = await interaction.reply({
            content: message(),
            components: boardButtons()
        })

        const BUTTON_COLLECTOR = reply.createMessageComponentCollector(
            {
                componentType: ComponentType.Button,
                time: TIMEOUT
            }
        )

        BUTTON_COLLECTOR.on("collect", async e => {
            if (e.user.id != users[currentTurn]) {
                await e.reply({
                    content: "Not your turn!",
                    ephemeral: true
                })
                return
            }

            const locationData = e.customId.split(":")
            const sCell = {
                x: Number(locationData[0]),
                y: Number(locationData[1]),
            }

            if (board[sCell.x][sCell.y] != boardMapping.EMPTY) {
                await e.reply({
                    content: "Please select a different cell!",
                    ephemeral: true
                })
                return
            }

            const checker = (x: number, y: number) => {
                moveCount++
                board[x][y] = currentTurn

                if (checkWin(x, y)) {
                    winner = users[currentTurn]
                    gameOver = 2
                    BUTTON_COLLECTOR.stop()
                    return
                }

                currentTurn ^= 3 //? switches between 1 and 2 (it's XOR math, don't ask)

                if (moveCount >= maxMoveCount) {
                    gameOver = 1
                    BUTTON_COLLECTOR.stop()
                }
            }

            checker(sCell.x, sCell.y)

            if (users[currentTurn] == interaction.client.user.id && gameOver != 2) {
                const nextMove = findBestMove(board, boardSize)
                if (nextMove)
                    checker(nextMove.x, nextMove.y)
            }

            await e.update({})
            await interaction.editReply({
                content: message(),
                components: boardButtons()
            })
        })

        BUTTON_COLLECTOR.on("end", async e => {
            if (gameOver == 0) {
                gameOver = 1
                await interaction.editReply({
                    content: message(),
                    components: boardButtons()
                })
            }
        })
    }
}