import { Client, Events, MessageReaction, User } from "discord.js";
import BotEvent from "../BotEvent";
import { Services } from "../../Services";

export default class WaffleReactionAddEvent extends BotEvent {
    public eventName = Events.MessageReactionAdd;

    async execute(client: Client, services: Services, reaction: MessageReaction, user: User) {
        if (!services.waffleHouse.eventState?.eventActive) return;
        await services.waffleHouse.cardManager.handleSpawnReaction(reaction, user, services);
    }
}
