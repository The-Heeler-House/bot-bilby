import { Client, Events, Message } from "discord.js";
import BotEvent, { customEvents } from "../BotEvent";
import { Services } from "../../Services";
import Denque from "denque"
import { channelIds, roleIds } from "../../constants";
import { isTHHorDevServer } from "../../Helper/EventsHelper";

const messageLog: { [id: string]: Denque<number> } = {}
const mediaLog: { [id: string]: { queue: Denque<number>, cnt: number } } = {}

const sentAlert: { [id: string]: boolean } = {}
const alertCooldown = 15_000
export default class SpamDetection extends BotEvent {
    public eventName = Events.MessageCreate;

    async execute(client: Client, services: Services, message: Message): Promise<void> {
        if (!isTHHorDevServer(message.guildId)) return
        const staffChannel = await message.guild.channels.fetch(channelIds.staff)
        if (!staffChannel.isTextBased()) return

        const channelId = message.channelId
        if (message.author.bot) return
        const spamDetectionData = await services.database.collections.spamDetection.findOne({
            channel: channelId
        })

        if (!spamDetectionData) return
        if (!messageLog[channelId]) {
            messageLog[channelId] = new Denque<number>()
        }

        if (!mediaLog[channelId]) {
            mediaLog[channelId] = {
                queue: new Denque<number>(),
                cnt: 0
            }
        }

        const currentTime = message.createdTimestamp
        const cutoff = currentTime - spamDetectionData.min_message_time * 1_000

        while (!messageLog[channelId].isEmpty() && messageLog[channelId].peekFront() < cutoff) {
            messageLog[channelId].shift()
        }

        messageLog[channelId].push(currentTime)

        if (messageLog[channelId].size() > spamDetectionData.min_message_cnt && !sentAlert[message.channelId]) {
            await staffChannel.send(`<@&${roleIds.staff}> Alert! Messages going faster than usual in <#${message.channelId}> (${messageLog[channelId].size()} messages in ${spamDetectionData.min_message_time}s)`)
            sentAlert[message.channelId] = true
            setTimeout(() => {
                sentAlert[message.channelId] = false
            }, alertCooldown)
        }

        const mediaCnt = Math.ceil((message.attachments.size + message.embeds.length) / 3)
        mediaLog[channelId].cnt += mediaCnt
        mediaLog[channelId].queue.push(message.attachments.size + message.embeds.length)
        if (mediaLog[channelId].queue.size() > spamDetectionData.min_media_sample_size)
            mediaLog[channelId].cnt -= mediaLog[channelId].queue.shift()

        if (mediaLog[channelId].cnt > spamDetectionData.min_media_cnt && !sentAlert[message.channelId]) {
            await staffChannel.send(`<@&${roleIds.staff}> Alert! Possible media spam in <#${message.channelId}> (${mediaLog[channelId].cnt} messages in every ${spamDetectionData.min_media_sample_size} messages)`)
            mediaLog[channelId].queue.clear()
            mediaLog[channelId].cnt = 0
            sentAlert[message.channelId] = true
            setTimeout(() => {
                sentAlert[message.channelId] = false
            }, alertCooldown)
        }
    }
}