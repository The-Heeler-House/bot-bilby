import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";
import PlaceArtwork from "../../../../Services/Database/models/placeArtwork";

export default class PlaceArtworksListSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("list")
        .setDescription("Lists all artworks, their location and last updated timestamp.")

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        let artworks = await services.database.collections.place.artworks.find().toArray() as unknown as PlaceArtwork[];
        if (artworks.length == 0) {
            await interaction.reply(`No artworks have been created yet.`);
            return;
        }

        let artworksString = artworks.map((artwork) => `**${artwork.name}** (${artwork.x}, ${artwork.y}) Last updated <t:${Math.floor(Date.parse(artwork.lastModified.toISOString()) / 1000)}:R>`);

        await interaction.reply(`Here's a list of our current artworks:\n\n${artworksString.join("\n")}`);
    }
}