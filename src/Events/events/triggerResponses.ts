import { Events, Message, TextChannel } from "discord.js";
import BotEvent from "../BotEvent";
import { Services } from "../../Services";
import { isTHHorDevServer } from "../../Helper/EventsHelper";
import Trigger from "../../Services/Database/models/trigger";
import { ObjectId, WithId } from "mongodb";
import { processResponse } from "../../Helper/DirectiveHelper";

export default class TriggerResponseEvent extends BotEvent {
    public eventName = Events.MessageCreate;
    private lastTriggered: Map<string, number> = new Map();

    async execute(services: Services, message: Message) {
        if (!isTHHorDevServer(message.guild.id)) return;
        if (message.content.startsWith(process.env.PREFIX)) return;
        if (message.author.bot) return;

        let triggers = await services.database.collections.triggers.find().toArray() as WithId<Trigger>[];

        let triggerCandidates = triggers
            .filter(trigger =>
                this.lastTriggered.has(trigger._id.toHexString())
                    ? Date.now() - this.lastTriggered.get(trigger._id.toHexString()) > (trigger.cooldown * 1000)
                    : true
            )
            .map(trigger => ({
                regexp: new RegExp(trigger.trigger, "").exec(message.content),
                id: trigger._id,
                response: trigger.response,
                attachments: trigger.attachmentIds
            }))
            .filter(trigger => trigger.regexp != null);

        if (triggerCandidates.length > 0) {
            let trigger = triggerCandidates[0];

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