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
        .addChannelMentionArgument("channel", "The channel ID to unignore.")
        .addAllowedRoles(roleIds.leadership)
        .addAllowedUsers(...devIds)
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        let channel = String(args["channel"])
        if (message.mentions.channels.size !== 0)
            channel = message.mentions.channels.first().id;

        if (!services.state.state.ignoredChannels.includes(channel)) {
            message.reply("I'm already listening to that channel.");
            return;
        }

        services.state.state.ignoredChannels = services.state.state.ignoredChannels.filter(item => item != channel);
        services.state.save();

        await message.reply("Got it, I'll listen to the <#" + channel + "> channel from now on");
    }
}
