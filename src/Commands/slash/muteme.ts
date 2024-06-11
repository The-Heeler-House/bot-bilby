import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, SlashCommandBuilder } from "discord.js";
import { Services } from "../../Services";
import SlashCommand from "../SlashCommand";

export default class MuteMeCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("muteme")
        .setDescription("Is the Heeler House too addicting? I have the fix for you!")
        .addIntegerOption(option =>
            option.setName("length")
                .setDescription('Length in hours that you desire to be muted for. Default is 1 hour.')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(730))

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
        const TIME = interaction.options.getInteger("length") ?? 1
        const hour = TIME === 1 ? "hour" : "hours"
        if (interaction.member instanceof GuildMember) {
            const EMBED = new EmbedBuilder()
                .setColor(0xe27a37)
                .setTitle("Muted!")
                .setDescription(`You have been muted for ${TIME} ${hour}! Thank you for using the Heeler House's detox service.`)
                .setImage("https://c.tenor.com/Y1rAFV25rVEAAAAC/tenor.gif")
                .setTimestamp()
            await interaction.reply({
                embeds: [EMBED]
            })

            await interaction.member
                .timeout(
                    TIME * 3_600_000,
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