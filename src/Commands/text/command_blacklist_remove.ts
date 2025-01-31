import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";
import * as logger from "../../logger";

export default class CommandBlacklistCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("command blacklist remove")
        .setDescription("Remove a user from the command blacklist.")
        .addUserMentionArgument("user", "The user to remove from blacklist.")
        .addImplicitStringArgument("command", "Command(s) to allow running. To add multiple command, separate them with a comma. Omit this argument to allow **all** commands.", false)
        .addAllowedRoles(roleIds.staff)
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        const foundData = await services.database.collections.commandBlacklist.findOne({ user: args["user"] })
        const commandList = new Set(services.commands.slashCommands.keys())

        if (!foundData || foundData["command"].length == 0) {
            await message.reply("User is not blacklisted yet!")
            return
        }

        let newList = new Set<string>(foundData["command"])

        if (args["command"]) {
            for (let i of args["command"].split(",").map(v => v.trim().toLowerCase())) {
                if (!commandList.has(i)) {
                    await message.reply(`Error: Invalid command to remove \`${i}\`.`);
                    return
                }
                newList.delete(i)
            }
        } else {
            newList = new Set()
        }

        try {
            await services.database.collections.commandBlacklist.updateOne(
                { user: args["user"] },
                { $set: { command: [...newList] } },
                { upsert: true }
            )

            await message.reply(`Successfully removed command(s) from the blacklist for <@${args["user"]}>.`);
        } catch (error) {
            logger.error("Encountered error while trying to remove command from the blacklist for", args["user"], "\n", error, "\n", error.stack);
            await services.pager.sendError(error, "Encountered error while trying to remove command from the blacklist for " + args["user"], services.state.state.pagedUsers, { message, args });
            await message.reply(`Encountered error while trying to remove command from the blacklist for \`${args["user"]}\`. Please try again.`);
        }
    }
}