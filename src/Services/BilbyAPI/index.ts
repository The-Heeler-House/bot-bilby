import { Client, Guild, GuildScheduledEventPrivacyLevel, Status } from "discord.js";
import express from "express";
import * as logger from "../../Logger";

export default class BilbyAPIService {
    protected client: Client;
    protected guild: Guild;
    protected app: express.Express;

    constructor(client: Client) {
        this.app = express();

        client.on("ready", () => {
            this.client = client;
            this.client.guilds.fetch(process.env.DEVELOPMENT_GUILD ?? "959534476520730724").then(guild => this.guild = guild);

            this.app.get("/members", (req, res) => this.serverMembers(req, res));
            this.app.get("/events", (req, res) => this.serverEvents(req, res));

            this.app.listen(process.env.API_PORT, () => logger.bilby("Bilby API running on port", process.env.API_PORT));
        });
    }

    async serverMembers(req, res) {
        let allMembers = this.guild.members.cache;
        let onlineMembers = allMembers.filter((member) => ["online", "idle", "dnd"].includes(member.presence?.status));

        res.status(200).send({
            all: allMembers.size,
            online: onlineMembers.size
        });
    }

    async serverEvents(req, res) {
        let events = await this.guild.scheduledEvents.fetch();
        
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

        res.status(200).send(upcomingEvents.sort((eventa, eventb) => {
            return eventa.start.getTime() - eventb.start.getTime();
        }));
    }
}

interface UpcomingEvents {
    name: string,
    description: string,
    ongoing: boolean
    start: Date,
    url: string,
    image: string
}