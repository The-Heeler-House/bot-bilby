import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { devIds, roleIds } from "../../constants";

export default class StartLogSpamDetect extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("start log spam detect")
        .setDescription("Log telemetry data for spam detect system.")
        .addAllowedRoles(roleIds.leadership)
        .addAllowedUsers(...devIds)
        .addChannelMentionArgument("channel", "Channel to log")
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        const result = await services.database.collections.spamDetection.findOne({
            channel: args["channel"]
        }, {
            showRecordId: false
        })

        if (result) {
            services.state.volatileState.spamDetection.shouldLog[args["channel"]] = true
            services.state.volatileState.spamDetection.log[args["channel"]] = []
            await message.reply(`spam detection telemetry started for channel <#${args["channel"]}> at <t:${Math.round(message.createdTimestamp / 1000)}>`)
        }
    }
}