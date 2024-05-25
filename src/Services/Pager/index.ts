import { Client, TextChannel } from "discord.js";
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

    public async sendPage(...message: string[]) {
        await this.loggingChannel.send("```\n" + message.join(" ") + "\n```");
    }
}