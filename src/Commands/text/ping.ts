import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";

export default class PingCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("ping")
        .setDescription("Returns the websocket heartbeat of Bot Bilby")
        .allowInDMs(true);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        await message.reply(`Pong! Websocket heartbeat is ${message.client.ws.ping}ms.`);
    }
}