import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";

export default class PlaceAlliancesEditSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("edit")
        .setDescription("Edit an alliance's import URL.")
        .addStringOption(option =>
            option.setName("faction")
                .setDescription("The faction to modify.")
                .setAutocomplete(true)
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("import_url")
                .setDescription("The URL used to import this faction into the template. Must be a templateManager import JSON link.")
                .setRequired(true)
        )

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        await interaction.reply("not yet implemented");
    }
}