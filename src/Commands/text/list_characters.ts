import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";
import BotCharacter from "../../Services/Database/models/botCharacter";

export default class ListCharactersCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("list characters")
        .setDescription("Gets a list of all characters.")
        .addAllowedRoles(roleIds.staff)
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        const characters = await services.database.collections.botCharacters.find().toArray() as unknown as BotCharacter[];
        if (characters.length == 0) {
            await message.reply(`I didn't find any characters. Please say \`${process.env.PREFIX}add character <name> <avatar_url>\` to create one.`);
            return;
        }

        await message.reply(`Here's a list of all available characters. To preview one, say \`${process.env.PREFIX}preview character <name>\`. To set one, say \`${process.env.PREFIX}set character <name>\`.\n\`\`\`\n${characters.map(character => character.name).join(", ")}\n\`\`\``);
    }
}