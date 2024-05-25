import SlashCommand from "./SlashCommand";
import TextCommand from "./TextCommand";
import { BaseInteraction, ChannelType, Client, InteractionType, Message, REST, Routes } from "discord.js";
import { readdir } from "fs/promises";
import { THH_SERVER_ID } from "../constants";
import * as logger from "../logger";
import { Services } from "../Services";

/**
 * The Command Preprocessor is in charge of registering commands and executing them if they meet the right conditions.
 */
export default class CommandPreprocessor {
    public slashCommands = new Map<string, SlashCommand>()
    public textCommands = new Map<string, TextCommand>();

    constructor() {
        this.getSlashCommands();
        this.getTextCommands();
    }

    /**
     * Fetches the slash commands from their respective folder.
     */
    private getSlashCommands() {
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
            })
            .catch(error => {
                logger.error("Encountered an error when trying to get slash commands directory. See error below.\n", error, "\n", error.stack);
                process.exit(1);
            });
    }

    /**
     * Fetches the text command from their respective folder.
     */
    private getTextCommands() {
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
            .catch(error => {
                logger.error("Encountered an error when trying to get text commands directory.\n", error, "\n", error.stack);
                process.exit(1);
            });
    }

    /**
     * Registers the slash commands globally with Discord.
     * If the DEVELOPMENT_GUILD environment variable is defined, commands will be registered as guild commands instead.
     * @param client The Discord client to register the commands on.
     */
    async registerSlashCommands(client: Client) {
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
        if (process.env.DEVELOPMENT_GUILD ? message.guildId != process.env.DEVELOPMENT_GUILD : message.guildId != THH_SERVER_ID) return;

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

            // Permission checks.
            // User allows override role allows/denies.
            let allowed = false;

            // Gets list of current user's roles allowed to use the command
            let allowedUserRoles = message.member.roles.cache.filter((_, snowflake) => command.data.permissions.allowedRoles.includes(snowflake));

            // Gets list of current user's roles which deny use of the command
            let deniedUserRoles = message.member.roles.cache.filter((_, snowflake) => command.data.permissions.deniedRoles.includes(snowflake));

            if (allowedUserRoles.size != 0 || command.data.permissions.allowedRoles.length == 0)
                allowed = true; // Either the user has a role that allows them to use the command, or there are no allowed roles, which implicitly allows all roles.

            if (deniedUserRoles.size != 0)
                allowed = false; // The user has a role that denies them from using the command.

            if (command.data.permissions.allowedUsers.includes(message.author.id))
                allowed = true; // The user's id is in the allowed users list.

            if (allowed) command.execute(message, args, services);
        } catch (error) {
            logger.error("Encountered an error while trying to execute the", commandName, "text command.\n", error, "\n", error.stack);
            await message.reply("Whoops! Seems like something went wrong while processing your request. Please try again.");
        }
    }

    /**
     * Handles processing of slash commands.
     * @param interaction The BaseInteraction received from Discord.
     */
    async onSlashCommandPreprocess(interaction: BaseInteraction, services: Services) {
        if (!interaction.isChatInputCommand()) return;

        const command = this.slashCommands.get(interaction.commandName)

        try {
            if (!command) throw new ReferenceError(`Slash command ${interaction.commandName} does not exist.`);

            await command.execute(interaction, services);
        } catch (error) {
            logger.error("Encountered an error while trying to execute the", interaction.commandName, "slash command.\n", error.stack);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "Whoops! Seems like something went wrong while processing your request. Please try again.", ephemeral: true });
            } else {
                await interaction.reply({ content: "Whoops! Seems like something went wrong while processing your request. Please try again.", ephemeral: true });
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
            await interaction.respond([].map(choice => ({ name: choice, value: choice })));
        }
    }
}