import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { devIds, roleIds } from "../../constants";
import Triggers from "../../Services/Database/models/trigger";

export default class ListIgnoredChannelsCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("list ignored channels")
        .setDescription("Gets a list of all ignored channels.")
        .addAllowedRoles(roleIds.leadership)
        .addAllowedUsers(...devIds)
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        const channels = services.state.state.ignoredChannels;
        if (channels.length == 0) {
            await message.reply(`I'm not ignoring any channels yet.`);
            return;
        }

        await message.reply(`Here's a list of all ignored channels.\n${channels.map(channel => `<#${channel}>`).join(" ")}`);
    }
}