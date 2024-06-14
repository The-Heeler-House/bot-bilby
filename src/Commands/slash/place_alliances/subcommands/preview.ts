import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";

export default class PlaceAlliancesPreviewSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("preview")
        .setDescription("Preview a factions template.")
        .addStringOption(option =>
            option.setName("faction")
                .setDescription("The faction to preview.")
                .setAutocomplete(true)
                .setRequired(true)
        )

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        await interaction.reply("not yet implemented");
    }
}