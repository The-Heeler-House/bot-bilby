import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";

export default class PlaceAlliancesRemoveSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("remove")
        .setDescription("Remove an alliance from the system.")
        .addStringOption(option =>
            option.setName("faction")
                .setDescription("The faction to remove.")
                .setAutocomplete(true)
                .setRequired(true)
        )

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        await interaction.reply("not yet implemented");
    }
}