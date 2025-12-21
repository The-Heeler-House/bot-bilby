import { AttachmentBuilder, Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { devIds, roleIds } from "../../constants";

export default class ExportLogSpamDetect extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("export log spam detect")
        .setDescription("Export the logged the data that spam detect collected (this also disables temeletry for the channel, and clears all telemetry data after exported).")
        .addAllowedRoles(roleIds.leadership)
        .addAllowedUsers(...devIds)
        .addChannelMentionArgument("channel", "Channel to export log")
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        services.state.volatileState.spamDetection.shouldLog[args["channel"]] = false
        const telemetry = services.state.volatileState.spamDetection.log[args["channel"]]
        const csvData = ["timestamp,flags,wscore"]
        for (const row of telemetry) {
            csvData.push(`${row.timestamp},${row.flags},${row.wscore}`)
        }

        const finalData = csvData.join("\n")
        await message.reply({
            content: `${csvData.length} rows exported. collected spam detection telemetry for channel <#${args["channel"]}> is shown below`,
            files: [
                new AttachmentBuilder(Buffer.from(finalData))
                    .setName(`telemetry_${args["channel"]}.csv`)
            ]
        })
        services.state.volatileState.spamDetection.log[args["channel"]] = []
    }
}