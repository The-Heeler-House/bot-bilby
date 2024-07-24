import { AutocompleteInteraction, ChatInputCommandInteraction, Client, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { Services } from "../Services";

export default class SlashCommand {
    public data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;

    constructor() {}
    
    /**
    * Code that is executed before the Command Preprocessor registers this as a slash command.
    * Mainly used for creation of subcommand command groups.
    * @param client The bot client
    * @param services The services
    * @returns If the preregister code executed successfully
    * @throws If the preregister code failed to execute properly
    */
    async preregister(client: Client, services: Services) {
        return;
    }

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
        await interaction.reply({ content: ":white_check_mark:" });
    }

    async autocomplete(interaction: AutocompleteInteraction, services: Services) {
        await interaction.respond([].map(choice => ({ name: choice, value: choice })));
    }
}