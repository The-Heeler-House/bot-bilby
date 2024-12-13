import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";
import BotCharacter from "../../Services/Database/models/botCharacter";
import * as logger from "../../logger";

export default class AddCharacterCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("add character")
        .setDescription("Adds a character for Bot Bilby to switch to.")
        .addStringArgument("name", "The name of the character.")
        .addStringArgument("avatar", "A link to the avatar's image.")
        .addAllowedRoles(roleIds.staff)
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        let name = args["name"];
        let avatar: Response | null = null
        try {
            avatar = await fetch(`https://${args["avatar"]}`)
        } catch (e) {
            await message.reply(`No character image URL specified! Please refer to the help page for more information`)
            return
        }

        let avatarData = Buffer.from(await avatar.arrayBuffer())

        const character = await services.database.collections.botCharacters.findOne({ name: name }) as unknown as BotCharacter;
        if (character) {
            await message.reply(`I seem to already know of this character.`);
            return;
        }

        try {

            await services.database.collections.botCharacters.insertOne({
                name,
                avatarImage: avatarData
            });

            await message.reply(`Successfully created character \`${name}\`.`);
        } catch (error) {
            logger.error("Encountered error while trying to create character", name, "\n", error, "\n", error.stack);
            await services.pager.sendError(error, "Trying to create character " + name, services.state.state.pagedUsers, { message, args, character });
            await message.reply(`That's awkward. I encountered an error while creating the character \`${name}\`. Please try again.`);
        }
    }
}