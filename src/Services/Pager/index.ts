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
        await this.loggingChannel.send(`${pingList.map(userId => `<@${userId}>`).join(" ")} Crash thrown!\n\n` +
            `**Bot Bilby has crashed. Further information is available below.**\n\n` +
            `**Message:**\n\`\`\`${error.message}\`\`\`\n\n` +
            `**Stack Trace:**\n\`\`\`${error.stack}\`\`\`\n` +
            `**Origin:**\n\`${origin}\``);
    }

    public async sendError(error: Error, whileDoing: string, pingList: Snowflake[]) {
        await this.loggingChannel.send(`${pingList.map(userId => `<@${userId}>`).join(" ")} Error thrown!\n\n` +
            `**Bot Bilby has encountered an error. More information is available below.**\n\n` +
            `**Message:**\n\`\`\`${error.message}\`\`\`\n\n` +
            `**Stack Trace:**\n\`\`\`${error.stack}\`\`\`\n` +
            `**While:**\n\`${whileDoing}\``);
    }

    public async sendPage(...message: string[]) {
        await this.loggingChannel.send("```\n" + message.join(" ") + "\n```");
    }
}