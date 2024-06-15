import { AttachmentBuilder, CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";
import { BuiltTemplates, buildAndUploadTemplate, generateId } from "../../../../Helper/PlaceHelper";
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
            alliesUpdateMessage = "Successfully updated allies template to #" + newId + " with a " + type + " template update.\n\n" + (missing.length != 0 ? `:warning: **The following artworks are missing:** ${missing.splice(0, 20).map(missing => `\`${missing}\``).join(", ")}${missing.length > 20 ? `(...${missing.length - 20} more)` : ``}` : ``);
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