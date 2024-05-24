import { Events, GuildMember, Message, TextChannel } from "discord.js";
import BotEvent, { MessageCreateEventData } from "../BotEvent";
import { THH_SERVER_ID, roleIds, channelIds } from "../../constants";
import { Services } from "../../Services";
import * as logger from "../../logger";

export default class ModerationPingEvent extends BotEvent {
    public eventName = Events.MessageCreate;

    async execute(services: Services, message: Message) {
        if (process.env.DEVELOPMENT_GUILD ? message.guild.id != process.env.DEVELOPMENT_GUILD : message.guild.id != THH_SERVER_ID) return;

        if (message.mentions.roles.has(roleIds.staff) || message.mentions.roles.has(roleIds.mod)) {
            const staffChatChannel = await message.client.channels.fetch(channelIds.staff) as TextChannel;
            // Send the message link to the #staff-chat channel
            const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
            staffChatChannel.send(`Moderator ping detected!\n${messageLink}`);
        }
    }
}