import { Message, MessageFlags } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";

export default class PingCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("ping")
        .setDescription("Returns the websocket heartbeat of Bot Bilby")
        .allowInDMs(true);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        const test_msg = await message.reply({ content: "..." })
        await test_msg.edit(`Pong! 🏓\nRTT is ${test_msg.createdTimestamp - message.createdTimestamp}ms. Connection to Discord's Gateway took ${message.client.ws.ping}ms.`);
    }
}