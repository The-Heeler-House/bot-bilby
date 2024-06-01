import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
} from "discord.js";
import { Services } from "../../Services";
import SlashCommand from "../SlashCommand";
import {
    createAlliance,
    editAlliance,
    deleteAlliance,
    infoAlliance,
    listAlliances,
    addCustomTemplate,
    deleteCustomTemplate,
    editCustomTemplate,
} from "../../Commands/rplace/alliances";

export default class rPlaceCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("rplace")
        .setDescription("Our r/Place command.")
        .addSubcommandGroup((group) =>
            group
                .setName("alliances")
                .setDescription("Alliance commands.")
                .addSubcommand((command) =>
                    command
                        .setName("create")
                        .setDescription("Create an r/Place alliance.")
                        .addStringOption((option) =>
                            option
                                .setName("faction")
                                .setDescription("The name of the faction.")
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName("invite")
                                .setDescription(
                                    "The invite link of the faction."
                                )
                                .setRequired(true)
                        )
                        .addUserOption((option) =>
                            option
                                .setName("theirdiplo")
                                .setDescription(
                                    "The main diplomat from their faction."
                                )
                                .setRequired(true)
                        )
                        .addUserOption((option) =>
                            option
                                .setName("ourdiplo")
                                .setDescription(
                                    "The main diplomat from our faction."
                                )
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName("template")
                                .setDescription(
                                    "The Endu/Osu template link of the faction."
                                )
                                .setRequired(false)
                        )
                )
                .addSubcommand((command) =>
                    command
                        .setName("edit")
                        .setDescription("Edit an r/Place alliance.")
                        .addStringOption((option) =>
                            option
                                .setName("faction")
                                .setDescription("The name of the faction.")
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName("invite")
                                .setDescription(
                                    "The invite link of the faction."
                                )
                                .setRequired(false)
                        )
                        .addUserOption((option) =>
                            option
                                .setName("theirdiplo")
                                .setDescription(
                                    "The main diplomat from their faction."
                                )
                                .setRequired(false)
                        )
                        .addUserOption((option) =>
                            option
                                .setName("ourdiplo")
                                .setDescription(
                                    "The main diplomat from our faction."
                                )
                                .setRequired(false)
                        )
                        .addStringOption((option) =>
                            option
                                .setName("template")
                                .setDescription(
                                    "The Endu/Osu template link of the faction."
                                )
                                .setRequired(false)
                        )
                )
                .addSubcommand((command) =>
                    command
                        .setName("delete")
                        .setDescription("Delete an r/Place alliance.")
                        .addStringOption((option) =>
                            option
                                .setName("faction")
                                .setDescription("The name of the faction.")
                                .setRequired(true)
                        )
                )
                .addSubcommand((command) =>
                    command
                        .setName("info")
                        .setDescription(
                            "Get information on an r/Place alliance."
                        )
                        .addStringOption((option) =>
                            option
                                .setName("faction")
                                .setDescription("The name of the faction.")
                                .setRequired(true)
                        )
                )
                .addSubcommand((command) =>
                    command
                        .setName("list")
                        .setDescription("List all alliances.")
                )
                .addSubcommand((command) =>
                    command
                        .setName("customadd")
                        .setDescription("Add a custom r/Place template.")
                        .addStringOption((option) =>
                            option
                                .setName("faction")
                                .setDescription("The name of the faction.")
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName("name")
                                .setDescription("The name of the template.")
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName("source")
                                .setDescription(
                                    "The image link of the template."
                                )
                                .setRequired(true)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName("x")
                                .setDescription(
                                    "The X coordinate of the template."
                                )
                                .setRequired(true)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName("y")
                                .setDescription(
                                    "The Y coordinate of the template."
                                )
                                .setRequired(true)
                        )
                )
                .addSubcommand((command) =>
                    command
                        .setName("customdelete")
                        .setDescription("Delete a custom r/Place template.")
                        .addStringOption((option) =>
                            option
                                .setName("faction")
                                .setDescription("The name of the faction.")
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName("name")
                                .setDescription("The name of the template.")
                                .setRequired(true)
                        )
                )
                .addSubcommand((command) =>
                    command
                        .setName("customedit")
                        .setDescription("Edit a custom r/Place template.")
                        .addStringOption((option) =>
                            option
                                .setName("faction")
                                .setDescription("The name of the faction.")
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName("name")
                                .setDescription("The name of the template.")
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName("source")
                                .setDescription(
                                    "The image link of the template."
                                )
                                .setRequired(false)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName("x")
                                .setDescription(
                                    "The X coordinate of the template."
                                )
                                .setRequired(false)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName("y")
                                .setDescription(
                                    "The Y coordinate of the template."
                                )
                                .setRequired(false)
                        )
                )
        ) as SlashCommandBuilder;

    async execute(
        interaction: ChatInputCommandInteraction,
        services: Services
    ) {
        if (interaction.options.getSubcommandGroup() === "alliances") {
            if (interaction.options.getSubcommand() === "create") {
                createAlliance(interaction, services);
            } else if (interaction.options.getSubcommand() === "edit") {
                editAlliance(interaction, services);
            } else if (interaction.options.getSubcommand() === "delete") {
                deleteAlliance(interaction, services);
            } else if (interaction.options.getSubcommand() === "info") {
                infoAlliance(interaction, services);
            } else if (interaction.options.getSubcommand() === "list") {
                listAlliances(interaction, services);
            } else if (interaction.options.getSubcommand() === "customadd") {
                addCustomTemplate(interaction, services);
            } else if (interaction.options.getSubcommand() === "customdelete") {
                deleteCustomTemplate(interaction, services);
            } else if (interaction.options.getSubcommand() === "customedit") {
                editCustomTemplate(interaction, services);
            } else {
                await interaction.reply({
                    content: "Invalid subcommand.",
                    ephemeral: true,
                });
            }
        }
    }
}
