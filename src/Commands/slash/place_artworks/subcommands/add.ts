import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";
import PlaceArtwork from "../../../../Services/Database/models/placeArtwork";
import { loadImage } from "canvas";
import { urlToImageBuffer } from "../../../../Helper/PlaceCanvasHelper";
import { buildAndUploadTemplate, missingArtworkText } from "../../../../Helper/PlaceHelper";

export default class PlaceArtworksAddSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("add")
        .setDescription("Add an artwork to the system.")
        .addStringOption(option =>
            option.setName("name")
                .setDescription("The name of the artwork to add.")
                .setRequired(true)
        )
        .addAttachmentOption(option =>
            option.setName("artwork")
                .setDescription("The updated template to set this artwork to.")
                .setRequired(true)
        )
        .addNumberOption(option => 
            option.setName("x")
                .setDescription("X position of top left pixel.")
                .setRequired(true)
        )
        .addNumberOption(option => 
            option.setName("y")
                .setDescription("Y position of top left pixel.")
                .setRequired(true)
        )

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        let name = interaction.options.getString("name", true);
        let artwork = interaction.options.getAttachment("artwork", true);
        let x = interaction.options.getNumber("x", true);
        let y = interaction.options.getNumber("y", true);

        let x_offset = x + services.state.state.place.x_offset;
        let y_offset = y + services.state.state.place.y_offset;

        if (0 > x_offset || x_offset >= services.state.state.place.width ||
            0 > y_offset || y_offset >= services.state.state.place.height
        ) {
            await interaction.reply("The coordinates provided are outside of the canvas. Please try again.");
            return;
        }

        if (artwork.contentType != "image/png") {
            await interaction.reply("The artwork provided is not a PNG image. Please try again.");
            return;
        }

        await interaction.deferReply();

        let fileName = name.toLowerCase().split(/[ :/]/g).join("_");

        let artworkEntry: PlaceArtwork = {
            name,
            fileName,
            lastModified: new Date(),
            x,
            y
        }

        await services.database.collections.place.artworks.insertOne(artworkEntry);

        console.log(artwork);

        let buffer = await urlToImageBuffer(artwork.url, artwork.width, artwork.height);
        await services.placeCDN.putObject("artworks", `${fileName}.png`, buffer, buffer.byteLength);

        await interaction.editReply("Successfully created artwork. Updating template...");

        buildAndUploadTemplate(services, () => {}, async (type, id, missing) => {
            await interaction.editReply("Successfully created artwork.\nTemplate built successfully, currently on iteration #" + id + "." + missingArtworkText(missing))
        }, () => {});
    }
}