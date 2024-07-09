import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";

export default class PingCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("help")
        .setDescription("Lists ")
        .allowInDMs(true);

    async execute(message: Message, args: string[], services: Services) {
        await message.reply(`Pong! Websocket heartbeat is ${message.client.ws.ping}ms.`);
    }
}