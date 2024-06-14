import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";

export default class PlaceAnalyticsLeaderboardSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("leaderboard")
        .setDescription("Lists the top 10 placers within the Bluey faction.")

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        await interaction.reply("not yet implemented");
    }
}