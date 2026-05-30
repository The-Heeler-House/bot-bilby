import { Client, Events, Message, MessageFlags, TextChannel } from "discord.js";
import BotEvent, { customEvents } from "../BotEvent";
import { Services } from "../../Services";
import Denque from "denque";
import { channelIds, roleIds } from "../../constants";
import { isTHHorDevServer } from "../../Helper/EventsHelper";

type LoggedMessage = {
    timestamp: number;
    score: number;
};

type Metadata = {
    queue: Denque<LoggedMessage>;
    score: number;
};

const waiTillNextWarning = 15_000;
let lastWarningTime: number | undefined;

const weight = {
    fast_msg: 15,
    msg_has_media: 35,
    msg_has_only_media: 50,
    // repeated_text: 4,
    // short_text: 1,
    long_msg: 10,
    // burst_text_msg: 3,
};

const flags = {
    fastMessaging: 1 << 0,
    hasMedia: 1 << 1,
    hasMediaAndEmptyMessage: 1 << 2,
    longMessage: 1 << 3,
};

const userStates = new Map<string, Map<string, Metadata>>();
const channelStates = new Map<string, Metadata>();

export default class SpamDetection extends BotEvent {
    public eventName = Events.MessageCreate;

    async execute(
        client: Client,
        services: Services,
        message: Message,
    ): Promise<void> {
        if (!isTHHorDevServer(message.guildId)) return;
        const staffChannel = await message.guild.channels.fetch(
            channelIds.staff,
        );
        if (!staffChannel.isTextBased()) return;

        const channelId = message.channelId;
        if (message.author.bot) return;
        const spamDetectionConf =
            await services.database.collections.spamDetection.findOne({
                channel: channelId,
            });

        if (!spamDetectionConf) return;

        if (!channelStates.has(channelId)) {
            channelStates.set(channelId, {
                score: 0,
                queue: new Denque<LoggedMessage>(),
            });
        }
        const channelQueue = channelStates.get(channelId);
        const now = Date.now();
        const userId = message.author.id;

        if (!userStates.has(channelId)) {
            userStates.set(channelId, new Map<string, Metadata>());
        }
        const userQueue = userStates.get(channelId);
        if (!userQueue) return;
        if (!userQueue.has(userId)) {
            userQueue.set(userId, {
                score: 0,
                queue: new Denque<LoggedMessage>(),
            });
        }
        const userChannelQueue = userQueue.get(userId);
        if (!userChannelQueue) return;

        while (
            channelQueue.queue.length > 0 &&
            channelQueue.queue.peekFront().timestamp <
                now - spamDetectionConf.window_ms
        ) {
            const removed = channelQueue.queue.shift();
            channelQueue.score -= removed.score;
        }
        while (
            userChannelQueue.queue.length > 0 &&
            userChannelQueue.queue.peekFront().timestamp <
                now - spamDetectionConf.window_ms
        ) {
            const removed = userChannelQueue.queue.shift();
            userChannelQueue.score -= removed.score;
        }

        if (
            channelQueue.score > spamDetectionConf.score_threshold ||
            userChannelQueue.score > spamDetectionConf.score_threshold
        ) {
            if (lastWarningTime && now - lastWarningTime < waiTillNextWarning) {
            } else {
                lastWarningTime = now;
                await staffChannel.send({
                    content: `<@&1073391142881722400> Possible media/message spam in <#${channelId}>.`,
                    flags: MessageFlags.SuppressNotifications,
                });
            }
        }

        let calculatedScore = 0;
        let flag = 0;

        if (message.attachments.size > 0) {
            if (message.content.trim().length <= 2) {
                calculatedScore += weight.msg_has_only_media;
                flag |= flags.hasMediaAndEmptyMessage;
            } else {
                calculatedScore += weight.msg_has_media;
                flag |= flags.hasMedia;
            }
        }
        if (message.content.length > 200) {
            // note: magic number, may need to adjust
            calculatedScore += weight.long_msg;
            flag |= flags.longMessage;
        }
        if (
            channelQueue.queue.peekBack() &&
            channelQueue.queue.peekBack().timestamp >
                now - spamDetectionConf.min_delta_ms
        ) {
            calculatedScore += weight.fast_msg;
            flag |= flags.fastMessaging;
        }

        channelQueue.queue.push({
            timestamp: message.createdTimestamp,
            score: calculatedScore,
        });
        userChannelQueue.queue.push({
            timestamp: message.createdTimestamp,
            score: calculatedScore,
        });
        channelQueue.score += calculatedScore;
        userChannelQueue.score += calculatedScore;

        if (
            services.state.volatileState.spamDetection.shouldLog[
                message.channelId
            ]
        ) {
            services.state.volatileState.spamDetection.log[
                message.channelId
            ].push({
                timestamp: message.createdTimestamp,
                channelId: message.channelId,
                authorId: message.author.id,
                flag1: flag & flags.fastMessaging,
                flag2: flag & flags.hasMedia,
                flag3: flag & flags.hasMediaAndEmptyMessage,
                flag4: flag & flags.longMessage,
                score: calculatedScore,
                score1: channelQueue.score,
                score2: userChannelQueue.score,
            });
        }
    }
}
