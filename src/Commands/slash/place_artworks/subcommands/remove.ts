import { AutocompleteInteraction, CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";
import PlaceArtwork from "../../../../Services/Database/models/placeArtwork";
import { buildAndUploadTemplate, missingArtworkText } from "../../../../Helper/PlaceHelper";

export default class PlaceArtworksRemoveSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("remove")
        .setDescription("Remove an artwork from the system.")
        .addStringOption(option =>
            option.setName("name")
                .setDescription("The name of the artwork to remove.")
                .setAutocomplete(true)
                .setRequired(true)
        )

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        let name = interaction.options.getString("name", true);

        await interaction.deferReply();

        await services.database.collections.place.artworks.deleteOne({
            name
        });

        await interaction.editReply("Successfully removed artwork, building template...");

        buildAndUploadTemplate(services, () => {}, async (type, id, missing) => {
            await interaction.editReply("Successfully removed artwork.\nTemplate built successfully, currently on iteration #" + id + "." + missingArtworkText(missing))
        }, () => {});
    }
    
    async autocomplete(interaction: AutocompleteInteraction<CacheType>, services: Services): Promise<void> {
        let artworks = await services.database.collections.place.artworks.find().toArray() as unknown as PlaceArtwork[];
        await interaction.respond(artworks.filter(artwork => artwork.name.startsWith(interaction.options.getString("name", true))).map(choice => ({ name: choice.name, value: choice.name })));
    }
}