import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";

export default class PlaceArtworksPreviewSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("preview")
        .setDescription("Preview an artwork.")
        .addStringOption(option =>
            option.setName("artwork")
                .setDescription("The artwork to preview.")
                .setAutocomplete(true)
                .setRequired(true)
        )

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        await interaction.reply("not yet implemented");
    }
}