import { AutocompleteInteraction, CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";
import PlaceArtwork from "../../../../Services/Database/models/placeArtwork";
import { urlToImageBuffer } from "../../../../Helper/PlaceCanvasHelper";
import { buildAndUploadTemplate, missingArtworkText } from "../../../../Helper/PlaceHelper";

export default class PlaceArtworksEditSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("edit")
        .setDescription("Edit the template (and/or location) of an artwork.")
        .addStringOption(option =>
            option.setName("name")
                .setDescription("The artwork to update.")
                .setAutocomplete(true)
                .setRequired(true)
        )
        .addAttachmentOption(option =>
            option.setName("artwork")
                .setDescription("The updated template to set this artwork to.")
                .setRequired(false)
        )
        .addNumberOption(option => 
            option.setName("x")
                .setDescription("X position of top left pixel. This will ")
                .setRequired(false)
        )
        .addNumberOption(option => 
            option.setName("y")
                .setDescription("Y position of top left pixel.")
                .setRequired(false)
        )

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        let name = interaction.options.getString("name", true);

        await interaction.deferReply();

        let dbEntry = await services.database.collections.place.artworks.findOne({ name }) as unknown as PlaceArtwork;

        if (dbEntry == null) {
            await interaction.editReply(`Couldn't find an artwork named \`${name}\`. Please try again.`);
            return;
        }
        
        let changes: any = {};

        let artwork = interaction.options.getAttachment("artwork");
        let x = interaction.options.getNumber("x");
        let y = interaction.options.getNumber("y");

        if (x) {
            let x_offset = x + services.state.state.place.x_offset;

            if (0 > x_offset || x_offset >= services.state.state.place.width
            ) {
                await interaction.reply("The x coordinate provided is outside of the canvas. Please try again.");
                return;
            }

            changes.x = x;
        }

        if (y) {
            let y_offset = y + services.state.state.place.y_offset;

            if (0 > y_offset || y_offset >= services.state.state.place.height
            ) {
                await interaction.reply("The y coordinate provided is outside of the canvas. Please try again.");
                return;
            }

            changes.y = y;
        }

        if (artwork) {
            if (artwork.contentType != "image/png") {
                await interaction.reply("The artwork provided is not a PNG image. Please try again.");
                return;
            }

            let buffer = await urlToImageBuffer(artwork.url, artwork.width, artwork.height);
            
            await services.placeCDN.putObject("artworks", `${dbEntry.fileName}.png`, buffer, buffer.byteLength);
            changes.lastModified = new Date();
        }

        if (x || y || artwork) { 
            await services.database.collections.place.artworks.updateOne({ name }, {
                $set: changes
            });

            await interaction.editReply("Successfully updated artwork. Updating template...");

            buildAndUploadTemplate(services, () => {}, async (type, id, missing) => {
                await interaction.editReply("Successfully created artwork.\nTemplate built successfully, currently on iteration #" + id + "." + missingArtworkText(missing))
            }, () => {});
        } else {
            await interaction.editReply("You gave no changes to the artwork. Please try again.");
        }
    }
    
    async autocomplete(interaction: AutocompleteInteraction<CacheType>, services: Services): Promise<void> {
        let artworks = await services.database.collections.place.artworks.find().toArray() as unknown as PlaceArtwork[];
        await interaction.respond(artworks.filter(artwork => artwork.name.startsWith(interaction.options.getString("name", true))).map(choice => ({ name: choice.name, value: choice.name })));
    }
}