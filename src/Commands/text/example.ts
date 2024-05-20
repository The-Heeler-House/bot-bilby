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
        let result = (await services.database.collections.muteroulette.findOne()) as unknown as { message: string };
        if (result) {
            await message.reply(`The database service told me to tell you: ${result.message}`);
        } else {
            await services.database.collections.muteroulette.insertOne({ message: `Hello from the past! This message was written to the database at ${new Date().toString()}.` });
            await message.reply("I've told the database service to remind me to send you a message later.");
        }
    }
}