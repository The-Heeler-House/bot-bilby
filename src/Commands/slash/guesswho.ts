import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ChatInputCommandInteraction,
    ComponentType,
    EmbedBuilder,
    SlashCommandBuilder,
    ThreadAutoArchiveDuration
} from "discord.js";
import SlashCommand from "../SlashCommand";
import { Services } from "../../Services";
import path from "path";
import { readdirSync, readFileSync, statSync } from "fs";
import { readFile } from "fs/promises";
import { createHash, randomBytes, randomInt } from "crypto";
import sharp from "sharp";

const guessWhoData = path.join(__dirname, "../../Assets/guesswho-data")
const mappingData: { [file: string]: string[] } = JSON.parse(readFileSync(`${guessWhoData}/mapping.json`, { encoding: "utf-8" }))
const fileList = Object.keys(mappingData)
const bgList = readdirSync(`${guessWhoData}/bg`)
    .map(v => `${guessWhoData}/bg/${v}`)
    .filter(v => !statSync(v).isDirectory())

const randomHex = (length: number) => randomBytes(length).toString('hex')

let sessionInProgress = new Set<string>()

const playSubcommand = async (interaction: ChatInputCommandInteraction, services: Services) => {
    if (interaction.channel?.type != ChannelType.GuildText) {
        await interaction.reply({
            content: `Game cannot be play outside of a Guild text channel!`,
            ephemeral: true
        })
        return
    }

    if (sessionInProgress.has(interaction.user.id)) {
        await interaction.reply({
            content: `You already have a game session in progress! Check in the private threads to see your active game session.`,
            ephemeral: true
        })
        return
    }

    let score = 0
    let player = interaction.user.id
    let sessionId = `guesswho-${interaction.user.username}-${randomHex(3)}`
    const thread = await interaction.channel.threads.create({
        name: sessionId,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
        type: ChannelType.PublicThread
    })
    const leaderboard = services.database.collections.guessWho

    const main = async () => {
        let gameContinue = false
        const characterImg = fileList[Math.floor(Math.random() * fileList.length)]

        const timeBegin = performance.now()

        const charPath = `${guessWhoData}/${characterImg}.png`
        const bgPath = bgList[Math.floor(Math.random() * bgList.length)]

        const outImgSize = { w: 1000, h: 1000 }
        const charImgSize = { w: 800, h: 800 }

        let outImg = sharp(bgPath)
        const bgMetadata = await outImg.metadata()
        outImg = outImg.extract({
            left: randomInt(bgMetadata.width - outImgSize.w),
            top: randomInt(bgMetadata.height - outImgSize.h),
            width: outImgSize.w,
            height: outImgSize.h
        })

        let charImg = await sharp(charPath)
            .resize({ fit: "contain", width: charImgSize.w, height: charImgSize.h })
            .toBuffer({ resolveWithObject: false })

        outImg = outImg.composite([{
            input: charImg,
            gravity: "south"
        }])

        const timeEnd = performance.now()
        const charAttachment = new AttachmentBuilder(await outImg.toBuffer(), { name: "character.png" })

        const embed = new EmbedBuilder()
            .setTitle("Guess who is this?!")
            .setFields([
                {
                    name: "Player",
                    value: `<@${player}>`,
                    inline: true
                },
                {
                    name: "Guessed Characters",
                    value: `${score}`,
                    inline: true
                }
            ])
            .setImage("attachment://character.png")
            .setFooter({ text: `Time: ${(timeEnd - timeBegin) / 1000}s` })
            .setColor("Yellow")

        await thread.send({
            embeds: [embed],
            files: [charAttachment]
        })

        const collected = await thread.awaitMessages({
            filter: (message) => message.author.id == interaction.user.id,
            time: 10000,
            max: 1
        })

        const message = collected.first()
        if (!message) {
            await thread.send(":hourglass: Times up!")
            return gameContinue
        }

        const out = message.content
            .trim()
            .toLowerCase()
            .normalize()
            .replace(/[^a-zA-Z0-9 ]/g, '')
        const hashedAnswer = createHash("sha256").update(out).digest("hex")
        const correctAnswer = mappingData[characterImg]

        const correct = correctAnswer.includes(hashedAnswer)
        await thread.send(correct ? ":white_check_mark: Correct!" : ":x: Incorrect!")
        await message.delete()
        if (correct) {
            score++
            gameContinue = true
        }

        return gameContinue
    }

    //? -- game start

    await thread.members.add(interaction.user.id)
    sessionInProgress.add(interaction.user.id)

    const initMsg = await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setTitle("Guess Who?!")
                .setDescription(`Game session \`${sessionId}\` created! There should be a thread waiting for you with the session ID in the title.`)
                .setColor("Green")
        ],
        files: []
    })

    let row = new ActionRowBuilder<ButtonBuilder>()
    row = row.addComponents(
        new ButtonBuilder()
            .setCustomId("yes")
            .setLabel("YES!")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId("no")
            .setLabel("no")
            .setStyle(ButtonStyle.Danger),
    )

    const confirmMsg = await thread.send({
        content: "The rules of the game are simple: You will be given 10 seconds for each questions, and you will have to guess the characters from their silhouette.\n> **Important Note:** The name of the character should be type correctly, so for instance: `chilli's mum` is correct, but `chillis mum` isn't.\nWould you like to start the game? (will be defaulting to no in 30 seconds)",
        components: [row]
    })

    const start = async () => {
        let gameRun = true
        while (gameRun) {
            gameRun = await main()
        }
        await end()
    }

    const end = async () => {
        const prevScore = await leaderboard.findOne({ user: interaction.user.id })
        if (!prevScore || prevScore["score"] < score) {
            await leaderboard.updateOne(
                { user: interaction.user.id },
                { $set: { score } },
                { upsert: true }
            )
        }

        await initMsg.edit({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`Guess Who?! (session \`${sessionId})\``)
                    .setDescription(`Game Over! Your final score is: **${score}**`)
                    .setColor("Red")
            ],
            files: []
        })
        sessionInProgress.delete(interaction.user.id)
        await thread.setLocked()
        await thread.setArchived()
    }

    const resultConfirm = await confirmMsg.awaitMessageComponent({ filter: i => i.user.id == interaction.user.id, componentType: ComponentType.Button, time: 30_000 })
        .catch(async () => await end())

    if (!resultConfirm) return
    switch (resultConfirm.customId) {
        case "yes":
            await resultConfirm.reply("Okay! Let's start!")
            await start()
            break
        case "no":
            await resultConfirm.reply("aww man...")
            await end()
            break
    }
}

const leaderboardSubcommand = async (interaction: ChatInputCommandInteraction, services: Services) => {
    const leaderboard = services.database.collections.guessWho
    const entryGenerator = leaderboard.find().sort({ score: -1 })
    // get only the first 10 people, for some reason
    const MAX_ENTRY = 10

    const leaderboardEmbed = new EmbedBuilder()
        .setColor(0x72bfed)
        .setTitle("Guesswho Leaderboard!")
        .setTimestamp()
    var desc = "", cnt = 1
    while (cnt <= MAX_ENTRY) {
        const playerEntry = await entryGenerator.tryNext()
        if (playerEntry == null) break
        const id = playerEntry["user"]
        try {
            const user = await interaction.guild.members.fetch(id)
            desc += `${cnt}. \`${user.displayName}\`: **${playerEntry.score} Character(s)**\n`
            cnt++
        } catch (err) {}
    }

    const thisUserScore = await leaderboard
        .findOne({ user: interaction.user.id }, { sort: {score: -1} })

    if (thisUserScore) {
        desc += `\nYour highscore: **${thisUserScore.score} Character(s)**`
    } else {
        desc += `\nYour highscore: **none yet**`
    }
    leaderboardEmbed.setDescription(desc)
    await interaction.reply({ embeds: [leaderboardEmbed] })
}

export default class GuessWhoCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("guesswho")
        .setDescription("Can you guess the character from their silhouette?")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("play")
                .setDescription(
                    "Can you guess the character from their silhouette?"
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("leaderboard")
                .setDescription(
                    "View the leaderboard for the game!"
                )
        ) as SlashCommandBuilder

    async execute(interaction: ChatInputCommandInteraction, services: Services): Promise<void> {
        switch (interaction.options.getSubcommand()) {
            case "play":
                await playSubcommand(interaction, services)
                break
            case "leaderboard":
                await leaderboardSubcommand(interaction, services)
                break
        }
    }
}