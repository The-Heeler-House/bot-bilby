// TODO: Functional Discord bot please!
import * as dotenv from "dotenv";
dotenv.config();

import { ActivityType, Client, Events, GatewayIntentBits } from "discord.js";
import CommandPreprocessor from "./Commands";
import * as logger from "./Logger";
import getServices from "./Services";

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
const services = getServices(client);

client.on(Events.ClientReady, async () => {
    await commands.registerSlashCommands(client);
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