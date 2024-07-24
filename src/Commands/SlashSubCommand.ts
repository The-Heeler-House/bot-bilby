import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import { Services } from "../Services";

export default class SlashSubCommand {
    public data: SlashCommandSubcommandBuilder;

    constructor() {}

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
        await interaction.reply({ content: ":white_check_mark:" });
    }

    async autocomplete(interaction: AutocompleteInteraction, services: Services) {
        await interaction.respond([].map(choice => ({ name: choice, value: choice })));
    }
}