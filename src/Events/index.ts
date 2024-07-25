import { readdir } from "fs/promises";
import * as logger from "../logger";
import { Client, ClientEvents } from "discord.js";
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
                        client.on(event.eventName as keyof ClientEvents, async (...data) => {
                            try {
                                await event.execute(services, ...(data as []))
                            } catch(error) {
                                logger.error("Encountered an error while trying to execute event", event.eventName, ". See error below.\n", error.message, "\n", error.stack);
                                await services.pager.sendError(error, "Executing event " + event.eventName, services.state.state.pagedUsers, ...(data as []));
                            }
                        });
                    } else {
                        logger.warning("Attempted to add event in file", eventFile, "but it is missing either the eventName property or the execute function. Skipping event...");
                    }
                }
            })
            .catch(async error => {
                if (error.code === "ENOENT") {
                    logger.warning("No context commands directory found. Skipping context commands.");
                    return;
                }
                logger.error("Encountered an error when trying to get events directory. See error below.\n", error.message, "\n", error.stack);
                await services.pager.sendCrash(error, "Event registration", services.state.state.pagedUsers);
                process.exit(1);
            });
    }
}