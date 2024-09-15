import { AttachmentBuilder, Client, Message, Snowflake, TextChannel } from "discord.js";
import { channelIds } from "../../constants";

/**
 * Calculate a 32 bit FNV-1a hash
 * Found here: https://gist.github.com/vaiorabbit/5657561
 * Ref.: http://isthe.com/chongo/tech/comp/fnv/
 *
 * @param {string} str the input value
 * @param {boolean} [asString=true] set to true to return the hash value as 
 *     8-digit hex string instead of an integer
 * @param {integer} [seed] optionally pass the hash of the previous chunk
 * @returns {integer | string}
 */
function hashFnv32a(str: string, asString: boolean = true, seed: number = undefined) {
    /*jshint bitwise:false */
    var i, l,
        hval = (seed === undefined) ? 0x811c9dc5 : seed;

    for (i = 0, l = str.length; i < l; i++) {
        hval ^= str.charCodeAt(i);
        hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
    }
    if( asString ){
        // Convert to 8 digit hex string
        return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
    }
    return hval >>> 0;
}

/**
 * Hashes a stack trace, allowing for uniquly identifying this specific error.
 * Internally calls a hashing function twice to lower chances of collisions.
 * @param stack The stack trace to hash.
 */
function hashError(stack: string): string {
    var h1 = hashFnv32a(stack) as string;  // returns 32 bit (as 8 byte hex string)
    return h1 + hashFnv32a(h1 + stack);
}

function serializeBigInt(k: string, v: any) {
    if (typeof v == "bigint") return v.toString()
    else return v
}

export default class PagerService {
    protected client: Client;
    protected loggingChannel: TextChannel;

    private ignoredErrorHashes: string[] = [
        "crash-73a90449a5e619d8", // AbortError crash from Discord.js internals that we cannot catch.
    ];

    constructor(client: Client) {
        client.on("ready", async () => {
            this.client = client;

            this.loggingChannel = await client.channels.fetch(channelIds.bilby) as TextChannel;
        });
    }

    public async sendCrash(error: Error, origin: string, pingList: Snowflake[], data?: any) {
        // This method is designed for paging a complete and total failure of Bot Bilby.
        // If this is called, Bilby has already crashed and there's nothing we can do to prevent it.
        // But before we exit, we send a "crash" page to the bilby channel to allow for debugging.

        let errorHash = hashError(error.stack);

        if (this.ignoredErrorHashes.includes("crash-" + errorHash)) return; // We ignore this error.

        let log = {
            timestamp: new Date().toISOString(),
            error,
            data,
            origin,
            errorHash
        }

        await this.loggingChannel.send({ 
                content: `${pingList.map(userId => `<@${userId}>`).join(" ")} Crash thrown!\n\n` +
                         `**Bot Bilby has crashed. Further information is available below.**\n\n` +
                         `**Message:**\n\`\`\`${error.message}\`\`\`\n\n` +
                         `**Stack Trace:**\n\`\`\`${error.stack}\`\`\`\n` +
                         `**Origin:**\n\`${origin}\`\n` +
                         `**Hash:** \`${errorHash}\``,
                files: [
                    new AttachmentBuilder(Buffer.from(JSON.stringify(log, serializeBigInt)))
                        .setName(`crash_${log.timestamp}.json`)
                        .setDescription("A log of the crash that occured.")
                ]
        });
    }

    public async sendError(error: Error, whileDoing: string, pingList: Snowflake[], data?: any) {
        let errorHash = hashError(error.stack);

        if (this.ignoredErrorHashes.includes("error-" + errorHash)) return; // We ignore this error.

        let log = {
            timestamp: new Date().toISOString(),
            error,
            data,
            whileDoing,
            errorHash
        }

        await this.loggingChannel.send({ 
                content: `${pingList.map(userId => `<@${userId}>`).join(" ")} Error thrown!\n\n` +
                         `**Bot Bilby has encountered an error. More information is available below.**\n\n` +
                         `**Message:**\n\`\`\`${error.message}\`\`\`\n\n` +
                         `**Stack Trace:**\n\`\`\`${error.stack}\`\`\`\n` +
                         `**While:**\n\`${whileDoing}\`\n` +
                         `**Hash:** \`${errorHash}\``,
                files: [
                    new AttachmentBuilder(Buffer.from(JSON.stringify(log, serializeBigInt)))
                        .setName(`error_${log.timestamp}.json`)
                        .setDescription("A log of the error that occured.")
                ]
        });
    }

    public async sendPage(...message: string[]) {
        await this.loggingChannel.send("```\n" + message.join(" ") + "\n```");
    }
}