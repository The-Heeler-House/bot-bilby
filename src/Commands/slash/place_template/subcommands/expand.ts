import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";
import { resizeAndUpdateTemplate } from "../../../../Helper/PlaceHelper";

export default class PlaceTemplateResizeSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("resize")
        .setDescription("Changes the canvas size by a certain number of pixels (does not SET size, ADDS to size)")
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
        let top = interaction.options.getNumber("top", false) ?? 0;
        let bottom = interaction.options.getNumber("bottom", false) ?? 0;
        let left = interaction.options.getNumber("left", false) ?? 0;
        let right = interaction.options.getNumber("right", false) ?? 0;
        
        let msg = await interaction.deferReply();

        let standloneUpdateMessage = "";
        let alliesUpdateMessage = "";

        resizeAndUpdateTemplate(top, left, bottom, right, services, async (newId) => {
            standloneUpdateMessage = "Successfully resized standalone template with iteration #" + newId + ".\n";
            await interaction.editReply({
                content: standloneUpdateMessage
            });
        }, async (newId, missing) => {
            alliesUpdateMessage = "Successfully resized allies template with iteeration #" + newId + ".\n\n" + (missing.length != 0 ? `:warning: **The following artworks are missing:** ${missing.splice(0, 20).map(missing => `\`${missing}\``).join(", ")}${missing.length > 20 ? `(...${missing.length - 20} more)` : ``}` : ``);
            await interaction.editReply({
                content: standloneUpdateMessage + alliesUpdateMessage
            });
        }, async () => {
            if (standloneUpdateMessage == "" && alliesUpdateMessage == "") {
                await interaction.editReply({
                    content: "Resized template successfully.\nNo artwork-related template changes occured."
                });
            }
        });
    }
}