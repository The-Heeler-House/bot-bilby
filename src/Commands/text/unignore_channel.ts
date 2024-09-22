import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { devIds, roleIds } from "../../constants";
import * as logger from "../../logger";
import Triggers from "../../Services/Database/models/trigger";

export default class UnignoreChannelComamnd extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("unignore channel")
        .setDescription("Removes a channel for Bot Bilby to ignore.")
        .addArgument("channel", "The channel to unignore.")
        .addAllowedRoles(roleIds.leadership)
        .addAllowedUsers(...devIds)
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        if (args.length === 0 && message.mentions.channels.size === 0) {
            message.reply("You need to provide me a channel to unignore!");
            return;
        }

        if (message.mentions.channels.size !== 0)
            args[0] = message.mentions.channels.first().id;

        if (!services.state.state.ignoredChannels.includes(args[0])) {
            message.reply("I'm already listening to that channel.");
            return;
        }

        services.state.state.ignoredChannels.push(args[0]);

        message.reply("Got it, I'll listen to the <#" + args[0] + "> channel from now on");
    }
}