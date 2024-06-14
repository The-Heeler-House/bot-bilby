import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";

export default class PlaceArtworksAddSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("add")
        .setDescription("Add an artwork to the system.")
        .addStringOption(option =>
            option.setName("artwork")
                .setDescription("The artwork to add.")
                .setRequired(true)
        )
        .addAttachmentOption(option =>
            option.setName("template")
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
        await interaction.reply("not yet implemented");
    }
}