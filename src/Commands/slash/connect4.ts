import {
    CacheType,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageReaction,
    SlashCommandBuilder,
    User
} from "discord.js"
import { Services } from "../../Services"
import SlashCommand from "../SlashCommand"

const TIMEOUT = 14.5 * 60_000
const width = 7, height = 6
const winning = 4
enum BoardMapping {
    EMPTY,
    PLAYER,
    OPPONENT
}

const emojiMapping = {
    [BoardMapping.EMPTY]: "⚫",
    [BoardMapping.PLAYER]: "🔵",
    [BoardMapping.OPPONENT]: "🟠"
}

const REACTIONS = [
    "🇦", "🇧", "🇨", "🇩", "🇪", "🇫", "🇬", "🇭", "🇮", "🇯", "🇰", "🇱", "🇲", "🇳", "🇴", "🇵", "🇶", "🇷", "🇸", "🇹"
]
const REACTION_MAPPING: {[x: string]: number} = {
    "🇦": 0, "🇧": 1, "🇨": 2, "🇩": 3, "🇪": 4, "🇫": 5, "🇬": 6,
    "🇭": 7, "🇮": 8, "🇯": 9, "🇰": 10, "🇱": 11, "🇲": 12, "🇳": 13,
    "🇴": 14, "🇵": 15, "🇶": 16, "🇷": 17, "🇸": 18, "🇹": 19
}

// Check for a win condition (4 in a row)
function checkWin(board: number[][], width: number, height: number, winning: number, player: number) {
    // Check rows, columns, and diagonals
    const directions = [
        [0, 1],  // Horizontal
        [1, 0],  // Vertical
        [1, 1],  // Diagonal \
        [1, -1]  // Diagonal /
    ]

    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            if (board[j][i] === player) {
                for (const [dx, dy] of directions) {
                    let count = 0
                    for (let k = 0; k < winning; k++) {
                        const x = i + k * dx
                        const y = j + k * dy
                        if (x >= 0 && x < width && y >= 0 && y < height && board[y][x] === player) {
                            count++
                        } else {
                            break
                        }
                    }
                    if (count >= winning) return true
                }
            }
        }
    }
    return false
}

// Evaluation function (heuristic)
function evaluate(board: number[][], width: number, height: number, winning: number) {
    if (checkWin(board, width, height, winning, BoardMapping.OPPONENT)) return 1000  // Bot wins
    if (checkWin(board, width, height, winning, BoardMapping.PLAYER)) return -1000 // Player wins
    return 0 // Neutral state
}

// Minimax with alpha-beta pruning
function minimax(board: number[][], width: number, height: number, winning: number, depth: number, isMaximizing: boolean, alpha: number, beta: number) {
    const score = evaluate(board, width, height, winning)
    if (score === 1000 || score === -1000 || depth === 0) return score

    if (isMaximizing) {
        let maxEval = -Infinity
        for (let i = 0; i < width; i++) {
            for (let j = height - 1; j >= 0; j--) {
                if (board[j][i] != BoardMapping.EMPTY) continue
                board[j][i] = BoardMapping.OPPONENT
                const evaluate = minimax(board, width, height, winning, depth - 1, false, alpha, beta)
                board[j][i] = BoardMapping.EMPTY
                maxEval = Math.max(maxEval, evaluate)
                alpha = Math.max(alpha, evaluate)
                break
            }
            if (beta <= alpha) break // Prune
        }
        return maxEval
    } else {
        let minEval = Infinity
        for (let i = 0; i < width; i++) {
            for (let j = height - 1; j >= 0; j--) {
                if (board[j][i] != BoardMapping.EMPTY) continue
                board[j][i] = BoardMapping.PLAYER
                const evaluate = minimax(board, width, height, winning, depth - 1, true, alpha, beta)
                board[j][i] = BoardMapping.EMPTY
                minEval = Math.min(minEval, evaluate)
                beta = Math.min(beta, evaluate)
                break
            }
            if (beta <= alpha) break // Prune
        }
        return minEval
    }
}

// Find the best move for the bot
function findBestMove(board: number[][], width: number, height: number, winning: number) {
    let bestMove = {
        x: 0,
        y: 0
    }
    let bestValue = -Infinity

    for (let i = 0; i < width; i++) {
        for (let j = height - 1; j >= 0; j--) {
            if (board[j][i] != BoardMapping.EMPTY) continue
            board[j][i] = BoardMapping.OPPONENT
            const moveValue = minimax(board, width, height, winning, 4, false, -Infinity, Infinity)
            board[j][i] = BoardMapping.EMPTY
            if (moveValue >= bestValue) {
                bestValue = moveValue
                bestMove = {x: i, y: j}
            }
            break
        }
    }

    if (!bestMove) {
        for (let i = 0; i < width; i++) {
            for (let j = height - 1; j >= 0; j--) {
                if (board[j][i] != BoardMapping.EMPTY) continue
                bestMove = {x: i, y: j}
                break
            }
        }
    }

    return bestMove
}

export default class Connect4Command extends SlashCommand {
    public data = (new SlashCommandBuilder()
        .setName("connect4")
        .setDescription("Play a game of Connect 4 with me or with other people!")
        .addUserOption(option =>
            option.setName("opponent")
                .setDescription("Opponent (if no one is selected, I will be your opponent)")
                .setRequired(false)
        )
    ) as SlashCommandBuilder

    async execute(
        interaction: ChatInputCommandInteraction<CacheType>,
        services: Services): Promise<void>
    {
        let board = Array.from(
            {length: height},
            () => Array.from(
                {length: width},
                () => BoardMapping.EMPTY
            )
        )
        const startedAt = Date.now()

        let opponent = interaction.options.getUser("opponent")
        let users = {
            [BoardMapping.PLAYER]: interaction.user.id,
            [BoardMapping.OPPONENT]: opponent ? opponent.id : interaction.client.user.id
        }

        if (users[BoardMapping.PLAYER] == users[BoardMapping.OPPONENT]) {
            await interaction.reply({
                content: "You cannot set the opponent as yourself!",
                ephemeral: true
            })
            return
        }

        let currentTurn = BoardMapping.PLAYER
        let winner: string | null = null
        enum GameState {
            INIT,
            RUNNING,
            WIN,
            TIE
        }
        let gameState = GameState.INIT

        let moveCount = 0
        const maxMoveCount = width * height

        const gameEmbed = () => {
            let boardText = []
            if (gameState != GameState.INIT) {
                boardText.push("## " + REACTIONS.slice(0, width).join(" "))
                for (let i = 0; i < height; i++) {
                    let row = "## "
                    for (let j = 0; j < width; j++) {
                        row += emojiMapping[board[i][j]] + " "
                    }
                    boardText.push(row)
                }
            }

            let status = {
                [GameState.INIT]: "Initializing, please wait...",
                [GameState.RUNNING]: `Use one of the buttons below to select\nthe columns you want to drop the token.\nThis game sessions will end automatically\nat <t:${Math.floor((startedAt + TIMEOUT) / 1000)}>\n`,
                [GameState.TIE]: "Game Over! No one wins!",
                [GameState.WIN]: `Game Over! <@${winner}> win!`
            }

            let currentTurnText = {
                [GameState.INIT]: "",
                [GameState.RUNNING]: `**Current Turn: ${emojiMapping[currentTurn]} <@${users[currentTurn]}>**`,
                [GameState.TIE]: "",
                [GameState.WIN]: ""
            }

            boardText.push(
                "** **",
                status[gameState],
                currentTurnText[gameState]
            )
            return new EmbedBuilder()
                .setColor(0x0000FF)
                .setTitle("Connect 4!")
                .setDescription(boardText.join("\n"))
                .addFields(
                    {name: `Player ${emojiMapping[BoardMapping.PLAYER]}`, value: `<@${users[BoardMapping.PLAYER]}>`, inline: true},
                    {name: `Opponent ${emojiMapping[BoardMapping.OPPONENT]}`, value: `<@${users[BoardMapping.OPPONENT]}>`, inline: true},
                )
                .setTimestamp()
        }

        const gameMessage = await interaction.reply({
            embeds: [gameEmbed()]
        })

        const checkWin = (lastX: number, lastY: number) => {
            const directions = [
                [0, 1],
                [1, 0],
                [1, 1],
                [1, -1]
            ]

            const countInDirection = (dr: number, dc: number) => {
                let count = 0
                let r = lastY + dr
                let c = lastX + dc

                while (r >= 0 && r < height && c >= 0 && c < width && board[r][c] === currentTurn) {
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
                if (totalCount >= winning) {
                    return true
                }
            }
            return false
        }

        //? init
        const buttonMessage = await interaction.channel.send(`<@${users[BoardMapping.PLAYER]}> <@${users[BoardMapping.OPPONENT]}>`)
        for (let i = 0; i < width; i++) {
            await buttonMessage.react(REACTIONS[i])
        }
        gameState = GameState.RUNNING
        await gameMessage.edit({embeds: [gameEmbed()]})

        const collector = buttonMessage.createReactionCollector({
            time: TIMEOUT,
            filter: (reaction: MessageReaction, user: User) =>
                REACTIONS.includes(reaction.emoji.name) &&
                (
                    user.id == users[BoardMapping.OPPONENT] ||
                    user.id == users[BoardMapping.PLAYER]
                )
        })

        collector.on("collect", async (reaction, user) => {
            const EMOJI = reaction.emoji.name
            const column = REACTION_MAPPING[EMOJI]
            try {
                await buttonMessage.reactions.resolve(EMOJI).users.remove(user.id)
            } catch (e) {
                await interaction.followUp({
                    content: `Something has gone wrong while trying to remove your reaction!\n${e}`,
                    ephemeral: true
                })
            }

            if (user.id != users[currentTurn]) return

            let placed = false
            let selected = {
                x: column,
                y: 0
            }

            for (let i = height - 1; i >= 0; i--) {
                if (board[i][column] != BoardMapping.EMPTY) continue
                placed = true
                selected.y = i
                break
            }

            if (!placed) {
                await interaction.followUp({
                    content: "Please select a different column!",
                    ephemeral: true
                })
                return
            }

            const checker = async (x: number, y: number) => {
                moveCount++
                board[y][x] = currentTurn

                if (checkWin(x, y)) {
                    winner = users[currentTurn]
                    gameState = GameState.WIN
                    collector.stop()
                    await buttonMessage.delete()
                    return
                }

                currentTurn = (currentTurn == BoardMapping.OPPONENT) ? BoardMapping.PLAYER : BoardMapping.OPPONENT

                if (moveCount >= maxMoveCount) {
                    gameState = GameState.TIE
                    collector.stop()
                    await buttonMessage.delete()
                    return
                }
            }

            await checker(selected.x, selected.y)

            if (users[currentTurn] == interaction.client.user.id && gameState != GameState.WIN) {
                const nextMove = findBestMove(board, width, height, winning)
                if (nextMove)
                    await checker(nextMove.x, nextMove.y)
            }

            await gameMessage.edit({embeds: [gameEmbed()]})
        })

        collector.on("end", async e => {
            if (gameState == GameState.RUNNING) {
                gameState = GameState.TIE
                await buttonMessage.delete()
                await gameMessage.edit({embeds: [gameEmbed()]})
            }
        })
    }
}