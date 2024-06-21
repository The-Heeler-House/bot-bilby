import { Events, Message, TextChannel } from "discord.js";
import BotEvent from "../BotEvent";
import { Services } from "../../Services";
import { isTHHorDevServer } from "../../Helper/EventsHelper";
import AutoResponse from "../../Services/Database/models/triggers";
import { ObjectId } from "mongodb";
import moment from "moment-timezone"

function processDirectives(args: string[]): string {
    const command = args[0], argv = args.slice(1)
    let output = ""
    switch (command) {
        /*
        ? ${cur_time;<iana_timezone>?;<moment.js_format>?}
        */
        case "cur_time":
            let defaultTz = Intl.DateTimeFormat().resolvedOptions().timeZone
            let defaultFormat = "LTS"
            output = moment()
                .tz(argv[0] ?? defaultTz)
                .format(argv[1] ?? defaultFormat)
            break
    }
    return output
}

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
            let response = trigger.response
            response = response.replace(/\{(.+?)}/gi, (_, x) => {
                const args = x.split(";")
                return processDirectives(args)
            })

            message.channel.send(response);
            this.lastTriggered.set(trigger.id, Date.now());
            await services.database.collections.triggers.updateOne({ id: trigger.id }, {
                $inc: {
                    "meta.uses": 1
                }
            });
        }
    }
}