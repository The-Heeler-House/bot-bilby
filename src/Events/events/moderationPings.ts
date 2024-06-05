import { Events, Message, TextChannel } from "discord.js";
import BotEvent from "../BotEvent";
import { roleIds, channelIds } from "../../constants";
import { Services } from "../../Services";
import { isTHHorDevServer } from "../HelperFunction";

export default class ModerationPingEvent extends BotEvent {
    public eventName = Events.MessageCreate;

    async execute(services: Services, message: Message) {
        if (isTHHorDevServer(message.guild.id)) return;

        if (message.mentions.roles.has(roleIds.staff) || message.mentions.roles.has(roleIds.mod)) {
            const staffChatChannel = await message.client.channels.fetch(channelIds.staff) as TextChannel;
            // Send the message link to the #staff-chat channel
            const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
            staffChatChannel.send(`Moderator ping detected!\n${messageLink}`);
        }
    }
}