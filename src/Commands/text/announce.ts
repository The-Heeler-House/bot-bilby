import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds, channelIds } from "../../constants";

export default class AnnounceCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("announce")
        .setDescription("Sends a message into server-announcements as Bot Bilby.")
        .addAllowedRoles(roleIds.leadership)
        .addImplicitStringArgument("message", "The message to send into server-announcements")
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        let channel = await message.guild.channels.fetch(channelIds.announcements) as TextChannel;
        await channel.send(args["message"]);
    }
}