import { AttachmentBuilder, Message, MessageFlags } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { devIds, roleIds } from "../../constants";

const API_PATH = `https://discord.com/api/v10/guilds/{guildId}/messages/search?content={emojiName}`;
const UPDATE_RATE = 3000;

/**
 * Fetches from the Discord API with automatic rate limit handling.
 * Respects X-RateLimit-Reset-After header and retries on 429 responses.
 */
async function fetchWithRateLimit(
    url: string,
    options: RequestInit,
    maxRetries: number = 3,
): Promise<Response> {
    let retries = 0;

    while (retries < maxRetries) {
        const response = await fetch(url, options);

        // Check for rate limit response
        if (response.status === 429) {
            const retryAfter = response.headers.get("Retry-After");
            const jsonContent = await response.json();

            const waitTime = Math.ceil(
                Math.max(
                    parseFloat(retryAfter) + 1,
                    jsonContent.retry_after + 1,
                ) * 1000,
            ); // Convert to milliseconds
            console.warn(
                `⚠️ Rate limited. Waiting ${waitTime}ms before retry... Raw JSON content was `,
                jsonContent,
                `\nRetry-After returned ${retryAfter}`,
            );

            // Wait for the specified duration
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            retries++;
            continue;
        }

        if (Math.floor(response.status / 100) === 4) {
            throw new Error(
                `HTTP error ${response.status}: ${response.statusText}`,
            );
        }

        return response;
    }

    throw new Error(
        `Failed to fetch from Discord API after ${maxRetries} retries due to rate limiting`,
    );
}

function epochToId(epoch: number) {
    return BigInt(epoch * 1000 - 1420070400000) << 22n;
}

export default class QueryEmojisCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("query emojis")
        .setDescription("Perform a query on emojis within the server")
        .addAllowedRoles(roleIds.leadership)
        .addNumberArgument("from", "Epoch time to start querying from.", false)
        .addNumberArgument("to", "Epoch time to stop querying at.", false)
        .addAllowedUsers(...devIds)
        .allowInDMs(false);

    async execute(
        message: Message,
        args: { [key: string]: string },
        services: Services,
    ) {
        let startTime = Date.now();
        let curTime = Date.now();

        const statusMessage = await message.reply("🔃 Querying emojis...");

        const emojis = message.guild.emojis.cache;
        let queried = 0;
        let data = ["id, emoji_name, usage"];
        for (const [id, emoji] of emojis) {
            let url = API_PATH.replace("{guildId}", message.guild.id).replace(
                "{emojiName}",
                emoji.name,
            );

            if (args["from"]) {
                url += `&min_id=${epochToId(Number(args["from"]))}`;
            }
            if (args["to"]) {
                url += `&max_id=${epochToId(Number(args["to"]))}`;
            }

            const res = await fetchWithRateLimit(url, {
                headers: {
                    Authorization: `Bot ${process.env.TOKEN}`,
                },
            });

            const json = await res.json();
            data.push(`${emoji.id}, ${emoji.name}, ${json.total_results}`);
            if (Date.now() - curTime > UPDATE_RATE) {
                await statusMessage.edit({
                    content: `🔃 Querying emojis... ${emojis.size - queried}/${emojis.size} emojis left.`,
                });
                curTime = Date.now();
            }
            queried++;
        }

        await statusMessage.edit({
            content: `✅ Finished querying emojis in ${Date.now() - startTime}ms.`,
        });
        await message.reply({
            files: [
                new AttachmentBuilder(Buffer.from(data.join("\n")), {
                    name: "emojis_usage.csv",
                }),
            ],
        });
    }
}
