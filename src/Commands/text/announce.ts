import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class AnnounceCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("announce")
        .setDescription("Sends a message into server-announcements as Bot Bilby.")
        .addAllowedRoles(roleIds.leadership)
        .addArgument("message", "The message to send into server-announcements")
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        let channel = await message.guild.channels.fetch("961056736398172200") as TextChannel;
        await channel.send(args.join(" "));
    }
}