import { AttachmentBuilder, CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";
import { BuiltTemplates, buildAndUploadTemplate, generateId, missingArtworkText } from "../../../../Helper/PlaceHelper";
import PlaceArtwork from "../../../../Services/Database/models/placeArtwork";
import PlaceAlliance from "../../../../Services/Database/models/placeAlliance";

export default class PlaceTemplateUpdateSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("update")
        .setDescription("Triggers a template update without updating artwork (useful when an alliance template is changed)")

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        let msg = await interaction.deferReply();

        let standloneUpdateMessage = "";
        let alliesUpdateMessage = "";

        buildAndUploadTemplate(services, async (type, newId) => {
            standloneUpdateMessage = "Successfully updated standalone template to #" + newId + " with a " + type + " template update.\n";
            await interaction.editReply({
                content: standloneUpdateMessage
            });
        }, async (type, newId, missing) => {
            alliesUpdateMessage = "Successfully updated allies template to #" + newId + " with a " + type + " template update." + missingArtworkText(missing)
            await interaction.editReply({
                content: standloneUpdateMessage + alliesUpdateMessage
            });
        }, async () => {
            if (standloneUpdateMessage == "" && alliesUpdateMessage == "") {
                await interaction.editReply({
                    content: "No changes occured."
                });
            }
        });
    }
}