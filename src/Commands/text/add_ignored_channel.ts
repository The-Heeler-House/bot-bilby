import { Message, SnowflakeUtil, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { devIds, roleIds } from "../../constants";
import BotCharacter from "../../Services/Database/models/botCharacter";
import * as logger from "../../logger";
import { CollectionTimeoutError, getUpcomingMessage } from "../../Helper/FlowHelper";

export default class IgnoreChannelComamnd extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("ignore channel")
        .setDescription("Adds a channel for Bot Bilby to ignore.")
        .addArgument("channel", "The channel to ignore.")
        .addAllowedRoles(roleIds.leadership)
        .addAllowedUsers(...devIds)
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        if (args.length === 0 && message.mentions.channels.size === 0) {
            message.reply("You need to provide me a channel to ignore!");
            return;
        }

        if (message.mentions.channels.size !== 0)
            args[0] = message.mentions.channels.first().id;

        if (services.state.state.ignoredChannels.includes(args[0])) {
            message.reply("I'm already ignoring that channel.");
            return;
        }

        services.state.state.ignoredChannels.push(args[0]);

        message.reply("Got it, I'll ignore the <#" + args[0] + "> channel from now on");
    }
}

function escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}