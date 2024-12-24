import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, SlashCommandBuilder } from "discord.js";
import { Services } from "../../Services";
import SlashCommand from "../SlashCommand";

const GIFs = [
    "https://c.tenor.com/N5M7hKtNFTgAAAAC/tenor.gif",
    "https://c.tenor.com/Y1rAFV25rVEAAAAC/tenor.gif",
    "https://c.tenor.com/3L-Uw7PpIYoAAAAd/tenor.gif",
    "https://c.tenor.com/uzzXmScT7B8AAAAC/tenor.gif",
    "https://c.tenor.com/jIiAo7AJalMAAAAC/tenor.gif",
    "https://c.tenor.com/LCRhiClezakAAAAC/tenor.gif"
]

export default class MuteMeCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("muteme")
        .setDescription("Is the Heeler House too addicting? I have the fix for you!")
        .addStringOption(option =>
            option.setName("length")
                .setDescription('Amount you want to be muted for. Type in the duration followed by the suffix "h", "m" or "s".')
                .setMinLength(2)
                .setMaxLength(8)
                .setRequired(true))

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
        // https://discord.com/developers/docs/resources/auto-moderation#auto-moderation-action-object-action-metadata
        const MAX_MUTE_TIME = 2419200_000

        const INPUT = interaction.options.getString("length")
        const regexResult = /^(\d+)([hms])$/g.exec(INPUT)
        if (!regexResult) {
            await interaction.reply({
                ephemeral: true,
                content: "Invalid duration specified!"
            })
            return
        }

        const [_, duration, suffix] = regexResult

        let muteTime = 0
        switch (suffix) {
            case "h":
                muteTime = Number(duration) * 3600_000
                break
            case "m":
                muteTime = Number(duration) * 60_000
                break
            case "s":
                muteTime = Number(duration) * 1_000
                break
        }

        if (interaction.member instanceof GuildMember) {
            if (muteTime >= MAX_MUTE_TIME || muteTime <= 0) {
                await interaction.reply({
                    content: `Too much timeout! The timeout duration Discord allow must be less than ${MAX_MUTE_TIME / 1_000} seconds, or ${MAX_MUTE_TIME / 86400_000} days (which is a shame honestly).`,
                    ephemeral: true,
                })
                return
            }

            const EMBED = new EmbedBuilder()
                .setColor(0xe27a37)
                .setTitle("Muted!")
                .setDescription(`You have been muted for ${duration}${suffix}! Thank you for using the Heeler House's detox service.`)
                .setImage(GIFs[Math.floor(Math.random() * GIFs.length)])
                .setTimestamp()

            await interaction.member
                .timeout(
                    muteTime,
                    "Needed some time away from the server."
                )
                .catch(async (error: any) => {
                    await interaction.reply({
                        content: `I was unable to mute you! Are you an admin?`,
                        ephemeral: true,
                    });
                });

            await interaction.reply({
                embeds: [EMBED]
            })
        }
    }
}