import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";

export default class PlaceAnalyticsPrivacySubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("privacy")
        .setDescription("Sets the privacy for your personal analytics.")
        .addBooleanOption(option =>
            option.setName("privacy")
                .setDescription("Whether to private your personal analytics or not.")
                .setRequired(true)
        )

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        await interaction.reply("not yet implemented");
    }
}