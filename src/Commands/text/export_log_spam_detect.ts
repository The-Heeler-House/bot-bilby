import { AttachmentBuilder, Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { devIds, roleIds } from "../../constants";

export default class ExportLogSpamDetect extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("export log spam detect")
        .setDescription(
            "Export the logged the data that spam detect collected (this also disables temeletry for the channel, and clears all telemetry data after exported).",
        )
        .addAllowedRoles(roleIds.leadership)
        .addAllowedUsers(...devIds)
        .addChannelMentionArgument("channel", "Channel to export log")
        .allowInDMs(false);

    async execute(
        message: Message,
        args: { [key: string]: string },
        services: Services,
    ) {
        services.state.volatileState.spamDetection.shouldLog[args["channel"]] =
            false;
        const telemetry =
            services.state.volatileState.spamDetection.log[args["channel"]];
        const csvData = [
            "timestamp,channelId,authorId,score,score1,score2,flag1,flag2,flag3,flag4,channel_buffer_length,user_buffer_length",
        ];
        for (const row of telemetry) {
            csvData.push(
                [
                    row.timestamp,
                    row.channelId,
                    row.authorId,
                    row.score,
                    row.score1,
                    row.score2,
                    row.flag1,
                    row.flag2,
                    row.flag3,
                    row.flag4,
                    row.channel_buffer_length,
                    row.user_buffer_length,
                ].join(","),
            );
        }

        const finalData = csvData.join("\n");
        await message.reply({
            content: `${csvData.length} rows exported. collected spam detection telemetry for channel <#${args["channel"]}> is shown below`,
            files: [
                new AttachmentBuilder(Buffer.from(finalData)).setName(
                    `telemetry_${args["channel"]}.csv`,
                ),
            ],
        });
        services.state.volatileState.spamDetection.log[args["channel"]] = [];
    }
}
