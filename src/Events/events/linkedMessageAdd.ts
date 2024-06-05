import { ChannelType, Events, Message, TextChannel } from "discord.js";
import BotEvent from "../BotEvent";
import { channelIds } from "../../constants";
import { Services } from "../../Services";
import * as logger from "../../logger";
import { isTHHorDevServer } from "../../Helper/EventsHelper";

export default class LinkedMessageAddEvent extends BotEvent {
    public eventName = Events.MessageCreate;

    async execute(services: Services, message: Message) {
        if (!isTHHorDevServer(message.guild.id)) return;

        const messageLinks = message.content.match(
            /https?:\/\/discord\.com\/channels\/\d+\/\d+\/\d+/g
        );

        if (messageLinks) {
            for (const link of messageLinks) {
                // Extract channel ID and message ID from the link
                const [, guildId, channelId, messageId] = link.match(
                /https?:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/
                );

                try {
                    if (!isTHHorDevServer(guildId)) continue // Skip if the linked message is NOT from THH or the dev server
                    if (message.author.bot) continue; // Skip if the message author is a bot
                    if (message.channel.id != channelIds.staff) continue; // Skip if the channel is not #staff

                    const channel = await message.client.channels.fetch(channelId);
                    if (!channel) continue; // Skip if the channel is not available
                    if (channel.type !== ChannelType.GuildText) continue; // Skip if the channel is not a text channel

                    const linkedMessage = await channel.messages.fetch(messageId);

                    // Store the message information for tracking
                    const trackedMessage = {
                        originalMessage: message,
                        originalLink: link,
                        guildId,
                        channelId,
                        messageId,
                        content: linkedMessage.content,
                        author: linkedMessage.author.tag,
                        timestamp: Date.now(), // Add timestamp to track when the message was linked
                    };

                    logger.command("New linked message: " + trackedMessage.content);

                    // Add the tracked message to the map
                    services.state.state.trackedMessages.set(trackedMessage.messageId, trackedMessage);
                    services.state.save();
                } catch (error) {
                    if (error.code === 50001) { // Missing access
                        const notifChannel = await message.client.channels.fetch(channelIds.bilby) as TextChannel;
                        notifChannel.send(`${link}. I can't seem to see that channel, so I can't track that message. Sorry!`);
                        logger.warning("Tried tracking message id", messageId, "in channel id", channelId, "but lacked required permissions.");
                    } else {
                        logger.error(error);
                    }
                }
            }
        }
    }
}