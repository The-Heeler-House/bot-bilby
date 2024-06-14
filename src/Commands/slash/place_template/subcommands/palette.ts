import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";

export default class PlaceTemplatePaletteSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("palette")
        .setDescription("Sets the palette for pixel correction.")
        .addStringOption(option =>
            option.setName("palette_import")
                .setDescription("Imported palette string.")
                .setRequired(true)
        )

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        await interaction.reply("not yet implemented");
    }
}