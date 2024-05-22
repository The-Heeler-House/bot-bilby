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
                .setRequired(false))

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
        // TODO: maybe add a check for permission to see if the bot have perm to mute?

        const TIME = interaction.options.getInteger("length") ?? 1
        if (interaction.member instanceof GuildMember) {
            interaction.member.timeout(
                TIME * 3_600_000,
                "Needed some time away from the server."
            ) //? 1 hour in miliseconds
            const EMBED = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle("Muted!")
                .setDescription(`You have been muted for ${TIME} hour(s)! Thank you for using the Heeler House's detox service.`)
                .setImage("https://c.tenor.com/Y1rAFV25rVEAAAAC/tenor.gif")
                .setTimestamp()
                .setFooter({ text: "Bot Billy" })
            await interaction.reply({
                embeds: [EMBED]
            })
        }
    }
}