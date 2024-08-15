import { Client, Events, Message, TextChannel } from "discord.js";
import BotEvent from "../BotEvent";
import { channelIds } from "../../constants";
import { Services } from "../../Services";
import * as logger from "../../logger";
import { isTHHorDevServer } from "../../Helper/EventsHelper";

export default class LinkedMessageRemoveEvent extends BotEvent {
    public eventName = Events.MessageDelete;

    async execute(client: Client, services: Services, message: Message) {
        if (!isTHHorDevServer(message.guild.id)) return;

        services.state.state.trackedMessages.forEach(async (trackedMessage, messageId) => {
            const currentTime = Date.now();
            const timeElapsed = currentTime - trackedMessage.timestamp;
            const expirationTime = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds

            if (timeElapsed >= expirationTime) {
                // Remove the expired tracked message from the map
                const check = services.state.state.trackedMessages.delete(messageId);
                services.state.save();
                if (check) {
                    logger.command(
                    `Tracked message (${messageId}) has expired and was removed from the map.`
                    );
                }
            } else if (messageId === message.id) {
              // Notify the channel about the deletion
                const channel = await message.client.channels.fetch(channelIds.chatLog) as TextChannel;

                const filter = (m: Message) => m.channelId === channelIds.chatLog;

                const newMessage = await channel.awaitMessages({
                    filter,
                    max: 1,
                    time: 30000,
                    errors: ["time"],
                });
                const messageLink = `https://discord.com/channels/${channel.guildId}/${channel.id}/${newMessage.first().id}`;

                const notification = `The linked message by <@${message.author.id}> was deleted. Deleted Message: ${messageLink}.`;
                const finalMessage = await trackedMessage.originalMessage.reply(notification);
                finalMessage.suppressEmbeds(true);

                // Remove the deleted tracked message from the map
                const check = services.state.state.trackedMessages.delete(messageId);
                services.state.save();
                if (check) {
                    logger.command(
                        `Tracked message (${message.id}) was deleted and was removed from the map.`
                    );
                }
            }
        });
    }
}