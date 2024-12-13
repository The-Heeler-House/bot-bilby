import { AttachmentBuilder, Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds, channelIds } from "../../constants";

export default class SayCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("say")
        .setDescription("Sends a message into off-topic as Bot Bilby.")
        .addAllowedRoles(roleIds.staff)
        .addImplicitStringArgument("message", "The message to send into off-topic")
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        let channel = await message.guild.channels.fetch(channelIds.offTopic) as TextChannel;
        await channel.send({
            content: args["message"],
            files: message.attachments.map(v => v)
        });
    }
}