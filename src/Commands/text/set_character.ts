import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";
import BotCharacter from "../../Services/Database/models/botCharacter";
import * as logger from "../../logger";
import { WithId } from "mongodb";

export default class SetCharacterCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("set character")
        .setDescription("Changes the username and avatar of Bot Bilby to predefined characters.")
        .addImplicitStringArgument("character", "The character preset to set to.")
        .addAllowedRoles(roleIds.mod)
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        const character = await services.database.collections.botCharacters.findOne({ name: args["character"] }) as WithId<BotCharacter>;
        if (!character) {
            await message.reply(`I don't recognise the character named ${args["character"]}. Please say \`${process.env.PREFIX}list characters\` to see the character list.`);
            return;
        }

        try {
            await (await message.guild.members.fetchMe()).setNickname(character.name);
            await message.client.user.setAvatar(Buffer.from(character.avatarImage.buffer));

            await message.reply(`Successfully changed character to \`${args["character"]}\`.`);
        } catch (error) {
            logger.error("Encountered error while trying to change avatar and username to character", args["character"], "\n", error, "\n", error.stack);
            await services.pager.sendError(error, "Trying to change avatar and username to character " + args["character"], services.state.state.pagedUsers, { message, args, character });
            await message.reply(`That's awkward. I encountered an error while changing character to \`${args["character"]}\`. Please try again.`);
        }
    }
}