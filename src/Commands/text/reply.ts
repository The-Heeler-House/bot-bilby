import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class ReplyCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("reply")
        .setDescription("Reply a message as Bot Bilby.")
        .addAllowedRoles(roleIds.mod)
        .addStringArgument(
            "message_link",
            "Message you want to reply (message as a link)",
        )
        .addImplicitStringArgument("message", "The message to send", false)
        .allowInDMs(false);

    async execute(
        message: Message,
        args: { [key: string]: string },
        services: Services,
    ) {
        let messageLink = args["message_link"];
        let messageRegex =
            /discord(app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)/gm;
        let result = messageRegex.exec(messageLink);
        if (!result) {
            await message.reply("Error! Invalid message link!");
            return;
        }

        let channelId = result[3];
        let messageId = result[4];

        try {
            let channel = (await message.guild.channels.fetch(
                channelId,
            )) as TextChannel;
            let fetchedMessage = await channel.messages.fetch(messageId);
            const files = message.attachments.map((v) => v);
            const stickers = message.stickers.map((v) => v);
            const content = args["message"].trim();
            if (
                content.length == 0 &&
                files.length == 0 &&
                stickers.length == 0
            ) {
                await message.reply("Error! Cannot send an empty message!");
                return;
            }
            await fetchedMessage.reply({
                content,
                files,
                stickers,
            });
            await message.react("✅");
        } catch (e) {
            await message.reply(
                "Error! Bot doesn't have access to the specified message or is outside of the current server.",
            );
        }
    }
}
