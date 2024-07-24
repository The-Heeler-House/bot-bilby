import { AutocompleteInteraction, ChatInputCommandInteraction, Client, SlashCommandBuilder } from "discord.js";
import { Services } from "../../../Services";
import SlashCommand from "../../SlashCommand";
import * as logger from "../../../logger";
import { readdir } from "fs/promises";
import SlashSubCommand from "../../SlashSubCommand";

export default class MuterouletteCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("muteroulette")
        .setDescription("Try your luck at the muteroulette!")

    private subcommands = new Map<string, SlashSubCommand>();

    preregister(client: Client<boolean>, services: Services): Promise<void> {
        return new Promise((result, reject) => {
            readdir(`${__dirname}/subcommands`)
                .then(files => files.filter(file => file.endsWith(".js")))
                .then(async commandsDir => {
                    for (const commandFile of commandsDir) {
                        const command: SlashSubCommand = new (await import(`${__dirname}/subcommands/${commandFile}`)).default();
                        if ("data" in command && "execute" in command) {
                            this.subcommands.set(command.data.name, command);
                            this.data.addSubcommand(command.data);
                        } else {
                            logger.warning("Attempted to add slash subcommand", commandFile, "to command", this.data.name, "but it is missing either the data property or the execute function. Skipping subcommand...");
                        }
                    }
                    result();
                })
                .catch(async error => {
                    logger.error("Encountered an error when trying to get slash subcommands directory for command ", this.data.name, ". Ignoring command. See error below.\n", error, "\n", error.stack);
                    reject();
                });
        });
    }

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
        const command = this.subcommands.get(interaction.options.getSubcommand(true))

        try {
            if (!command) throw new ReferenceError(`Slash subcommand ${interaction.options.getSubcommand(true)} does not exist on command ${interaction.commandName}.`);

            await command.execute(interaction, services);
        } catch (error) {
            logger.error("Encountered an error while trying to execute the", interaction.options.getSubcommand(true), "slash subcommand on command", interaction.commandName, ".\n", error.stack);
            await services.pager.sendError(error, "Trying to execute the " + interaction.options.getSubcommand(true) + " slash subcommand on command " + interaction.commandName + ".", services.state.state.pagedUsers);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "Whoops! Seems like something went wrong while processing your request. Please try again.", ephemeral: true });
            } else {
                await interaction.reply({ content: "Whoops! Seems like something went wrong while processing your request. Please try again.", ephemeral: true });
            }
        }
    }

    async autocomplete(interaction: AutocompleteInteraction, services: Services) {
        const command = this.subcommands.get(interaction.options.getSubcommand(true))

        try {
            if (!command) throw new ReferenceError(`Slash subcommand ${interaction.options.getSubcommand(true)} on command ${interaction.commandName} does not exist.`);

            await command.autocomplete(interaction, services);
        } catch (error) {
            logger.error("Encountered an error while trying to autocomplete the", interaction.options.getSubcommand(true), "slash subcommand on", interaction.commandName, ".\n", error, "\n", error.stack);
            // FIXME: Due to spamming concerns, we don't page errors here. Potential solution is to generate a hash based on the error's message and stack trace, as well as "whileDoing" in order to get a unique id for an error so we don't repeat ourselves.
            await interaction.respond([].map(choice => ({ name: choice, value: choice })));
        }
    }
}