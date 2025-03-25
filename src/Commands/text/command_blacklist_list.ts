import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";
import * as logger from "../../logger";

export default class CommandBlacklistCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("command blacklist list")
        .setDescription("List the command blacklist for a user.")
        .addUserMentionArgument("user", "The user to remove from blacklist.")
        .addAllowedRoles(roleIds.staff)
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        const foundData = await services.database.collections.commandBlacklist.findOne({ user: args["user"] })

        if (!foundData || foundData["command"].length == 0) {
            await message.reply("User is not blacklisted yet!")
            return
        }

        await message.reply(`Command blacklisted for user <@${args["user"]}>:\n\`${foundData["command"].join(", ")}\``);
    }
}