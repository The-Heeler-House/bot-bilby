import { AutocompleteInteraction, CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";
import PlaceAlliance from "../../../../Services/Database/models/placeAlliance";
import { buildAndUploadTemplate, missingArtworkText } from "../../../../Helper/PlaceHelper";

export default class PlaceAlliancesRemoveSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("remove")
        .setDescription("Remove an alliance from the system.")
        .addStringOption(option =>
            option.setName("ally")
                .setDescription("The ally to remove.")
                .setAutocomplete(true)
                .setRequired(true)
        )

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        let name = interaction.options.getString("ally", true);

        await interaction.deferReply();

        await services.database.collections.place.alliances.deleteOne({
            name
        });

        await interaction.editReply("Successfully removed alliance, building template...");

        buildAndUploadTemplate(services, () => {}, async (type, id, missing) => {
            await interaction.editReply("Successfully removed alliance.\nTemplate built successfully, currently on iteration #" + id + "." + missingArtworkText(missing))
        }, () => {});
    }
    
    async autocomplete(interaction: AutocompleteInteraction<CacheType>, services: Services): Promise<void> {
        let alliances = await services.database.collections.place.alliances.find().toArray() as unknown as PlaceAlliance[];
        await interaction.respond(alliances.filter(alliance => alliance.name.startsWith(interaction.options.getString("ally", true))).map(choice => ({ name: choice.name, value: choice.name })));
    }
}