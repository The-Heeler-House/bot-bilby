import { ContextMenuCommandBuilder, ContextMenuCommandInteraction } from "discord.js";
import { Services } from "../Services";

export default class ContextCommand {
    public data: ContextMenuCommandBuilder;

    constructor() {}
    
    async execute(interaction: ContextMenuCommandInteraction, services: Services) {
        await interaction.reply({ content: ":white_check_mark:" });
    }
}