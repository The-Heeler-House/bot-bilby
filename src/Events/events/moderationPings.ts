import { Client, Events, Message, TextChannel } from "discord.js";
import BotEvent from "../BotEvent";
import { roleIds, channelIds, channelCategoryIds } from "../../constants";
import { Services } from "../../Services";
import { isTHHorDevServer } from "../../Helper/EventsHelper";

export default class ModerationPingEvent extends BotEvent {
    public eventName = Events.MessageCreate;

    async execute(client: Client, services: Services, message: Message) {
        if (!isTHHorDevServer(message.guildId)) return;

        const staffChatChannel = await message.client.channels.fetch(channelIds.staff) as TextChannel;
        const roles = [roleIds.staff, roleIds.mod]

        const ignoreCategory = [
            channelCategoryIds.staffPro,
            channelCategoryIds.leadership,
            channelCategoryIds.staffInfo
        ]

        if (
            roles.map(v => message.mentions.roles.has(v)).reduce((a, b) => a || b) &&
            !message.channel.isDMBased() &&
            !ignoreCategory.includes(message.channel.parentId)
        ) {
            const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
            await staffChatChannel.send(`Staff or Moderator ping detected!\n${messageLink}`);
        }
    }
}