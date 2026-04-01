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
    private static readonly TRIGGER_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

    // Clean up old trigger cache entries to prevent memory leaks
    private cleanupLastTriggered() {
        const now = Date.now();
        for (const [key, timestamp] of this.lastTriggered.entries()) {
            if (now - timestamp > TriggerResponseEvent.TRIGGER_CACHE_TTL) {
                this.lastTriggered.delete(key);
            }
        }
    }

    async execute(client: Client, services: Services, message: Message) {
        // Clean up cache before processing
        this.cleanupLastTriggered();

        if (!isTHHorDevServer(message.guildId)) return;
        if (message.content.startsWith(process.env.PREFIX)) return;
        if (message.author.bot) return;

        let triggers = (await services.database.collections.triggers
            .find()
            .toArray()) as WithId<Trigger>[];

        // Regex validation helper
        function isSafeRegex(pattern: string): boolean {
            // Disallow catastrophic backtracking patterns and very long patterns
            if (!pattern || pattern.length > 256) return false;
            // Disallow nested quantifiers (e.g., (a+)+)
            if (/\([^\)]*[\*\+][^\)]*\)[\*\+]/.test(pattern)) return false;
            // Disallow lookbehinds (which can be slow in some JS engines)
            if (/\(\?<\=|\(\?<!/.test(pattern)) return false;
            // Disallow patterns with excessive alternations
            if ((pattern.match(/\|/g) || []).length > 10) return false;
            return true;
        }

        let triggerCanidates = triggers
            .filter((trigger) =>
                this.lastTriggered.has(trigger._id.toHexString())
                    ? Date.now() -
                          this.lastTriggered.get(trigger._id.toHexString()) >
                      trigger.cooldown * 1000
                    : true,
            )
            .map((trigger) => {
                if (!isSafeRegex(trigger.trigger)) return null;
                try {
                    return {
                        regexp: new RegExp(trigger.trigger, "").exec(
                            message.content,
                        ),
                        id: trigger._id,
                        response: trigger.response,
                    };
                } catch (e) {
                    // Invalid regex, skip
                    return null;
                }
            })
            .filter((trigger) => trigger && trigger.regexp != null);

        if (triggerCanidates.length > 0) {
            let trigger = triggerCanidates[0];

            await processResponse(message, trigger, services);

            this.lastTriggered.set(trigger.id.toHexString(), Date.now());
            await services.database.collections.triggers.updateOne(
                { _id: trigger.id },
                {
                    $inc: {
                        "meta.uses": 1,
                    },
                },
            );
        }
    }
}
