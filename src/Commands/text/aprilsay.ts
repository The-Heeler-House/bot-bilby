import { AttachmentBuilder, Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds, channelIds } from "../../constants";

export default class AprilSay extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("aprilsay")
        .setDescription("Sends a message into nasdunny updates as Bot Bilby.")
        .addAllowedRoles(roleIds.staff)
        .addImplicitStringArgument("message", "The message to send into nasdunny updates")
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        let channel = await message.guild.channels.fetch("1356757291189403798") as TextChannel;
        await channel.send({
            content: "**An exclusive scoop from the Heeler House Stock Broker Team:** " + args["message"],
            files: message.attachments.map(v => v)
        });
    }
}