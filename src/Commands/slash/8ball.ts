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
import { randomInt } from "crypto"
import { readdir } from "fs/promises"


export default class EightBallCommand extends SlashCommand {
    public data = (new SlashCommandBuilder()
        .setName("8ball")
        .setDescription("Shake the magic 8-ball!")
        .addStringOption(option =>
            option.setName("question")
                .setDescription("The question you want to ask the magic 8-ball.")
                .setRequired(true)
        )) as SlashCommandBuilder;

    async execute(
        interaction: ChatInputCommandInteraction<CacheType>,
        services: Services): Promise<void>
    {
        const EIGHT_BALL_IMAGE_DIR = path.join(__dirname, "../../Assets/8ball-data")
        const FILE_LIST = await readdir(EIGHT_BALL_IMAGE_DIR)
        const SELECTED_FILENAME = FILE_LIST[randomInt(0, FILE_LIST.length)]
        const FILE = new AttachmentBuilder(
            path.join(EIGHT_BALL_IMAGE_DIR, SELECTED_FILENAME))

        const EIGHT_BALL_EMBED = new EmbedBuilder()
            .setColor(0x72bfed)
            .setTitle("Magic 8-Ball!")
            .setDescription(`<@${interaction.user.id}>'s question: ${interaction.options.getString("question")}`)
            .setImage(`attachment://${SELECTED_FILENAME}`)
            .setTimestamp()
            .setFooter({
                text: "Bot Bilby"
            })
        await interaction.reply({
            embeds: [EIGHT_BALL_EMBED],
            files: [FILE],
        })
    }
}