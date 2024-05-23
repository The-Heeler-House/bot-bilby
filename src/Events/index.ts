import { readdir } from "fs/promises";
import * as logger from "../Logger";
import { Client, Events } from "discord.js";
import BotEvent from "./BotEvent";
import { Services } from "../Services";

export default class EventManager {
    protected events: BotEvent[] = [];

    async registerEvents(client: Client, services: Services) {
        await readdir(`${__dirname}/events`)
            .then(files => files.filter(file => file.endsWith(".js")))
            .then(async eventsDir => {
                for (const eventFile of eventsDir) {
                    const event: BotEvent = new (await import(`${__dirname}/events/${eventFile}`)).default();

                    if ("eventName" in event && "execute" in event) {
                        client.addListener(event.eventName, async (...data) => await event.execute(services, ...(data as [])));
                    } else {
                        logger.warning("Attempted to add event in file", eventFile, "but it is missing either the eventName property or the execute function. Skipping event...");
                    }
                }
            })
            .catch(error => {
                logger.error("Encountered an error when trying to get events directory. See error below.\n", error, "\n", error.stack);
                process.exit(1);
            });
    }
}