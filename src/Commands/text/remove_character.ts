import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../Constants";
import BotCharacter from "../../Services/Database/models/botCharacter";
import * as logger from "../../Logger";

export default class RemoveCharacterCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("remove character")
        .setDescription("Removes a character from Bot Bilby.")
        .addArgument("name", "The name of the character to remove.")
        .addAllowedRoles(roleIds.staff)
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        const character = await services.database.collections.botCharacters.findOne({ name: args.join(" ") }) as unknown as BotCharacter;
        if (!character) {
            await message.reply(`I don't seem to know of this character. Please say \`${process.env.PREFIX}list characters\` to see the character list.`);
            return;
        }

        try {

            await services.database.collections.botCharacters.deleteOne({
                name: args.join(" ")
            });

            await message.reply(`Successfully removed character \`${args.join(" ")}\`.`);
        } catch (error) {
            logger.error("Encountered error while trying to remove character", args.join(" "), "\n", error, "\n", error.stack);
            await message.reply(`That's awkward. I encountered an error while removing the character \`${args.join(" ")}\`. Please try again.`);
        }
    }
}