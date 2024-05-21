import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { Services } from "../Services";

export default class SlashCommand {
    public data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;

    constructor() {}

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
        await interaction.reply({ content: ":white_check_mark:" });
    }

    async autocomplete(interaction: AutocompleteInteraction, services: Services) {
        await interaction.respond([].map(choice => ({ name: choice, value: choice })));
    }
}