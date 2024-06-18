import { AutocompleteInteraction, CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";
import { getArtworkURL } from "../../../../Helper/PlaceURLHelper";
import PlaceArtwork from "../../../../Services/Database/models/placeArtwork";

export default class PlaceArtworksPreviewSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("preview")
        .setDescription("Preview an artwork.")
        .addStringOption(option =>
            option.setName("name")
                .setDescription("The artwork to preview.")
                .setAutocomplete(true)
                .setRequired(true)
        )

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        let artwork = await services.database.collections.place.artworks.findOne({ name: interaction.options.getString("artwork", true) }) as unknown as PlaceArtwork;

        if (artwork == null) {
            await interaction.reply("I couldn't find an artwork named \"" + interaction.options.getString("artwork", true) + "\". Please try again.");
            return;
        }

        console.log(artwork);

        await interaction.reply({
            embeds: [
                {
                    title: `Artwork preview - ${artwork.name}`,
                    fields: [
                        {
                            name: "X",
                            value: artwork.x.toString(),
                            inline: true
                        },
                        {
                            name: "Y",
                            value: artwork.y.toString(),
                            inline: true
                        },
                        {
                            name: "Last updated",
                            value: `<t:${Math.floor(artwork.lastModified.getTime() / 1000)}:R>`
                        }
                    ],
                    color: 2918143,
                    image: {
                        url: getArtworkURL(artwork.fileName)
                    }
                }
            ]
        });
    }
    
    async autocomplete(interaction: AutocompleteInteraction<CacheType>, services: Services): Promise<void> {
        let artworks = await services.database.collections.place.artworks.find().toArray() as unknown as PlaceArtwork[];
        await interaction.respond(artworks.filter(artwork => artwork.name.startsWith(interaction.options.getString("name", true))).map(choice => ({ name: choice.name, value: choice.name })));
    }
}