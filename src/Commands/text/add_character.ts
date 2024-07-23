import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";
import BotCharacter from "../../Services/Database/models/botCharacter";
import * as logger from "../../logger";

export default class AddCharacterCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("add character")
        .setDescription("Adds a character for Bot Bilby to switch to.")
        .addArgument("name", "The name of the character.")
        .addArgument("avatar", "A link to the avatar.")
        .addAllowedRoles(roleIds.staff)
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        args = args.join(" ").split(" https://");
        let name = args[0];
        let avatar = `https://${args[1]}`;

        const character = await services.database.collections.botCharacters.findOne({ name: name }) as unknown as BotCharacter;
        if (character) {
            await message.reply(`I seem to already know of this character.`);
            return;
        }

        try {

            await services.database.collections.botCharacters.insertOne({
                name,
                avatar
            });

            await message.reply(`Successfully created character \`${name}\`.`);
        } catch (error) {
            logger.error("Encountered error while trying to create character", name, "\n", error, "\n", error.stack);
            await services.pager.sendError(error, "Trying to create character " + name, services.state.state.pagedUsers, { message, args, character, services });
            await message.reply(`That's awkward. I encountered an error while creating the character \`${name}\`. Please try again.`);
        }
    }
}