import { AttachmentBuilder, Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds, channelIds } from "../../constants";

export default class SayCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("say")
        .setDescription("Sends a message into off-topic as Bot Bilby.")
        .addAllowedRoles(roleIds.mod)
        .addImplicitStringArgument(
            "message",
            "The message to send into off-topic",
            false,
        )
        .allowInDMs(false);

    async execute(
        message: Message,
        args: { [key: string]: string },
        services: Services,
    ) {
        let channel = (await message.guild.channels.fetch(
            channelIds.offTopic,
        )) as TextChannel;
        const files = message.attachments.map((v) => v);
        const stickers = message.stickers.map((v) => v);
        const content = args["message"].trim();
        if (content.length == 0 && files.length == 0 && stickers.length == 0) {
            await message.reply("Error! Cannot send an empty message!");
            return;
        }
        await channel.send({
            content,
            files,
            stickers,
        });
        await message.react("✅");
    }
}
