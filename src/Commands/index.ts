import SlashCommand from "./SlashCommand";
import TextCommand from "./TextCommand";
import { BaseInteraction, ChannelType, Client, Message, REST, Routes } from "discord.js";
import { readdir } from "fs/promises";
import * as logger from "../logger";
import { Services } from "../Services";
import { isTHHorDevServer } from "../Helper/EventsHelper";
import { canExecuteCommand } from "../Helper/PermissionHelper";

/**
 * The Command Preprocessor is in charge of registering commands and executing them if they meet the right conditions.
 */
export default class CommandPreprocessor {
    public slashCommands = new Map<string, SlashCommand>()
    public textCommands = new Map<string, TextCommand>();

    constructor() {}

    /**
     * Fetches the slash commands from their respective folder.
     */
    getSlashCommands(services: Services): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            readdir(`${__dirname}/slash`)
                .then(files => files.filter(file => file.endsWith(".js")))
                .then(async commandsDir => {
                    for (const commandFile of commandsDir) {
                        const command: SlashCommand = new (await import(`${__dirname}/slash/${commandFile}`)).default();
                        if ("data" in command && "execute" in command) {
                            this.slashCommands.set(command.data.name, command);
                        } else {
                            logger.warning("Attempted to add slash command", command, "but it is missing either the data property or the execute function. Skipping command...");
                        }
                    }
                    resolve();
                })
                .catch(async error => {
                    logger.error("Encountered an error when trying to get slash commands directory. See error below.\n", error, "\n", error.stack);
                    await services.pager.sendCrash(error, "Get slash commands", services.state.state.pagedUsers);
                    process.exit(1);
                });
        });
    }

    /**
     * Fetches the text command from their respective folder.
     */
    getTextCommands(services: Services) {
        readdir(`${__dirname}/text`)
            .then(files => files.filter(file => file.endsWith(".js")))
            .then(async commandsDir => {
                for (const commandFile of commandsDir) {
                    const command: TextCommand = new (await import(`${__dirname}/text/${commandFile}`)).default();

                    if ("data" in command && "execute" in command) {
                        this.textCommands.set(command.data.name, command);
                    } else {
                        logger.warning("Attempted to add text command", commandFile, "but it is missing either the data property or the execute function. Skipping command...");
                    }
                }
            })
            .catch(async error => {
                logger.error("Encountered an error when trying to get text commands directory.\n", error, "\n", error.stack);
                await services.pager.sendCrash(error, "Get text commands", services.state.state.pagedUsers);
                process.exit(1);
            });
    }

    /**
     * Registers the slash commands globally with Discord.
     * If the DEVELOPMENT_GUILD environment variable is defined, commands will be registered as guild commands instead.
     * @param client The Discord client to register the commands on.
     */
    async registerSlashCommands(client: Client, services: Services) {
        const commands = [];

        this.slashCommands.forEach(command => {
            commands.push(command.data.toJSON());
        });

        const rest = new REST().setToken(client.token);

        if (process.env.DEVELOPMENT_GUILD != undefined) {
            try {
                try {
                    await rest.put(
                        Routes.applicationCommands(client.user.id),
                        { body: [] }
                    );
                } catch (error) {
                    logger.warning("Encountered an error while trying to unregister all global commands.\n", error, "\n", error.stack);
                }

                const data = await rest.put(
                    Routes.applicationGuildCommands(client.user.id, process.env.DEVELOPMENT_GUILD as string),
                    { body: commands }
                );

                logger.command("Registered", commands.length.toString(), "slash commands in guild id", process.env.DEVELOPMENT_GUILD as string);
            } catch (error) {
                logger.error("Encountered an error while trying to register all slash commands as guild commands.\n", error, "\n", error.stack);
                await services.pager.sendError(error, "Trying to register all slash commands as guild commands.", services.state.state.pagedUsers);
            }
        } else {
            try {
                const data = await rest.put(
                    Routes.applicationCommands(client.user.id),
                    { body: commands }
                );

                logger.command("Registered", commands.length.toString(), "slash commands globally");
            } catch (error) {
                logger.error("Encountered an error while trying to register all slash commands as global commands.\n", error, "\n", error.stack);
                await services.pager.sendError(error, "Trying to register all slash commands as global commands.", services.state.state.pagedUsers);
            }
        }
    }

    /**
     * Handles processing of text commands, including prefix detection, command detection, and permission and environment checks.
     * This code is written to allow text commands to be more than 1 word, as well as the prefix.
     * This way, a command such as "okay bilby, ban user" is a valid command and prefix combination.
     * @param message The message received from Discord.
     */
    async onTextCommandPreprocess(message: Message, services: Services) {
        if (!isTHHorDevServer(message.guildId)) return;

        if (!message.content.startsWith(process.env.PREFIX)) return;
        let content = message.content.replace(process.env.PREFIX, "");
        let commandName = [...this.textCommands.keys()].find(key => content.startsWith(key));

        if (commandName === undefined) return; // The above find function didn't find a command.
        let args = content.replace(commandName, "").trim().split(" "); // Args splitting while respecting both prefix and command length.

        let command = this.textCommands.get(commandName);

        try {
            if (!command) throw new ReferenceError(`Text command ${commandName} does not exist.`);

            // TODO: Do permission and environment checks.
            // Environment checks
            if (!command.data.allowedInDMs && [ChannelType.DM, ChannelType.GroupDM].includes(message.channel.type)) return;

            if (canExecuteCommand(command, message.member)) command.execute(message, args, services);
        } catch (error) {
            logger.error("Encountered an error while trying to execute the", commandName, "text command.\n", error, "\n", error.stack);
            await services.pager.sendError(error, "Trying to execute the " + commandName + " text command. See message " + message.url, services.state.state.pagedUsers, { message, args });
            await message.reply("Whoops! Seems like something went wrong while processing your request. Please try again.");
        }
    }

    /**
     * Handles processing of slash commands.
     * @param interaction The BaseInteraction received from Discord.
     */
    async onSlashCommandPreprocess(interaction: BaseInteraction, services: Services) {
        if (!interaction.isChatInputCommand()) return;
        if (!isTHHorDevServer(interaction.guild.id)) {
            await interaction.reply({
                content: "no:)",
                ephemeral: true
            })
            return;
        }

        const command = this.slashCommands.get(interaction.commandName)

        try {
            if (!command) throw new ReferenceError(`Slash command ${interaction.commandName} does not exist.`);

            await command.execute(interaction, services);
        } catch (error) {
            logger.error("Encountered an error while trying to execute the", interaction.commandName, "slash command.\n", error.stack);
            await services.pager.sendError(error, "Trying to execute the " + interaction.commandName + " slash command.", services.state.state.pagedUsers, { interaction });

            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: "Whoops! Seems like something went wrong while processing your request. Please try again.", ephemeral: true });
                } else {
                    await interaction.reply({ content: "Whoops! Seems like something went wrong while processing your request. Please try again.", ephemeral: true });
                }
            } catch (innerError) {
                logger.error("Failure in sending \"something gone wrong\" message.", innerError)
            }
        }
    }

    /**
     * Handles processing of slash command autocomplete.
     * @param interaction The BaseInteraction received from Discord.
     */
    async onSlashAutocompletePreprocess(interaction: BaseInteraction, services: Services) {
        if (!interaction.isAutocomplete()) return;

        const command = this.slashCommands.get(interaction.commandName)

        try {
            if (!command) throw new ReferenceError(`Slash command ${interaction.commandName} does not exist.`);

            await command.autocomplete(interaction, services);
        } catch (error) {
            logger.error("Encountered an error while trying to autocomplete the", interaction.commandName, "slash command.\n", error, "\n", error.stack);
            // FIXME: Due to spamming concerns, we don't page errors here. Potential solution is to generate a hash based on the error's message and stack trace, as well as "whileDoing" in order to get a unique id for an error so we don't repeat ourselves.
            await interaction.respond([].map(choice => ({ name: choice, value: choice })));
        }
    }
}