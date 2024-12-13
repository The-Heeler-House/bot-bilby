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
        .addNumberArgument("channel", "The channel to ignore.")
        .addAllowedRoles(roleIds.leadership)
        .addAllowedUsers(...devIds)
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        let channel = String(args["channel"])
        if (message.mentions.channels.size !== 0)
            channel = message.mentions.channels.first().id;

        if (services.state.state.ignoredChannels.includes(channel)) {
            message.reply("I'm already ignoring that channel.");
            return;
        }

        services.state.state.ignoredChannels.push(channel);
        services.state.save();

        await message.reply("Got it, I'll ignore the <#" + channel + "> channel from now on");
    }
}