import { EmbedBuilder, Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandArgType, TextCommandBuilder } from "../TextCommand";
import { PageBuilder } from "../../Helper/PaginationHelper";
import { canExecuteCommand } from "../../Helper/PermissionHelper";

export default class HelpCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("help")
        .setDescription("Shows a list of all text commands available to you, or about one specific command if provided.")
        .addImplicitStringArgument("command", "The command you want information on", false)
        .allowInDMs(true);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        let allTextCommands = services.commands.textCommands;
        let searchTerm = args["command"];

        if (searchTerm == "arg_type") {
            await message.reply([
                "**Text commands** in Bot Bilby features a type system for arguments to ensure input data is valid:",
                " - `boolean`: **true | false**",
                " - `number`: it's numbers, what do you expect lol (**example: 1234567890**)",
                " - `string`: an array of characters. for strings that contain whitespaces, the use of quotation mark is required (**example: test123, 'string with whitespace', \"another string with whitespace!\"**)",
                " - `implicit_string`: a type of string that doesn't require the use of quotation mark even if the string contains whitespaces",
                " - `channel_mention`: can either by the ID of a channel, or it's mention in chat (**example: 1234567890123456789, #general (<#1234567890123456789>)**)",
                " - `user_mention`: can either by the ID of a user, or it's mention in chat (**example: 1234567890123456789, @test123 (<@1234567890123456789>)**)",
            ].join("\n"))
            return
        }

        if (searchTerm != undefined) {
            // Get specific command.
            let command = allTextCommands.get(searchTerm);

            if (command == undefined) {
                await message.reply("Sorry, I couldn't find a command with that name. Please try again.");
                return;
            }

            let embed = new EmbedBuilder()
                .setTitle(command.data.name)
                .setDescription(`${!canExecuteCommand(command, message.member) ? ":warning: **Your permission level prevents you from running this command.**\n*See the bolded permission fields below for entries which apply to you.*\n\n" : ""}${command.data.description}`)
                .setColor(16777215)

            if (command.data.arguments.length != 0) {
                embed.addFields(
                    { name: "Arguments", value: command.data.arguments.map(argument => `${argument.required ? `\`<${argument.name}>\`` : `\`[${argument.name}]\``} (type: \`${TextCommandArgType[argument.type]}\`) - ${argument.description}`).join("\n") }
                );
            }

            let rolePermissions = command.data.permissions.allowedRoles.map(roleId => { return { role: { id: message.guild.roles.resolve(roleId).id, name: message.guild.roles.resolve(roleId).name }, allowed: true } })
            rolePermissions.push(...command.data.permissions.deniedRoles.map(roleId => { return { role: { id: message.guild.roles.resolve(roleId).id, name: message.guild.roles.resolve(roleId).name }, allowed: false } }));

            rolePermissions.push({
                role: {
                    id: "0",
                    name: "**Everyone**"
                },
                allowed: false
            });

            if (rolePermissions.length > 1) {
                embed.addFields(
                    { name: "Role permissions", value: rolePermissions.map(roles => `${message.member.roles.cache.has(roles.role.id) ? `**${roles.role.name}**` : `${roles.role.name}`} ${roles.allowed ? "✅" : "🚫"}`).join("\n"), inline: true }
                );
            }

            if (command.data.permissions.allowedUsers.length != 0) {
                embed.addFields(
                    { name: "User permissions", value: command.data.permissions.allowedUsers.map(user => `<@${user}>${message.author.id == user ? " (You)" : ""} ✅`).join("\n"), inline: true }
                );
            }

            embed.addFields(
                {
                    name: "Usage",
                    value: `\`${process.env.PREFIX}${command.data.name}${command.data.arguments.length != 0? ` ${command.data.arguments.map(argument => argument.required ? `<${argument.name}>` : `[${argument.name}]`).join(" ")}` : ""}\``
                },
                {
                    name: "What are all these type?!",
                    value: `To get help for type (like string, or number), type \`${process.env.PREFIX}help arg_type\``
                }
            )

            await message.reply({
                embeds: [embed],
                allowedMentions: { parse: ['users', 'roles'], repliedUser: true }
            });
        } else {
            // List all commands and their descriptions.
            let paginatedMessage = new PageBuilder(
                "plain_text",
                Array.from(allTextCommands, (entry) => entry[1]) // Take all the text commands as an array
                    .filter(command => canExecuteCommand(command, message.member)) // Filter out all commands the user cannot run themselves.
                    .sort()
                    .map(command => `${command.data.name} - ${command.data.description}`) // Format the help output as "name - description"
                    .join("\n") // Join into 1 string with each command as a newline...
                    .match(/(?=[\s\S])(?:.*\n?){1,10}/g), // ... then split every 10 newlines for each page.
                "Here's all the text-based commands you can run!\nAny commands you can't run are hidden.\n\n```\n",
                `\n\`\`\`\nWant more information on a command? Run \`${process.env.PREFIX}${this.data.name} <command name>\`.`
            );

            await paginatedMessage.send(message);
        }
    }
}