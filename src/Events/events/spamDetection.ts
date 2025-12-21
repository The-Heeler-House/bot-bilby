import { Client, Events, Message, MessageFlags, TextChannel } from "discord.js";
import BotEvent, { customEvents } from "../BotEvent";
import { Services } from "../../Services";
import Denque from "denque"
import { channelIds, roleIds } from "../../constants";
import { isTHHorDevServer } from "../../Helper/EventsHelper";

const weight = {
    fast_msg: 2,
    msg_has_media: 1,
    msg_has_only_media: 2,
    burst_media_msg: 3,
    repeated_text: 4,
    short_text: 1,
    burst_text_msg: 3
}

const flags = {
    fastMessaging: 1 << 0,
    hasMedia: 1 << 1,
    hasMedidAndEmptyMessage: 1 << 2,
    burstMedia: 1 << 3,
    shortMessage: 1 << 4,
    burstMessages: 1 << 5
}

const messageStates = new Map<string, Map<string, Denque<Message>>>()
export default class SpamDetection extends BotEvent {
    public eventName = Events.MessageCreate;

    async execute(client: Client, services: Services, message: Message): Promise<void> {
        let finalFlags = 0

        if (!isTHHorDevServer(message.guildId)) return
        const staffChannel = await message.guild.channels.fetch(channelIds.staff)
        if (!staffChannel.isTextBased()) return

        const channelId = message.channelId
        if (message.author.bot) return
        const spamDetectionConf = await services.database.collections.spamDetection.findOne({
            channel: channelId
        })

        if (!spamDetectionConf) return

        const userId = message.author.id
        const now = Date.now() * 1000
        let score = 0

        if (!messageStates.has(channelId)) {
            messageStates.set(channelId, new Map<string, Denque<Message>>())
        }

        const userStates = messageStates.get(channelId)

        if (!userStates.has(userId)) {
            userStates.set(userId, new Denque<Message>())
        }

        const recentUserMsgs = userStates.get(userId)

        //? clean up old messages
        while (!recentUserMsgs.isEmpty()) {
            if (now - recentUserMsgs.peekFront().createdTimestamp > spamDetectionConf.window_ms) {
                recentUserMsgs.shift()
            } else {
                break
            }
        }

        //? how fast messages are sent
        const lastMsg = recentUserMsgs.peekBack()
        if (lastMsg) {
            const delta = now - lastMsg.createdTimestamp
            if (delta < spamDetectionConf.min_delta_ms) {
                finalFlags |= flags.fastMessaging
                score += 2
            }
        }

        if (message.attachments.size > 0) {
            finalFlags |= flags.hasMedia
            score += 1
            if (message.content.length == 0) {
                finalFlags |= flags.hasMedidAndEmptyMessage
                score += 3
            }
            let mediaCount = 0
            for (const msg of recentUserMsgs.toArray()) {
                if (msg.attachments.size > 0) mediaCount++
            }
            if (mediaCount >= 5) {
                finalFlags |= flags.burstMedia
                score += 3
            }
        }

        if (message.content.length > 0) {
            if (message.content.length <= 5) {
                finalFlags |= flags.shortMessage
                score += 1
            }
            let textCount = 0
            for (const msg of recentUserMsgs.toArray()) {
                if (msg.content.length > 0) textCount++
            }
            if (textCount >= 8) {
                finalFlags |= flags.burstMessages
                score += 3
            }
        }

        recentUserMsgs.push(message)
        if (recentUserMsgs.size() > spamDetectionConf.max_recent) {
            recentUserMsgs.shift()
        }

        if (services.state.volatileState.spamDetection.shouldLog[channelId]) {
            services.state.volatileState.spamDetection.log[channelId].push({ timestamp: message.createdTimestamp, flags: finalFlags, wscore: score })
        }
    }
}