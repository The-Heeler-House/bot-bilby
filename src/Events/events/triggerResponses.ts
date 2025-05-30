import { Client, Events, Message } from "discord.js";
import BotEvent from "../BotEvent";
import { Services } from "../../Services";
import { isTHHorDevServer } from "../../Helper/EventsHelper";
import Trigger from "../../Services/Database/models/trigger";
import { WithId } from "mongodb";
import { processResponse } from "../../Helper/DirectiveHelper";

export default class TriggerResponseEvent extends BotEvent {
    public eventName = Events.MessageCreate;
    private lastTriggered: Map<string, number> = new Map();

    async execute(client: Client, services: Services, message: Message) {
        if (!isTHHorDevServer(message.guildId)) return;
        if (message.content.startsWith(process.env.PREFIX)) return;
        if (message.author.bot) return;

        let triggers = await services.database.collections.triggers.find().toArray() as WithId<Trigger>[];

        let triggerCanidates = triggers.filter(trigger => this.lastTriggered.has(trigger._id.toHexString()) ? Date.now() - this.lastTriggered.get(trigger._id.toHexString()) > (trigger.cooldown * 1000) : true)
            .map(trigger => { return { regexp: new RegExp(trigger.trigger, "").exec(message.content), id: trigger._id, response: trigger.response } })
            .filter(trigger => trigger.regexp != null);

        if (triggerCanidates.length > 0) {
            let trigger = triggerCanidates[0];

            await processResponse(message, trigger, services);

            this.lastTriggered.set(trigger.id.toHexString(), Date.now());
            await services.database.collections.triggers.updateOne({ _id: trigger.id }, {
                $inc: {
                    "meta.uses": 1
                }
            });
        }
    }
}