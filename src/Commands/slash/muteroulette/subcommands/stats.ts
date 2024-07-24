import { CacheType, ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";

export default class MuterouletteStatsSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("stats")
        .setDescription("View your (or another user's) muteroulette stats!")
        .addUserOption(option => option
            .setName("user")
            .setDescription("The user who's stats you wanna check.")
            .setRequired(false))

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        const users = services.database.collections.muteroulette;

        var specifiedUser =
            (interaction.inCachedGuild() && interaction.options.getUser("user")) ||
            interaction.user;
        const user = await users.findOne({ user: specifiedUser.id });

        if (user == null) {
            await interaction.reply({
                content: specifiedUser == interaction.user ? "You have not played muteroulette yet!" : "The specified user has not played muterolette yet!",
                ephemeral: true,
            });
            return;
        }
        const numMutesTotal = user.numMutesTotal;
        const numAllTotal = user.numAllTotal;
        const numStreak = user.numStreak;
        const numMaxStreak = user.numMaxStreak;
        const powerUps = user.powerUps;
        const mutePercentage = user.mutePercentage;

        const embed = new EmbedBuilder()
            .setTitle(`Muteroulette Stats!`)
            .setDescription(
                `<@${specifiedUser.id}>\nTotal Mutes: **${numMutesTotal}**\nTotal Rolls: **${numAllTotal}**\nCurrent Streak: **${numStreak}**\nMax Streak: **${numMaxStreak}**\nMute Percentage: **${mutePercentage}%**`
            )
            .addFields({
                name: "Powerups",
                value: powerUps.join("\n") || "None",
            })
            .setColor(0x72bfed)
            .setTimestamp()

        await interaction.reply({ embeds: [embed] });
    }
}