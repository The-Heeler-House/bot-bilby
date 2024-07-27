import { ChannelType, Events, Message, MessageType, TextChannel, ThreadChannel, Webhook, WebhookType } from "discord.js";
import BotEvent from "../BotEvent";
import { roleIds, channelIds } from "../../constants";
import { Services } from "../../Services";
import { isTHHorDevServer } from "../../Helper/EventsHelper";

export default class ThreadMessageEvent extends BotEvent {
    public eventName = Events.MessageCreate;

    async execute(services: Services, message: Message) {
        if (!isTHHorDevServer(message.guild.id)) return;
        if (![ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread].includes(message.channel.type)) return;
        if (services.state.state.threadLogging.blacklistedChannels.includes((message.channel as ThreadChannel).parentId)) return;
        if (services.state.state.threadLogging.blacklistedThreads.includes(message.channel.id)) return;

        let threadLog = await message.guild.channels.fetch(channelIds.threadLog) as TextChannel;

        let webhooks = await threadLog.fetchWebhooks();

        let webhooksWeOwn = webhooks.filter(webhook => webhook.applicationId == message.client.user.id);

        let webhook: Webhook<WebhookType.Incoming> = null;

        if (webhooksWeOwn.size == 0) {
            // Webhook doesn't exist.
            webhook = await threadLog.createWebhook({
                name: "Thread Log Webhook"
            });
        } else {
            webhook = webhooksWeOwn.first() as Webhook<WebhookType.Incoming>;
        }

        let embeds = [];

        if (message.type == MessageType.Reply) {
            let repliedMessage = await message.fetchReference();

            embeds.push({
                "description": repliedMessage.content,
                "color": 5329233,
                "author": {
                    "name": repliedMessage.member.displayName,
                    "icon_url": repliedMessage.member.displayAvatarURL()
                },
                "timestamp": repliedMessage.createdAt
            });
        }

        await webhook.send({
            content: message.content,
            components: [
                {
                    "type": 1,
                    "components": [
                        {
                            "type": 2,
                            "style": 5,
                            "label": "Jump to message",
                            "url": message.url,
                            "disabled": false
                        }
                    ]
                }
            ],
            embeds,
            files: message.attachments.map(attachment => attachment.url),
            username: message.member.displayName,
            avatarURL: message.member.displayAvatarURL()
        });
    }
}