import { Client, Events, Message } from "discord.js";
import BotEvent from "../BotEvent";
import { Services } from "../../Services";
import { isTHHorDevServer } from "../../Helper/EventsHelper";

export default class WaffleScoringEvent extends BotEvent {
    public eventName = Events.MessageCreate;

    async execute(client: Client, services: Services, message: Message) {
        if (message.author.bot) return;
        if (!message.guildId || !isTHHorDevServer(message.guildId)) return;
        if (!services.waffleHouse.eventState?.eventActive) return;
        await services.waffleHouse.scoringEngine.evaluate(message, services);
        await services.waffleHouse.cardManager.handleSpawnMessage(message, services);
    }
}
