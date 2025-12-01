import { Client, Events, Message, MessageFlags, TextChannel } from "discord.js";
import BotEvent, { customEvents } from "../BotEvent";
import { Services } from "../../Services";
import Denque from "denque"
import { channelIds, roleIds } from "../../constants";
import { isTHHorDevServer } from "../../Helper/EventsHelper";

const alertCooldown = 30_000
export default class SpamDetection extends BotEvent {
    public eventName = Events.MessageCreate;

    async execute(client: Client, services: Services, message: Message): Promise<void> {
        const state = () => services.state.volatileState.spamDetection

        if (!isTHHorDevServer(message.guildId)) return
        const staffChannel = await message.guild.channels.fetch(channelIds.staff)
        if (!staffChannel.isTextBased()) return

        const channelId = message.channelId
        if (message.author.bot) return
        const spamDetectionData = await services.database.collections.spamDetection.findOne({
            channel: channelId
        })

        if (!spamDetectionData) return
        if (!state().messageLog[channelId]) {
            state().messageLog[channelId] = new Denque<number>()
        }

        if (!state().mediaLog[channelId]) {
            state().mediaLog[channelId] = {
                queue: new Denque<number>(),
                cnt: 0
            }
        }

        const currentTime = message.createdTimestamp
        const cutoff = currentTime - spamDetectionData.min_message_time * 1_000

        while (!state().messageLog[channelId].isEmpty() && state().messageLog[channelId].peekFront() < cutoff) {
            state().messageLog[channelId].shift()
        }

        state().messageLog[channelId].push(currentTime)

        if (state().messageLog[channelId].size() >= spamDetectionData.min_message_cnt && !state().sentAlert[message.channelId]) {
            await staffChannel.send({
                content: `<@&${roleIds.staff}> Messages going faster than usual in <#${message.channelId}> (${state().messageLog[channelId].size()} messages in ${spamDetectionData.min_message_time}s)`,
                flags: [ MessageFlags.SuppressNotifications ]
            })
            state().sentAlert[message.channelId] = true
            setTimeout(() => {
                state().sentAlert[message.channelId] = false
            }, alertCooldown)
        }

        const mediaCnt = Math.ceil((message.attachments.size + message.embeds.length) / 3)
        state().mediaLog[channelId].cnt += mediaCnt
        state().mediaLog[channelId].queue.push(mediaCnt)
        if (state().mediaLog[channelId].queue.size() > spamDetectionData.min_media_sample_size)
            state().mediaLog[channelId].cnt -= state().mediaLog[channelId].queue.shift()

        if (state().mediaLog[channelId].cnt >= spamDetectionData.min_media_cnt && !state().sentAlert[message.channelId]) {
            if (message.channel instanceof TextChannel) {
                await message.channel.setRateLimitPerUser(5, "Media spam.")
            }
            await staffChannel.send({
                content: `<@&${roleIds.staff}> Possible media spam in <#${message.channelId}> (${state().mediaLog[channelId].cnt} media in every ${spamDetectionData.min_media_sample_size} messages)`,
                flags: [ MessageFlags.SuppressNotifications ]
            })
            state().mediaLog[channelId].queue.clear()
            state().mediaLog[channelId].cnt = 0
            state().sentAlert[message.channelId] = true
            setTimeout(() => {
                state().sentAlert[message.channelId] = false
            }, alertCooldown)
        }
    }
}