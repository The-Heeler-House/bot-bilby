import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";

export default class PlaceAnalyticsGlobalSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("global")
        .setDescription("View all global analytics.")

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        await interaction.reply("not yet implemented");
    }
}