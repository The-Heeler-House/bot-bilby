import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";

export default class PingCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("hero7ransla7e")
        .setDescription("7ransla7es Hero's broken keyboard")
        .allowInDMs(true);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        // if the message is not replying to a message, return
        if (!message.reference) {
            await message.reply("You need to reply to a message to use this command.");
        }

        // get the message that was replied to
        const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);

        // get the content of the message that was replied to

        const content = repliedMessage.content;

        // translate the content by replacing all 7s with t

        const translatedContent = content.replace(/7/g, "t");

        // reply with the translated content

        await message.reply(translatedContent);
    }
}