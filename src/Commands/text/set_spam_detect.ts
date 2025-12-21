import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";
import SpamDetection from "../../Services/Database/models/spamDetection";

export default class SetSpamDetect extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("set spam detect")
        .setDescription("Set the spam detection for a channel.")
        .addAllowedRoles(roleIds.mod)
        .addChannelMentionArgument("channel", "Channel to setup or update detection")
        .addImplicitStringArgument("config", "JSON configuration for spam detection. If you don't understand what this arg is, you shouldn't use this command.")
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        const channel = args["channel"]
        const rawConfig = args["config"]

        let config: Omit<SpamDetection, "channel">;
        try {
            config = JSON.parse(rawConfig)
        } catch (e) {
            await message.reply("Invalid JSON object!")
            return
        }

        const requiredKey: (keyof SpamDetection)[] = ["window_ms", "min_delta_ms", "max_recent", "score_threshold"]
        for (let i of requiredKey) {
            if (config[i] == undefined || typeof config[i] != "number") {
                await message.reply(`Invalid value for key "${i}" in JSON object!`)
                return
            }
        }

        await services.database.collections.spamDetection.updateOne({
            channel: args["channel"]
        }, {
            $set: {
                max_recent: config.max_recent,
                min_delta_ms: config.min_delta_ms,
                score_threshold: config.score_threshold,
                window_ms: config.window_ms
            }
        }, {
            upsert: true
        })

        await message.reply("Updated!")
    }
}