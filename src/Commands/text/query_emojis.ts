import { Message, MessageFlags } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";

export default class QueryEmojisCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("query emojis")
        .setDescription("Perform a query on emojis within the server")
        .allowInDMs(false);

    async execute(
        message: Message,
        args: { [key: string]: string },
        services: Services,
    ) {
        const emojis = message.guild.emojis.cache;
        let query = "";
        for (const [id, emoji] of emojis) {
            query += `${emoji.name} (${emoji.id}), `;
        }
        await message.reply({ content: query });
    }
}
