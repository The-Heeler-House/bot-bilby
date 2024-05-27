import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds, channelIds } from "../../constants";

export default class SayCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("say")
        .setDescription("Sends a message into off-topic as Bot Bilby.")
        .addAllowedRoles(roleIds.staff)
        .addArgument("message", "The message to send into off-topic")
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        let channel = await message.guild.channels.fetch(channelIds.offTopic) as TextChannel;
        console.log(args)
        if (args.join(" ").length === 0) {
            await message.reply("You need to provide a message to send!");
            return;
        }
        await channel.send(args.join(" "));
    }
}