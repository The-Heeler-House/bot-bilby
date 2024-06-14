import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";

export default class PlaceArtworksEditSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("edit")
        .setDescription("Edit the template (and/or location) of an artwork.")
        .addStringOption(option =>
            option.setName("artwork")
                .setDescription("The artwork to update.")
                .setAutocomplete(true)
                .setRequired(true)
        )
        .addAttachmentOption(option =>
            option.setName("template")
                .setDescription("The updated template to set this artwork to.")
                .setRequired(false)
        )
        .addNumberOption(option => 
            option.setName("x")
                .setDescription("X position of top left pixel.")
                .setRequired(false)
        )
        .addNumberOption(option => 
            option.setName("y")
                .setDescription("Y position of top left pixel.")
                .setRequired(false)
        )

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        await interaction.reply("not yet implemented");
    }
}