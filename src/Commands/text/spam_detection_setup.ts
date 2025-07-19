import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class SpamDetectionSetupCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("spam detection setup")
        .setDescription("Setup or update spam detection (message and media spam) alert for a channel.")
        .addAllowedRoles(roleIds.mod)
        .addChannelMentionArgument("channel", "Channel to setup or update detection")
        .addStringArgument("min_message_rate", "Minimum speed of message spam to alert (format: <num_of_messages>/<time_in_seconds>)")
        .addStringArgument("min_media_ratio", "Minimum ratio between media and messages to alert (format: <num_of_media>/<num_of_total_messages>)")
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        try {
            await message.guild.channels.fetch(args["channel"]) as TextChannel;
        } catch (e) {
            await message.reply(`Cannot find specified channel!\n${e}`)
            return
        }

        const regex = /(\d+)\/(\d+)/
        const [_1, min_message_cnt, min_message_time] = regex.exec(args["min_message_rate"])
        const [_2, min_media_cnt, min_media_sample_size] = regex.exec(args["min_media_ratio"])

        await services.database.collections.spamDetection.updateOne({
            channel: args["channel"]
        }, {
            $set: {
                min_message_cnt: Number(min_message_cnt),
                min_message_time: Number(min_message_time),
                min_media_cnt: Number(min_media_cnt),
                min_media_sample_size: Number(min_media_sample_size)
            }
        }, {
            upsert: true
        })

        await message.reply(`Successful! Channel <#${args["channel"]}> will be alerted and rate-limited when message rate reaches over __${min_message_cnt} messages/${min_message_time}s__ and media ratio over __${min_media_cnt}/${min_media_sample_size} messages__`)
    }
}