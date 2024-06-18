import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";
import { buildAndUploadTemplate, missingArtworkText } from "../../../../Helper/PlaceHelper";

export default class PlaceAlliancesAddSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("add")
        .setDescription("Add an alliance to the system.")
        .addStringOption(option =>
            option.setName("ally")
                .setDescription("The name of the ally to add.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("import_url")
                .setDescription("The URL used to import this ally into the template. Must be an templateManager import JSON link.")
                .setRequired(true)
        )

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        let name = interaction.options.getString("ally", true);
        let url = interaction.options.getString("import_url", true);

        let urlCheckRegex = /https?:\/\/(.)+/g;

        if (!urlCheckRegex.test(url)) {
            await interaction.reply("The import_url provided isn't a URL. Please try again.");
            return;
        }

        await interaction.deferReply();

        let request = await fetch(url);
        let templateData = await request.json();

        if (templateData.templates == undefined) {
            await interaction.editReply("The import_url provided doesn't resolve to a templateManager JSON. Please try again.");
            return;
        }

        await services.database.collections.place.alliances.insertOne({
            name,
            url
        });

        await interaction.editReply("Successfully added alliance, building template...");

        buildAndUploadTemplate(services, () => {}, async (type, id, missing) => {
            await interaction.editReply("Successfully added alliance.\nTemplate built successfully, currently on iteration #" + id + "." + missingArtworkText(missing))
        }, () => {});
    }
}