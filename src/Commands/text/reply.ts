import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class ReplyCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("reply")
        .setDescription("Reply a message as Bot Bilby.")
        .addAllowedRoles(roleIds.staff)
        .addStringArgument("message_link", "Message you want to reply (message as a link)")
        .addImplicitStringArgument("message", "The message to send")
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        let messageLink = args["message_link"]
        let messageRegex = /discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/gm
        let result = messageRegex.exec(messageLink)
        if (!result) {
            await message.reply("Invalid message link!")
            return
        }

        if (args["message"].trim().length == 0) {
            await message.reply("Cannot reply with an empty message!")
            return
        }

        let channelId = result[2]
        let messageId = result[3]

        try {
            let channel = await message.guild.channels.fetch(channelId) as TextChannel;
            let fetchedMessage = await channel.messages.fetch(messageId)
            await fetchedMessage.reply({
                content: args["message"],
                files: message.attachments.map(v => v)
            });
        } catch (e) {
            await message.reply("Unable to reply! Bot doesn't have access to the specified message or is outside of the current server.")
        }
    }
}
