import { ChatInputCommandInteraction, Message, SlashCommandBuilder } from "discord.js";
import { Services } from "../../Services";
import SlashCommand from "../SlashCommand";

export default class ExampleCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("example")
        .setDescription("An example command showing off the command handling system.")

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
        await interaction.reply({
            content: `Hello! This is the example slash command. Everything is working well. ${services.example.message}`,
            ephemeral: true
        });
    }
}