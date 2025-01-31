import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";
import * as logger from "../../logger";

export default class CommandBlacklistCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("command blacklist add")
        .setDescription("Add a user to the command blacklist which would prevent them from running certain commands.")
        .addUserMentionArgument("user", "The user to add to blacklist.")
        .addImplicitStringArgument("command", "Command(s) to prevent them from running. To add multiple command, separate them with a comma. Omit this argument to block **all** commands.", false)
        .addAllowedRoles(roleIds.staff)
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        const foundData = await services.database.collections.commandBlacklist.findOne({ user: args["user"] })
        const commandList = new Set(services.commands.slashCommands.keys())

        let newList = new Set<string>()
        if (foundData["commands"]?.length > 0) {
            for (let i of foundData["commands"]) newList.add(i)
        }

        if (args["command"]) {
            for (let i of args["command"].split(",").map(v => v.trim().toLowerCase())) {
                if (!commandList.has(i)) {
                    await message.reply(`Error: Invalid command to add \`${i}\`.`);
                    return
                }
                newList.add(i)
            }
        } else {
            for (let i of commandList) newList.add(i)
        }

        try {
            await services.database.collections.commandBlacklist.updateOne(
                { user: args["user"] },
                { $set: { command: [...newList] } },
                { upsert: true }
            )

            await message.reply(`Successfully added command(s) to the blacklist for <@${args["user"]}>.`);
        } catch (error) {
            logger.error("Encountered error while trying to add command to blacklist for", args["user"], "\n", error, "\n", error.stack);
            await services.pager.sendError(error, "Encountered error while trying to add command to blacklist for " + args["user"], services.state.state.pagedUsers, { message, args });
            await message.reply(`Encountered error while trying to add command to blacklist for \`${args["user"]}\`. Please try again.`);
        }
    }
}