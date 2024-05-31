import { Client, Snowflake, TextChannel } from "discord.js";
import { channelIds } from "../../constants";

export default class PagerService {
    protected client: Client;
    protected loggingChannel: TextChannel;

    constructor(client: Client) {
        client.on("ready", async () => {
            this.client = client;

            this.loggingChannel = await client.channels.fetch(channelIds.bilby) as TextChannel;
        });
    }

    public async sendCrash(error: Error, origin: string, pingList: Snowflake[]) {
        // This method is designed for paging a complete and total failure of Bot Bilby.
        // If this is called, Bilby has already crashed and there's nothing we can do to prevent it.
        // But before we exit, we send a "crash" page to the bilby channel to allow for debugging.
        await this.loggingChannel.send({
            "content": `${pingList.map(userId => `<@${userId}>`).join(" ")} Crash thrown!`,
            "embeds": [
                {
                    "color": 15879747,
                    "timestamp": new Date().toISOString(),
                    "footer": {
                        "text": "Crash occured at"
                    },
                    "title": "Bot Bilby has crashed.",
                    "description": "Bot Bilby has encountered an error and has crashed. Further information is available below.",
                    "fields": [
                        {
                            "name": "Message",
                            "value": `${error.message}`,
                            "inline": false
                        },
                        {
                            "name": "Stack Trace",
                            "value": `${error.stack}`,
                            "inline": false
                        },
                        {
                            "name": "Origin",
                            "value": `${origin}`,
                            "inline": false
                        }
                    ]
                }
            ]
        });
    }

    public async sendError(error: Error, whileDoing: string, pingList: Snowflake[]) {
        await this.loggingChannel.send({
            "content": `${pingList.map(userId => `<@${userId}>`).join(" ")} Error thrown!`,
            "embeds": [
                {
                    "color": 15695665,
                    "timestamp": new Date().toISOString(),
                    "footer": {
                        "text": "Error occured at"
                    },
                    "title": "Bot Bilby has encountered error.",
                    "description": "Bot Bilby has encountered an error. More information is available below.",
                    "fields": [
                        {
                            "name": "Message",
                            "value": `${error.message}`,
                            "inline": false
                        },
                        {
                            "name": "Stack Trace",
                            "value": `${error.stack}`,
                            "inline": false
                        },
                        {
                            "name": "While",
                            "value": `${whileDoing}`,
                            "inline": false
                        }
                    ]
                }
            ]
        })
    }

    public async sendPage(...message: string[]) {
        await this.loggingChannel.send("```\n" + message.join(" ") + "\n```");
    }
}