import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, SlashCommandBuilder } from "discord.js";
import { Services } from "../../Services";
import SlashCommand from "../SlashCommand";

export default class MuteMeCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("muteme")
        .setDescription("Is the Heeler House too addicting? I have the fix for you!")
        .addStringOption(option =>
            option.setName("length")
                .setDescription('Amount you want to be muted for. Type in the duration followed by the suffix "h", "m" or "s".')
                .setMinLength(2)
                .setMaxLength(16)
                .setRequired(true))

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
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
            const EMBED = new EmbedBuilder()
                .setColor(0xe27a37)
                .setTitle("Muted!")
                .setDescription(`You have been muted for ${duration}${suffix}! Thank you for using the Heeler House's detox service.`)
                .setImage("https://c.tenor.com/Y1rAFV25rVEAAAAC/tenor.gif")
                .setTimestamp()
            await interaction.reply({
                embeds: [EMBED]
            })

            await interaction.member
                .timeout(
                    muteTime,
                    "Needed some time away from the server."
                )
                .catch(async (error: any) => {
                    await interaction.followUp({
                        content: `I was unable to mute you! Are you an admin?`,
                        ephemeral: true,
                    });
                });
        }
    }
}