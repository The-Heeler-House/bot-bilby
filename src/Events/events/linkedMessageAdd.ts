import { ChannelType, Events, GuildMember, Message, TextChannel } from "discord.js";
import BotEvent, { MessageCreateEventData } from "../BotEvent";
import { THH_SERVER_ID, channelIds } from "../../constants";
import { Services } from "../../Services";
import * as logger from "../../logger";

export default class LinkedMessageAddEvent extends BotEvent {
    public eventName = Events.MessageCreate;

    async execute(services: Services, message: Message) {
        if (process.env.DEVELOPMENT_GUILD ? message.guild.id != process.env.DEVELOPMENT_GUILD : message.guild.id != THH_SERVER_ID) return;

        const messageLinks = message.content.match(
            /https?:\/\/discord\.com\/channels\/\d+\/\d+\/\d+/g
          );
        
          if (messageLinks) {
            for (const link of messageLinks) {
              // Extract channel ID and message ID from the link
              const [, guildId, channelId, messageId] = link.match(
                /https?:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/
              );
        
              const channel = await message.client.channels.fetch(channelId);
              if (!channel) continue; // Skip if the channel is not available
              if (channel.type !== ChannelType.GuildText) continue; // Skip if the channel is not a text channel
              if (message.author.bot) continue; // Skip if the message author is a bot
              if (message.channel.id != channelIds.staff) continue; // Skip if the channel is not #staff
        
              try {
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
                const newChannel = await message.client.channels.fetch(channelIds.chatLog) as TextChannel;
                newChannel.send(`New linked message added.`);
                // Add the tracked message to the map
                services.state.state.trackedMessages.set(trackedMessage.messageId, trackedMessage);
              } catch (error) {
                logger.error(error);
              }
            }
        }
    }
}