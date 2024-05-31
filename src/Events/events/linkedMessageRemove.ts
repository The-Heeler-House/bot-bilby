import { ChannelType, Events, GuildMember, Message, TextChannel } from "discord.js";
import BotEvent, { MessageCreateEventData } from "../BotEvent";
import { THH_SERVER_ID, channelIds } from "../../constants";
import { Services } from "../../Services";
import * as logger from "../../logger";

export default class LinkedMessageRemoveEvent extends BotEvent {
    public eventName = Events.MessageDelete;

    async execute(services: Services, message: Message) {
        if (process.env.DEVELOPMENT_GUILD ? message.guild.id != process.env.DEVELOPMENT_GUILD : message.guild.id != THH_SERVER_ID) return;

        for (const [messageId, trackedMessage] of services.state.state.trackedMessages) {
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
              const messageLink = `https://discord.com/channels/${channel.guildId}/${
                channel.id
              }/${newMessage.first().id}`;
        
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
          }
    }
}