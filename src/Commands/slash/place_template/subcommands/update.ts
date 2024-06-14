import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";

export default class PlaceTemplateUpdateSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("update")
        .setDescription("Triggers a template update without updating artwork (useful when an alliance template is changed)")

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        await interaction.reply("not yet implemented");
    }
}