import { AutocompleteInteraction, CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";
import PlaceAlliance from "../../../../Services/Database/models/placeAlliance";
import { buildAndUploadTemplate, missingArtworkText } from "../../../../Helper/PlaceHelper";

export default class PlaceAlliancesEditSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("edit")
        .setDescription("Edit an alliance's import URL.")
        .addStringOption(option =>
            option.setName("ally")
                .setDescription("The ally to modify.")
                .setAutocomplete(true)
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("import_url")
                .setDescription("The URL used to import this ally into the template. Must be a templateManager import JSON link.")
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

        await services.database.collections.place.alliances.updateOne({ name }, {
            $set: { 
                url
            }
        });

        await interaction.editReply("Successfully updated alliance, building template...");

        buildAndUploadTemplate(services, () => {}, async (type, id, missing) => {
            await interaction.editReply("Successfully updated alliance.\nTemplate built successfully, currently on iteration #" + id + "." + missingArtworkText(missing))
        }, () => {});
    }
    
    async autocomplete(interaction: AutocompleteInteraction<CacheType>, services: Services): Promise<void> {
        let alliances = await services.database.collections.place.alliances.find().toArray() as unknown as PlaceAlliance[];
        await interaction.respond(alliances.filter(alliance => alliance.name.startsWith(interaction.options.getString("ally", true))).map(choice => ({ name: choice.name, value: choice.name })));
    }
}