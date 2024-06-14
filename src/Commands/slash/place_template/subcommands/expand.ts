import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";

export default class PlaceTemplateExpandSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("expand")
        .setDescription("Expands the canvas by a certain number of pixels (does not SET size, ADDS to size)")
        .addNumberOption(option => 
            option.setName("top")
                .setDescription("Amount of pixels added to the top of the canvas")
                .setRequired(false)
        )
        .addNumberOption(option => 
            option.setName("bottom")
                .setDescription("Amount of pixels added to the bottom of the canvas")
                .setRequired(false)
        )
        .addNumberOption(option => 
            option.setName("left")
                .setDescription("Amount of pixels added to the left of the canvas")
                .setRequired(false)
        )
        .addNumberOption(option => 
            option.setName("right")
                .setDescription("Amount of pixels added to the right of the canvas")
                .setRequired(false)
        )

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        await interaction.reply("not yet implemented");
    }
}