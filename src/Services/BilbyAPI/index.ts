import { Client, Guild, GuildScheduledEventPrivacyLevel, Status } from "discord.js";
import express, { Request, Response } from "express";
import * as logger from "../../Logger";

export default class BilbyAPIService {
    protected client: Client;
    protected app: express.Express;

    protected caching: Caching = { 
        memberCount: { value: null, lastCacheTimestamp: 0 }, 
        upcomingEvents: { value: [], lastCacheTimestamp: 0 }
    };

    constructor(client: Client) {
        this.app = express();

        client.on("ready", () => {
            this.client = client;
            

            this.app.get("/members", (req, res) => this.serverMembers(req, res));
            this.app.get("/events", (req, res) => this.serverEvents(req, res));

            this.app.listen(process.env.API_PORT, () => logger.bilby("Bilby API running on port", process.env.API_PORT));
        });
    }

    async serverMembers(req: Request, res: Response) {
        if (Date.now() - this.caching.memberCount.lastCacheTimestamp >= 1 * 60 * 1000) {
            this.caching.memberCount.lastCacheTimestamp = Date.now()

            // DEVELOPMENT_GUILD is only set in a development environment, so by default we assume The Heeler House as target guild
            // FIXME: Maybe this shouldn't be hardcoded? Will need a discussion regarding this.
            let guild = await this.client.guilds.fetch(process.env.DEVELOPMENT_GUILD ?? "959534476520730724");
            let allMembers = guild.members.cache;
            let onlineMembers = allMembers.filter((member) => ["online", "idle", "dnd"].includes(member.presence?.status));

            this.caching.memberCount.value = {
                all: allMembers.size,
                online: onlineMembers.size
            }
        }

        res.status(200).send(this.caching.memberCount.value);
    }

    async serverEvents(req: Request, res: Response) {
        if (Date.now() - this.caching.upcomingEvents.lastCacheTimestamp >= 1 * 60 * 1000) {
            this.caching.upcomingEvents.lastCacheTimestamp = Date.now()

            // DEVELOPMENT_GUILD is only set in a development environment, so by default we assume The Heeler House as target guild
            // FIXME: Maybe this shouldn't be hardcoded? Will need a discussion regarding this.
            let guild = await this.client.guilds.fetch(process.env.DEVELOPMENT_GUILD ?? "959534476520730724");
            let events = await guild.scheduledEvents.fetch();
            let upcomingEvents: UpcomingEvents[] = []

            events.forEach((event) => {
                upcomingEvents.push({
                    name: event.name,
                    description: event.description,
                    ongoing: event.scheduledStartTimestamp <= Date.now(),
                    start: event.scheduledStartAt,
                    url: event.url,
                    image: event.coverImageURL()
                });
            });

            this.caching.upcomingEvents.value = upcomingEvents.sort((event_a, event_b) => {
                return event_a.start.getTime() - event_b.start.getTime();
            });
        }

        res.status(200).send(this.caching.upcomingEvents.value);
    }
}

interface Caching {
    memberCount: { value: MemberCounts, lastCacheTimestamp: number},
    upcomingEvents: { value: UpcomingEvents[], lastCacheTimestamp: number }
}

interface MemberCounts {
    all: number,
    online: number
}

interface UpcomingEvents {
    name: string,
    description: string,
    ongoing: boolean
    start: Date,
    url: string,
    image: string
}