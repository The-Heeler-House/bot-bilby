import { ChannelType, Events, Message, TextChannel, ThreadChannel, Webhook, WebhookType } from "discord.js";
import BotEvent from "../BotEvent";
import { roleIds, channelIds } from "../../constants";
import { Services } from "../../Services";
import { isTHHorDevServer } from "../../Helper/EventsHelper";

export default class ThreadCreateEvent extends BotEvent {
    public eventName = Events.ThreadCreate;

    async execute(services: Services, thread: ThreadChannel, newlyCreated: boolean) {
        if (!newlyCreated) return;
        if (!isTHHorDevServer(thread.guild.id)) return;
        if (services.state.state.threadLogging.blacklistedChannels.includes(thread.parentId)) return;

        let threadLog = await thread.guild.channels.fetch(channelIds.threadLog) as TextChannel;

        await threadLog.send({
            embeds: [
                {
                    "description": `**${thread.name}** (<#${thread.id}>) in <#${thread.parentId}>`,
                    "title": "Thread Created",
                    "color": 65283
                }
            ]
        });
    }
}