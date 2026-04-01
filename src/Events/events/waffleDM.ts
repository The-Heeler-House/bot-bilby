import { ChannelType, Client, Events, Message } from "discord.js";
import BotEvent from "../BotEvent";
import { Services } from "../../Services";

export default class WaffleDMEvent extends BotEvent {
    public eventName = Events.MessageCreate;

    async execute(client: Client, services: Services, message: Message) {
        if (message.author.bot) return;
        if (message.channel.type !== ChannelType.DM) return;
        if (!services.waffleHouse.eventState?.eventActive) return;
        await services.waffleHouse.minigameManager.handleDirectMessage(message, services);
    }
}
