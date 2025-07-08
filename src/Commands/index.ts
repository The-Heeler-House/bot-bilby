import SlashCommand from "./SlashCommand";
import TextCommand, { TextCommandArgType, TextCommandArgument } from "./TextCommand";
import { BaseInteraction, ChannelType, Client, Message, REST, Routes } from "discord.js";
import { readdir } from "fs/promises";
import * as logger from "../logger";
import { Services } from "../Services";
import { isTHHorDevServer } from "../Helper/EventsHelper";
import { canExecuteCommand } from "../Helper/PermissionHelper";

function parseTextArgs(data: TextCommandArgument[], rawArgs: string) {
    const processStringRegex = /"([^"]*)"(\W*)|'([^']*)'(\W*)|`([^`]*)`(\W*)|“([^“”]*)”(\W*)|(\S+)(\W*)/g
    let processed: string[] = []
    let separator: string[] = []
    let match: RegExpExecArray

    let output = {}

    while ((match = processStringRegex.exec(rawArgs)) !== null) {
        if (match[1]) {
            processed.push(match[1])
            separator.push(match[2])
            continue
        }
        if (match[3]) {
            processed.push(match[3])
            separator.push(match[4])
            continue
        }
        if (match[5]) {
            processed.push(match[5])
            separator.push(match[6])
            continue
        }
        if (match[7]) {
            processed.push(match[7])
            separator.push(match[8])
            continue
        }
        if (match[9]) {
            processed.push(match[9])
            separator.push(match[10])
            continue
        }
    }

    //? check if optional args are placed at the end of the list
    const requiredList = data.map(v => v.required)
    let curRequired = true
    for (const i of requiredList) {
        if (!curRequired && i) {
            throw new Error("(developer error) optional arguments are not at the end of the argument list")
        }
        curRequired = i
    }

    //? check if implicit string argument is at the absolute final of the list (if there's any)
    for (let i = 0; i < data.length - 1; i++) {
        if (data[i].type == TextCommandArgType.implicit_string) {
            throw new Error("(developer error) implicit string argument is not at the end of the argument list")
        }
    }

    //? check if argument length is the same
    const argLength = data.length
    const requiredArgLength = data.filter(v => v.required).length

    const invalidLengthMsg = `expected ${requiredArgLength == argLength ? requiredArgLength : `${requiredArgLength} to ${argLength}`} argument(s) in command, found ${processed.length} argument(s) instead`

    if (processed.length < requiredArgLength)
        throw new Error(invalidLengthMsg)

    if (data.length == 0 || data[data.length - 1].type != TextCommandArgType.implicit_string) {
        if (processed.length > argLength) throw new Error(invalidLengthMsg)
    }

    //? process data and check if type matches
    const invalidTypeMsg = (expected: TextCommandArgType, at: string) => `invalid type at argument \`${at}\`, expected type \`${TextCommandArgType[expected]}\``;
    for (let i = 0; i < processed.length; i++) {
        const data_pos = Math.min(i, data.length - 1)
        switch (data[data_pos].type) {
            case TextCommandArgType.number:
                const num = Number(processed[i])
                if (isNaN(num)) {
                    throw new Error(invalidTypeMsg(TextCommandArgType.number, data[i].name))
                }
                output[data[data_pos].name] = num
                break
            case TextCommandArgType.boolean:
                const bool = processed[i].toLowerCase().normalize()
                if (!["true", "false"].includes(bool)) {
                    throw new Error(invalidTypeMsg(TextCommandArgType.boolean, data[i].name))
                }
                output[data[data_pos].name] = bool == "true" ? true : false
                break
            case TextCommandArgType.channel_mention:
                let channel = processed[i].trim().toLowerCase().normalize()
                channel = channel.replace(/^\<#(\d+)\>$/g, "$1")
                if (isNaN(Number(channel))) {
                    throw new Error(invalidTypeMsg(TextCommandArgType.channel_mention, data[i].name))
                }
                output[data[data_pos].name] = channel
                break
            case TextCommandArgType.user_mention:
                let user = processed[i].trim().toLowerCase().normalize()
                user = user.replace(/^\<@(\d+)\>$/g, "$1")
                if (isNaN(Number(user))) {
                    throw new Error(invalidTypeMsg(TextCommandArgType.user_mention, data[i].name))
                }
                output[data[data_pos].name] = user
                break
            case TextCommandArgType.string:
                let str = processed[i]
                output[data[data_pos].name] = str
                break
            case TextCommandArgType.implicit_string:
                let impl_str = processed[i] + separator[i]
                if (output[data[data_pos].name])
                    output[data[data_pos].name] += impl_str
                else
                    output[data[data_pos].name] = impl_str
                break
        }
    }

    return output
}

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
        let command = this.textCommands.get(commandName);

        let rawArgs = content.replace(commandName, "").trim(); // Args splitting while respecting both prefix and command length.
        let args = {}

        try {
            if (!command) throw new ReferenceError(`Text command ${commandName} does not exist.`);

            // TODO: Do permission and environment checks.
            // Environment checks
            if (!command.data.allowedInDMs && [ChannelType.DM, ChannelType.GroupDM].includes(message.channel.type)) return;

            try {
                args = parseTextArgs(command.data.arguments, rawArgs)
            } catch (e) {
                await message.reply(`${e}`)
                return
            }

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
        if (!isTHHorDevServer(interaction.guildId)) {
            await interaction.reply({
                content: "Hello. If you are seeing this message, then you probably have invited this bot to your private server to try and use it. While we don't have any rules about this, we also do not recommend this, as the bot was designed to work for The Heeler House Discord Server. Because of that, all functionality of the bot will not work outside of THH.\n\nThis is **not an error**. **Do not** contact the bot developers or THH staff about this.",
                ephemeral: false
            })
            return;
        }

        const blacklist = await services.database.collections.commandBlacklist.findOne({ user: interaction.user.id })

        if (blacklist && blacklist["command"].includes(interaction.commandName)) {
            await interaction.reply({
                content: "Sorry, but you have been blocked from running this command.",
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