import { Client, Events, Message, TextChannel } from "discord.js";
import BotEvent from "../BotEvent";
import { roleIds, channelIds } from "../../constants";
import { Services } from "../../Services";
import { isTHHorDevServer } from "../../Helper/EventsHelper";

export default class LeadershipPingEvent extends BotEvent {
    public eventName = Events.MessageCreate;

    async execute(client: Client, services: Services, message: Message) {
        if (!isTHHorDevServer(message.guildId)) return;
        if (message.author.bot) return;

        const roles = [roleIds.leadership, roleIds.headMod, roleIds.admin];

        if (
            !roles.some(v => message.mentions.roles.has(v)) ||
            message.channel.isDMBased()
        ) return;

        const leadershipPingChannel = await message.client.channels.fetch(channelIds.leadershipPings) as TextChannel;
        const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;

        await leadershipPingChannel.send(`Leadership ping detected!\nPinged by ${message.author}\n${messageLink}`);
    }
}
