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

/**
 * Turns an Error into a plain object that survives JSON.stringify.
 *
 * Error's name/message/stack are non-enumerable, so `JSON.stringify({ error })`
 * produces `{"error":{}}` and the attached log file ends up containing nothing.
 * This walks the useful fields explicitly, follows the `cause` chain, and picks
 * up any extra own properties the thrower attached.
 */
function serializeError(error: any, depth: number = 0): any {
    if (error === null || error === undefined) return error;
    if (typeof error !== "object") return { value: String(error) };
    if (depth > 4) return { truncated: true };

    const serialized: Record<string, any> = {
        name: error.name,
        message: error.message,
        stack: error.stack
    };

    if (error.code !== undefined) serialized.code = error.code;
    if (error.status !== undefined) serialized.status = error.status;
    if (error.url !== undefined) serialized.url = error.url;
    if (error.method !== undefined) serialized.method = error.method;
    if (error.cause !== undefined) serialized.cause = serializeError(error.cause, depth + 1);

    for (const key of Object.keys(error)) {
        if (!(key in serialized)) serialized[key] = error[key];
    }

    return serialized;
}

/**
 * Builds the string an error is fingerprinted on. Prefers the stack so existing
 * hashes in ignoredErrorHashes keep matching, but falls back to name + message
 * for errors thrown without a stack, which would otherwise crash the hasher.
 */
function errorFingerprint(error: any): string {
    if (typeof error?.stack === "string" && error.stack.length > 0) return error.stack;
    return `${error?.name ?? "Error"}: ${error?.message ?? String(error)}`;
}

/**
 * Extra human-readable context for errors whose own message explains nothing.
 * Returns null when the error already speaks for itself.
 */
function explainError(error: any): string | null {
    if (error?.name === "AbortError") {
        return "A Discord REST request took longer than the configured REST timeout and was aborted after " +
               "its retries were exhausted. The stack trace above points at the abort timer inside " +
               "@discordjs/rest, not at the code that made the request, because the async context is lost " +
               "by the time the timer fires. Check the `data` field and the surrounding logs for what Bilby " +
               "was doing. Usually this means Discord's API was slow or the network dropped.";
    }

    return null;
}

export default class PagerService {
    protected client: Client;
    protected loggingChannel: TextChannel;

    private ignoredErrorHashes: string[] = [
        "crash-73a90449a5e619d8", // AbortError crash from Discord.js internals that we cannot catch.
        "crash-11fa3099c9c7aedf"
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

        let errorHash = hashError(errorFingerprint(error));

        if (this.ignoredErrorHashes.includes("crash-" + errorHash)) return false; // We ignore this error.

        let log = {
            timestamp: new Date().toISOString(),
            error: serializeError(error),
            data,
            origin,
            errorHash
        }

        const explanation = explainError(error);

        await this.loggingChannel.send({
                content: `${pingList.map(userId => `<@${userId}>`).join(" ")} Crash thrown!\n\n` +
                         `**Bot Bilby has crashed. Further information is available below.**\n\n` +
                         `**Message:**\n\`\`\`${error.name ?? "Error"}: ${error.message || "(no message)"}\`\`\`\n\n` +
                         (explanation ? `**What this means:**\n${explanation}\n\n` : "") +
                         `**Stack Trace:**\n\`\`\`${error.stack ?? "(no stack trace)"}\`\`\`\n` +
                         `**Origin:**\n\`${origin}\`\n` +
                         `**Hash:** \`${errorHash}\``,
                files: [
                    new AttachmentBuilder(Buffer.from(JSON.stringify(log, serializeBigInt)))
                        .setName(`crash_${log.timestamp}.json`)
                        .setDescription("A log of the crash that occured.")
                ]
        });

        return true
    }

    public async sendError(error: Error, whileDoing: string, pingList: Snowflake[], data?: any) {
        let errorHash = hashError(errorFingerprint(error));

        if (this.ignoredErrorHashes.includes("error-" + errorHash)) return; // We ignore this error.

        let log = {
            timestamp: new Date().toISOString(),
            error: serializeError(error),
            data,
            whileDoing,
            errorHash
        }

        const explanation = explainError(error);

        await this.loggingChannel.send({
                content: `${pingList.map(userId => `<@${userId}>`).join(" ")} Error thrown!\n\n` +
                         `**Bot Bilby has encountered an error. More information is available below.**\n\n` +
                         `**Message:**\n\`\`\`${error.name ?? "Error"}: ${error.message || "(no message)"}\`\`\`\n\n` +
                         (explanation ? `**What this means:**\n${explanation}\n\n` : "") +
                         `**Stack Trace:**\n\`\`\`${error.stack ?? "(no stack trace)"}\`\`\`\n` +
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