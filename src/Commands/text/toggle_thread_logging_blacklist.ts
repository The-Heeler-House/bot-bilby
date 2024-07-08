import { ChannelType, Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { channelIds, roleIds } from "../../constants";

export default class TogglePagingCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("toggle thread logging blacklist")
        .setDescription("Toggles whether the thread/channel is logged as part of thread logging.")
        .addAllowedRoles(roleIds.staff)
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        if (args[0].startsWith("<#") && args[0].endsWith(">")) args[0] = args[0].replace("<#", "").replace(">", "");

        let channel = await message.guild.channels.fetch(args[0]);

        if ([ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread].includes(channel.type)) {
            // Blacklist thread.
            let channelIndex = services.state.state.threadLogging.blacklistedThreads.indexOf(channel.id);

            if (channelIndex == -1) {
                services.state.state.threadLogging.blacklistedThreads.push(channel.id);
            } else {
                services.state.state.threadLogging.blacklistedThreads.splice(channelIndex, 1);
            }

            services.state.save();

            message.reply(`Successfully **${channelIndex == -1 ? "added" : "removed"}** <#${channel.id}> ${channelIndex == -1 ? "to" : "from"} the blacklist. The thread will ${channelIndex == -1 ? "no longer " : ""}be logged in <#${channelIds.threadLog}>.`);
        } else {
            // Blacklist channel.
            let channelIndex = services.state.state.threadLogging.blacklistedChannels.indexOf(channel.id);

            if (channelIndex == -1) {
                services.state.state.threadLogging.blacklistedChannels.push(channel.id);
            } else {
                services.state.state.threadLogging.blacklistedChannels.splice(channelIndex, 1);
            }

            services.state.save();

            message.reply(`Successfully **${channelIndex == -1 ? "added" : "removed"}** <#${channel.id}> ${channelIndex == -1 ? "to" : "from"} the blacklist. The channel's threads will ${channelIndex == -1 ? "no longer " : ""}be logged in <#${channelIds.threadLog}>.`);
        }
    }
}