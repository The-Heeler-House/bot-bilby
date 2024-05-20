import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";

export default class ExampleCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("run example")
        .setDescription("An example command showing off the command handling system.")
        .allowInDMs(true);

    async execute(message: Message, args: string[], services: Services) {
        await message.reply(`Hello! This is the example text command. Everything is working well. ${services.example.message} The arguments for this messsage are: [${args.join(", ")}]`);
    }
}