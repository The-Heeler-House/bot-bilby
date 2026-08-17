// TODO: Functional Discord bot please!
import * as dotenv from "dotenv";
dotenv.config();

import { ActivityType, Client, Events, GatewayIntentBits } from "discord.js";
import CommandPreprocessor from "./Commands";
import * as logger from "./logger";
import getServices from "./Services";
import EventManager from "./Events";
import { customEvents } from "./Events/BotEvent";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
    ],
    // Defaults are a 15s timeout with 3 retries. Discord's API is regularly
    // slower than that, and every exhausted request surfaces as an AbortError
    // that used to take the whole process down.
    rest: {
        timeout: 30_000,
        retries: 5,
    },
});

/**
 * An AbortError from @discordjs/rest means a single HTTP request timed out.
 * The process itself is still perfectly healthy, so it must not be treated as
 * a fatal, exit-worthy crash the way a genuine uncaught exception is.
 */
function isTransientNetworkError(error: any): boolean {
    return error?.name === "AbortError" || error?.code === "UND_ERR_CONNECT_TIMEOUT";
}

const commands = new CommandPreprocessor();
const events = new EventManager();
const services = getServices(client, commands);

(async () => {
    try {
        await services.waitForDatabase();
        logger.command("Database connection established. Starting bot...");
    } catch (err) {
        logger.error("Failed to connect to MongoDB. Exiting startup.", err);
        process.exit(1);
    }
})();

process.on("uncaughtException", async (error, origin) => {
    // Bilby has crashed at this point, best we can do is log the errors and exit.
    logger.error(
        "Detected an uncaught exception with origin",
        origin,
        ".\n",
        error.message,
        "\n",
        error.stack,
    );
    console.error(error); // Log the full error to STDERR.

    // A timed-out HTTP request leaves Bilby in a perfectly well-defined state.
    // Killing the process over one is what caused the endless restart loop, so
    // report it and carry on instead.
    if (isTransientNetworkError(error)) {
        await services.pager.sendError(
            error,
            `Uncaught transient network error (origin: ${origin})`,
            services.state.state.pagedUsers,
        );
        return;
    }

    const result = await services.pager.sendCrash(
        error,
        origin,
        services.state.state.pagedUsers,
    );

    // Bilby is in an undefined state, it is EXTREMELY discouraged from continuing in this state.
    // If the exit call wasn't here, Bilby would continue running, but doing so may cause undefined and unexpected behavior
    // so we must exit here.
    if (result == true) {
        logger.error(
            "Bot Bilby is in an undefined state! Terminating immediately.",
        );
        process.exit(1);
    }
});

process.on("unhandledRejection", async (reason: any) => {
    // Without this handler Node escalates an unhandled rejection into an
    // uncaughtException, which then exits. A rejected REST promise is not worth
    // taking the bot down for, so it is reported as an error instead.
    logger.error(
        "Detected an unhandled promise rejection.\n",
        reason?.message ?? String(reason),
        "\n",
        reason?.stack ?? "(no stack trace)",
    );
    console.error(reason);

    const error = reason instanceof Error ? reason : new Error(String(reason));

    await services.pager.sendError(
        error,
        "Unhandled promise rejection",
        services.state.state.pagedUsers,
    );
});

client.on(Events.ClientReady, async () => {
    await commands.getSlashCommands(services);
    commands.getTextCommands(services);
    await commands.registerSlashCommands(client, services);
    await events.registerEvents(client, services);

    logger.command("Online!");

    services.pager.sendPage("Bot Bilby is online!");

    client.user.setPresence({
        activities: [
            {
                name: "a cricket match",
                type: ActivityType.Playing,
            },
        ],
        status: "dnd",
    });

    client.emit(customEvents.ManualFire);
});

client.on(Events.MessageCreate, async (message) => {
    await commands.onTextCommandPreprocess(message, services);
});

client.on(Events.InteractionCreate, async (interaction) => {
    await commands.onSlashCommandPreprocess(interaction, services);
    await commands.onSlashAutocompletePreprocess(interaction, services);
});

client.login(process.env.TOKEN);
