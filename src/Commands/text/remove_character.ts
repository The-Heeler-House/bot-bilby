import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";
import BotCharacter from "../../Services/Database/models/botCharacter";
import * as logger from "../../logger";

export default class RemoveCharacterCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("remove character")
        .setDescription("Removes a character from Bot Bilby.")
        .addImplicitStringArgument("character", "The name of the character to remove.")
        .addAllowedRoles(roleIds.mod)
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        const character = await services.database.collections.botCharacters.findOne({ name: args["character"] }) as unknown as BotCharacter;
        if (!character) {
            await message.reply(`I don't seem to know of this character. Please say \`${process.env.PREFIX}list characters\` to see the character list.`);
            return;
        }

        try {

            await services.database.collections.botCharacters.deleteOne({
                name: args["character"]
            });

            await message.reply(`Successfully removed character \`${args["character"]}\`.`);
        } catch (error) {
            logger.error("Encountered error while trying to remove character", args["character"], "\n", error, "\n", error.stack);
            await services.pager.sendError(error, "Trying to remove character " + args["character"], services.state.state.pagedUsers, { message, args, character });
            await message.reply(`That's awkward. I encountered an error while removing the character \`${args["character"]}\`. Please try again.`);
        }
    }
}