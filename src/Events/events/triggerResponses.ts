import { Events, Message, TextChannel } from "discord.js";
import BotEvent from "../BotEvent";
import { Services } from "../../Services";
import { isTHHorDevServer } from "../../Helper/EventsHelper";
import AutoResponse from "../../Services/Database/models/triggers";
import { ObjectId } from "mongodb";
import { processResponse } from "../../Helper/DirectiveHelper";

export default class TriggerResponseEvent extends BotEvent {
    public eventName = Events.MessageCreate;
    private lastTriggered: Map<ObjectId, number> = new Map();

    async execute(services: Services, message: Message) {
        if (!isTHHorDevServer(message.guild.id)) return;
        if (message.content.startsWith(process.env.PREFIX)) return;
        if (message.author.bot) return;

        let triggers = await services.database.collections.triggers.find().toArray() as unknown as AutoResponse[];

        let triggerCanidates = triggers.filter(trigger => this.lastTriggered.has(trigger.id) ? Date.now() - this.lastTriggered.get(trigger.id) > (trigger.cooldown * 1000) : true)
            .map(trigger => { return { regexp: new RegExp(trigger.trigger, "").exec(message.content), id: trigger.id, response: trigger.response } })
            .filter(trigger => trigger.regexp != null);

        if (triggerCanidates.length > 0) {
            let trigger = triggerCanidates[0];

            // TODO: Do scripting logic.
            await processResponse(message, trigger, services);

            this.lastTriggered.set(trigger.id, Date.now());
            await services.database.collections.triggers.updateOne({ id: trigger.id }, {
                $inc: {
                    "meta.uses": 1
                }
            });
        }
    }
}