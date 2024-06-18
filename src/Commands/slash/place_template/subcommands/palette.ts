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
        await interaction.deferReply();
        let paletteCaptureGroup = /{(.+)}/g;
        let colorCaptureGroup = /(\d{1,3}),(\d{1,3}),(\d{1,3})/g;

        let palette = paletteCaptureGroup.exec(interaction.options.getString("palette_import", true));

        if (palette == null) {
            await interaction.editReply({
                content: `The palette provided does not match palette format.`
            });
            return;
        }

        let paletteGroup = palette[1].split(/\D,\D/g);
        paletteGroup[0] = paletteGroup[0].replace("{", "");
        paletteGroup[paletteGroup.length-1] = paletteGroup[paletteGroup.length-1].replace("}", "");
        let colorPalette = [];

        for (const color of paletteGroup) {
            let colorMatch = color.match(colorCaptureGroup);

            if (colorMatch == null) {
                await interaction.editReply({
                    content: `The palette provided cannot be converted: \`${color}\` does not match palette color format.`
                });
                return;
            }

            let colorData = colorMatch[0].split(",");

            colorPalette.push([parseInt(colorData[0]), parseInt(colorData[1]), parseInt(colorData[2])]);
        }

        services.state.state.place.palette = colorPalette;
        services.state.save();

        await interaction.editReply("Successfully updated color palette.");
    }
}