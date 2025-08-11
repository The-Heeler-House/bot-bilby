import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    EmbedBuilder,
    Interaction,
    Message,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js"
import { Services } from "../../Services"
import SlashCommand from "../SlashCommand"
import * as fs from "fs"
import * as path from "path"
import { Collection } from "mongodb"
import GuessLeaderboard from "../../Services/Database/models/guess"

const text = fs.readFileSync(
    path.join("src/Assets/guess-data/episodeDesc.txt"),
    "utf-8"
)

type Episode = {
    season: string
    episode: string
    name: string
    description: string
}

/**
 * Wrapper class for access a 2D Int32Array while storing internally as a 1D array
 */
class Int32Array2D {
    width: number
    height: number
    data: Int32Array
    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.data = new Int32Array(width * height); // defaults to 0
    }

    #_getIndex(x: number, y: number) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            throw new RangeError(`Coordinates out of bounds: (${x}, ${y})`);
        }
        return y * this.width + x;
    }

    get(x: number, y: number) {
        return this.data[this.#_getIndex(x, y)];
    }

    set(x: number, y: number, value: number) {
        this.data[this.#_getIndex(x, y)] = value | 0; // force to 32-bit int
    }
}

/**
 * function to calculate the Damerau–Levenshtein distance between two string
 * @param a first string
 * @param b second string
 * @returns the "edit length" of string (addition, deletion, substitutions, and transposition)
 */
function DL_distance(a: string, b: string) {
    const alphabet = new Set(a + b)
    let da = {}
    for (let i of alphabet) da[i] = 1

    let d = new Int32Array2D(a.length + 2, b.length + 2)
    let maxdist = a.length + b.length
    d.set(0, 0, maxdist)
    for (let i = 1; i <= a.length + 1; i++) {
        d.set(i, 0, maxdist)
        d.set(i, 1, i - 1)
    }
    for (let j = 1; j <= b.length + 1; j++) {
        d.set(0, j, maxdist)
        d.set(1, j, j - 1)
    }

    for (let i = 2; i <= a.length + 1; i++) {
        let db = 1;
        for (let j = 2; j <= b.length + 1; j++) {
            let k = da[b[j - 2]]
            let l = db
            let cost = 0

            if (a[i - 2] == b[j - 2]) {
                cost = 0
                db = j
            } else {
                cost = 1
            }

            d.set(i, j, Math.min(
                d.get(i - 1, j - 1) + cost,
                d.get(i    , j - 1) + 1,
                d.get(i - 1, j    ) + 1,
                d.get(k - 1, l - 1) + ((i - 1) - (k - 1) - 1) + cost + ((j - 1) - (l - 1) - 1)
            ))
        }
        da[a[i - 2]] = i
    }
    return d.get(a.length + 1, b.length + 1)
}


// function to save a score to the leaderboard
async function saveScore(leaderboard: Collection<GuessLeaderboard>, user: string, score: number) {
    const existingScore = await leaderboard.findOne({ user })
    if (!existingScore || score > existingScore.score) {
        await leaderboard.updateOne(
            { user },
            { $set: { score } },
            { upsert: true }
        )
    }
}

async function generateLeaderboard(leaderboard: Collection<GuessLeaderboard>, interaction: ChatInputCommandInteraction) {
    const entryGenerator = leaderboard.find().sort({ score: -1 })
    const MAX_ENTRY = 10

    const leaderboardEmbed = new EmbedBuilder()
        .setColor(0x72bfed)
        .setTitle("Guesser Leaderboard!")
        .setTimestamp()
    var desc = "", cnt = 1
    while (cnt <= MAX_ENTRY) {
        const playerEntry = await entryGenerator.tryNext()
        if (playerEntry == null) break
        const id = playerEntry.user
        try {
            const user = await interaction.guild.members.fetch(id)
            desc += `${cnt}. \`${user.displayName}\`: **${playerEntry.score} points**\n`
            cnt++
        } catch (err) {}
    }

    const thisUserScore = await leaderboard
        .findOne({ user: interaction.user.id }, { sort: {score: -1} })

    if (thisUserScore) {
        desc += `\nYour highscore: **${thisUserScore.score} points**`
    } else {
        desc += `\nYour highscore: *no data found*`
    }
    leaderboardEmbed.setDescription(desc)
    return leaderboardEmbed
}

// shuffle function
function shuffle(array: Episode[]) {
    let currentIndex = array.length,
        randomIndex: number

    // While there remain elements to shuffle.
    while (currentIndex != 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex)
        currentIndex--

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex],
            array[currentIndex],
        ]
    }
}

const wait = (ms: number) => new Promise((res, _) => setTimeout(res, ms))

//! Singleplayer mode ----------------------------------------------------------
async function singleplayer(interaction: ChatInputCommandInteraction, episodes: Episode[], leaderboard: Collection<GuessLeaderboard>) {
    await interaction.reply(
        "> Welcome to Guess The Episode, the game!\n" +
        "> I will give you an episode description, and you reply with the episode title.\n" +
        "> You have three lives, how much episodes can you name?"
    )

    let selectedEp: Episode
    let episodeCnt = 0
    let timeLeft = 12_500
    let userScore = 0
    let hasAnsweredIncorrect = false
    let hasUsedHint = false
    let lifeCnt = 3

    gameLoop: while (true) {
        if (lifeCnt <= 0) {
            break gameLoop
        }

        selectedEp = episodes.pop()
        episodeCnt++

        await interaction.channel.send(
            `> :question: **Question ${episodeCnt}**: ${selectedEp.description}`
        )

        answerLoop: while (true) {
            try {
                const userAnswers = await interaction.channel.awaitMessages({
                    filter: message =>
                        message.author.id == interaction.user.id &&
                        message.channel.id == interaction.channel.id,
                    max: 1,
                    time: timeLeft,
                    errors: ["time"]
                })

                const input = userAnswers.first().content.toLowerCase()
                const answer = selectedEp.name.toLowerCase()

                if (hasAnsweredIncorrect && !hasUsedHint) {
                    switch (input) {
                        case "h":
                            await interaction.channel.send(
                                `<:BlueyThinkHard:1172021947580821554> **Hint**: Season ${selectedEp.season}, Episode ${selectedEp.episode}`
                            )
                            hasUsedHint = true
                            continue answerLoop
                        case "e":
                            break gameLoop
                    }
                }

                // if the user's answer matches the episode name, increment the score
                const str_diff = DL_distance(input, answer)
                if (str_diff <= 1) {
                    userScore += hasAnsweredIncorrect ? 0.5 : 1
                    await interaction.channel.send([
                        "<:Yes:1090051438828326912>",
                        str_diff == 0 ? "**Correct!**" : `**Accepted** (answer was __${answer}__)`,
                        `${hasAnsweredIncorrect ? (hasUsedHint ? "(With Hint)" : "(Second Guess)") : ""}`,
                        `(+${hasAnsweredIncorrect ? 0.5 : 1} point, now ${userScore} points)`
                    ].join(" "))
                    timeLeft -= 100

                    // ask the next question after a short delay to avoid flooding the channel
                    await wait(500)
                    hasAnsweredIncorrect = false
                    hasUsedHint = false
                    continue gameLoop
                } else {
                    if (hasAnsweredIncorrect) {
                        lifeCnt--
                        await interaction.channel.send(
                            `<:No:1090051727732002907> **Incorrect!** The correct answer is "${selectedEp.name}". You have ${lifeCnt} lives remaining.`
                        )
                        hasAnsweredIncorrect = false
                        hasUsedHint = false
                        continue gameLoop
                    } else {
                        await interaction.channel.send(
                            "<:No:1090051727732002907> **Incorrect!** Would you like to ask for a hint or exit the game? (h/e). Otherwise, guess again below!"
                        )
                        hasAnsweredIncorrect = true
                        continue answerLoop
                    }
                }
            } catch (e) {
                lifeCnt--
                await interaction.channel.send(
                    `:hourglass: **Time's up!** The correct answer is ${selectedEp.name}. You have ${lifeCnt} lives remaining.`
                )
                hasAnsweredIncorrect = false
                hasUsedHint = false
                continue gameLoop
            }
        }
    }

    await interaction.channel.send(
        `:alarm_clock: **Game over!** You managed to score ${userScore} points!`
    )
    await saveScore(leaderboard, interaction.user.id, userScore)
    await interaction.channel.send({ embeds: [await generateLeaderboard(leaderboard, interaction)] })
}

//! Multiplayer mode -----------------------------------------------------------
async function multiplayer(interaction: ChatInputCommandInteraction, episodes: Episode[]) {
    const initActionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("join")
                .setLabel("Join Game")
                .setDisabled(false)
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId("leave")
                .setLabel("Leave Game")
                .setDisabled(false)
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId("start")
                .setLabel("Begin!")
                .setDisabled(false)
                .setStyle(ButtonStyle.Primary)
        )

    var players = {
        [interaction.user.id]: {
            score: 0,
            isHost: true
        }
    }

    const initMessageText = () =>
        "> Welcome to Guess The Episode, the multiplayer version!\n" +
        "> I will give you an episode description, and each of you will have 10 seconds to answers a total of 30 questions.\n" +
        "> Be the first to answer and beat your friends!\n" +
        `> **Players:** ${Object.keys(players).map(u => `<@${u}>${players[u].isHost ? " (Host)" : ""}`).join(", ")}`

    const initMessage = await interaction.reply({
        content: initMessageText(),
        components: [initActionRow]
    })

    const initCollector = initMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 10 * 60 * 1000
    })

    initCollector.on("collect", async (i) => {
        switch (i.customId) {
            case "join":
                if (Object.keys(players).includes(i.user.id)) {
                    await i.reply({
                        content: `:exclamation: You have already joined the game!`,
                        flags: [ MessageFlags.Ephemeral ]
                    })
                    break
                }

                players[i.user.id] = {
                    isHost: false,
                    score: 0
                }
                await i.update({
                    content: initMessageText(),
                    components: [initActionRow]
                })
                break
            case "leave":
                if (!Object.keys(players).includes(i.user.id)) {
                    await i.reply({
                        content: `:x: You have not joined the game!`,
                        flags: [ MessageFlags.Ephemeral ]
                    })
                    break
                }

                if (players[i.user.id].isHost) {
                    await i.reply({
                        content: `:x: The host cannot leave the game!`,
                        flags: [ MessageFlags.Ephemeral ]
                    })
                    break
                }

                delete players[i.user.id]
                await i.update({
                    content: initMessageText(),
                    components: [initActionRow]
                })
                break
            case "start":
                if (!players[i.user.id].isHost) {
                    await i.reply({
                        content: `:exclamation: Only the host can start the game!`,
                        flags: [ MessageFlags.Ephemeral ]
                    })
                    break
                }

                initActionRow.components.forEach(b => b.setDisabled(true))
                await i.update({
                    content: initMessageText(),
                    components: [initActionRow]
                })
                await multiplayerLogic()
                break
        }
    })

    initCollector.on("end", async (_) => {
        initActionRow.components.forEach(b => b.setDisabled(true))
        await interaction.editReply({
            content: initMessageText(),
            components: [initActionRow]
        })
    })

    const multiplayerLogic = async () => {
        let selectedEp: Episode
        let episodeCnt = 0
        let timeLeft = 10_000
        const episodeMaxCnt = 30

        gameLoop: while (true) {
            if (episodeCnt >= episodeMaxCnt) break gameLoop

            selectedEp = episodes.pop()
            episodeCnt++

            await interaction.channel.send(
                `> :question: **Question ${episodeCnt} / ${episodeMaxCnt}**: ${selectedEp.description}`
            )

            try {
                const userAnswers = await interaction.channel.awaitMessages({
                    filter: message =>
                        Object.keys(players).includes(message.author.id) &&
                        message.channel.id == interaction.channel.id,
                    max: 1,
                    time: timeLeft,
                    errors: ["time"]
                })

                const userAnswerData = userAnswers.first()
                const input = userAnswerData.content.toLowerCase()
                const answer = selectedEp.name.toLowerCase()

                // if the user's answer matches the episode name, increment the score
                const str_diff = DL_distance(input, answer)
                if (str_diff <= 1) {
                    await interaction.channel.send([
                        "<:Yes:1090051438828326912>",
                        str_diff == 0 ? "**Correct!**" : `**Accepted** (answer was __${answer}__)`,
                        `<@${userAnswerData.author.id}> receives 1 point!`
                    ].join(" "))

                    players[userAnswerData.author.id].score++

                    // ask the next question after a short delay to avoid flooding the channel
                    await wait(500)
                    continue gameLoop
                } else if (input == "endgame" && players[userAnswerData.author.id].isHost) break gameLoop
            } catch (e) {
                await interaction.channel.send(
                    `:hourglass: **Time's up!** The correct answer is ${selectedEp.name}. No one gains a point!`
                )
                continue gameLoop
            }
        }

        const playerIds = Object.keys(players)
        playerIds.sort((a, b) => players[b].score - players[a].score)

        await interaction.channel.send(
            `:alarm_clock: **Game over!** The winner is: <@${playerIds[0]}>!`
        )

        const leaderboardEmbed = new EmbedBuilder()
            .setColor(0x72bfed)
            .setTitle("Multiplayer Guesser Results!")
            .setTimestamp()

        var desc = ""
        for (let i = 0; i < playerIds.length; i++) {
            desc += `${i + 1}. <@${playerIds[i]}>: ${players[playerIds[i]].score} Episodes\n`
        }
        leaderboardEmbed.setDescription(desc)

        await interaction.channel.send({
            embeds: [leaderboardEmbed],
        })
    }
}

export default class GuessCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("guess")
        .setDescription(
            "Can you guess the Bluey episode title just from its description?"
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("play")
                .setDescription(
                    "Can you guess the Bluey episode title just from its description?"
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("multiplayer")
                .setDescription(
                    "Play a live multiplayer guessing game with your friends!"
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("leaders")
                .setDescription(
                    "View the top scorers for the Bluey episode guessing game!"
                )
        ) as SlashCommandBuilder

    async execute(
        interaction: ChatInputCommandInteraction,
        services: Services
    ) {
        const leaderboard = services.database.collections.guess

        // define a regular expression to match each episode
        const regex = /^s(\d+) \| e(\d+) \| (.+) \| (.+)$/gm

        // create an array to store the episode information
        const episodes: Episode[] = []

        let match: RegExpExecArray
        while ((match = regex.exec(text)) !== null) {
            const season = match[1]
            const episode = match[2]
            const name = match[3]
            const description = match[4].trim()
            episodes.push({ season, episode, name, description })
        }
        shuffle(episodes)

        switch (interaction.options.getSubcommand()) {
            case "leaders":
                await interaction.reply({ embeds: [await generateLeaderboard(leaderboard, interaction)] })
                break
            case "multiplayer":
                await multiplayer(interaction, episodes)
                break
            case "play":
                await singleplayer(interaction, episodes, leaderboard)
                break
        }
    }
}
