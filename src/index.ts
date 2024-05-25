// TODO: Functional Discord bot please!
import * as dotenv from "dotenv";
dotenv.config();

import { ActivityType, Client, Events, GatewayIntentBits } from "discord.js";
import CommandPreprocessor from "./Commands";
import * as logger from "./logger";
import getServices from "./Services";
import EventManager from "./Events";

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
] });

const commands = new CommandPreprocessor();
const events = new EventManager();
const services = getServices(client, commands);

process.on("uncaughtException", async (error, origin) => {
    // Bilby has crashed at this point, best we can do is log the errors and exit.
    logger.error("Detected an uncaught exception with origin", origin, ".\n",error.message,"\n",error.stack);

    await services.pager.sendCrash(error, origin, services.state.state.pagedUsers);

    // Bilby is in an undefined state, it is EXTREMELY discouraged from continuing in this state.
    // If the exit call wasn't here, Bilby would continue running, but doing so may cause undefined and unexpected behaviour
    // so we must exit here.
    logger.error("Bot Bilby is in an undefined state! Terminating immediatly.");
    process.exit(1);
});

client.on(Events.ClientReady, async () => {
    commands.getSlashCommands(services);
    commands.getTextCommands(services);
    await commands.registerSlashCommands(client, services);
    events.registerEvents(client, services);

    logger.command("Online!");

    client.user.setPresence({
        activities: [
            {
                name: "a cricket match",
                type: ActivityType.Playing
            }
        ],
        status: "dnd"
    });
});

client.on(Events.MessageCreate, async (message) => {
    await commands.onTextCommandPreprocess(message, services);
});

client.on(Events.InteractionCreate, async (interaction) => {
    await commands.onSlashCommandPreprocess(interaction, services);
    await commands.onSlashAutocompletePreprocess(interaction, services);
});

client.login(process.env.TOKEN);