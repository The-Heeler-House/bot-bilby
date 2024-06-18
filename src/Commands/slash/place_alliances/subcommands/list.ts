import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";
import PlaceAlliance from "../../../../Services/Database/models/placeAlliance";

export default class PlaceAlliancesListSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("list")
        .setDescription("Lists all alliances and their last updated timestamp.")

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        let alliances = await services.database.collections.place.alliances.find().toArray() as unknown as PlaceAlliance[];
        if (alliances.length == 0) {
            await interaction.reply(`No alliances have been created yet.`);
            return;
        }

        let alliancesString = alliances.map((alliance) => `**${alliance.name}**`);

        interaction.reply(`Here's a list of our current alliances:\nLast updated <t:${Math.floor(Date.parse(services.state.state.place.last_template_update_timestamp) / 1000)}:R>\n\n${alliancesString.join(", ")}`);
    }
}