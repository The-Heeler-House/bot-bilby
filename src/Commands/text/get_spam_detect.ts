import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class GetSpamDetect extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("get spam detect")
        .setDescription("Get the current spam detection config for a channel.")
        .addAllowedRoles(roleIds.mod)
        .addChannelMentionArgument("channel", "Channel to setup or update detection")
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        const result = await services.database.collections.spamDetection.findOne({
            channel: args["channel"]
        }, {
            showRecordId: false
        })

        await message.reply("```" + JSON.stringify(result, null, 4) + "```")
    }
}