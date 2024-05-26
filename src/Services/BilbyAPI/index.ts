import { Client, Guild, GuildScheduledEventPrivacyLevel, Status } from "discord.js";
import express, { Request, Response } from "express";
import { THH_SERVER_ID } from "../../constants";
import * as logger from "../../logger";

export default class BilbyAPIService {
    protected client: Client;
    protected app: express.Express;

    protected caching: Caching = {
        memberCount: { value: null, lastCacheTimestamp: 0 },
        upcomingEvents: { value: [], lastCacheTimestamp: 0 }
    };

    constructor(client: Client) {
        this.app = express();

        this.app.use((req, res, next) => {
            res.set("Access-Control-Allow-Origin", "*");
            next();
        });

        client.on("ready", async () => {
            this.client = client;

            // DEVELOPMENT_GUILD is only set in a development environment, so by default we assume The Heeler House as target guild
            // FIXME: Maybe this shouldn't be hardcoded? Will need a discussion regarding this.
            let guild = await this.client.guilds.fetch(process.env.DEVELOPMENT_GUILD ?? THH_SERVER_ID);

            this.app.get("/members", async (req, res) => await this.serverMembers(guild, req, res));
            this.app.get("/events", async (req, res) => await this.serverEvents(guild, req, res));

            this.app.listen(process.env.API_PORT, () => logger.bilby("Bilby API running on port", process.env.API_PORT));
        });
    }

    async serverMembers(guild: Guild, _req: Request, res: Response) {
        if (Date.now() - this.caching.memberCount.lastCacheTimestamp >= 1 * 60 * 1000) {
            this.caching.memberCount.lastCacheTimestamp = Date.now()

            let allMembers = guild.members.cache;
            let onlineMembers = allMembers.filter((member) => ["online", "idle", "dnd"].includes(member.presence?.status));

            this.caching.memberCount.value = {
                all: allMembers.size,
                online: onlineMembers.size
            }
        }

        res.status(200).send(this.caching.memberCount.value);
    }

    async serverEvents(guild: Guild, _req: Request, res: Response) {
        if (Date.now() - this.caching.upcomingEvents.lastCacheTimestamp >= 1 * 60 * 1000) {
            this.caching.upcomingEvents.lastCacheTimestamp = Date.now()

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