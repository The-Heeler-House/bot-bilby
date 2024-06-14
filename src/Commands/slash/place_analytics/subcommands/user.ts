import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";

export default class PlaceAnalyticsUserSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("user")
        .setDescription("View the analytics of yourself, or another user.")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("The user to view the analytics of.")
                .setRequired(false)
        )

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        await interaction.reply("not yet implemented");
    }
}