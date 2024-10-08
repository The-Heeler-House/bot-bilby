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
        .addArgument("name", "The character preset to set to.")
        .addAllowedRoles(roleIds.staff)
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        const character = await services.database.collections.botCharacters.findOne({ name: args.join(" ") }) as WithId<BotCharacter>;
        if (!character) {
            await message.reply(`I don't recognise the character named ${args.join(" ")}. Please say \`${process.env.PREFIX}list characters\` to see the character list.`);
            return;
        }

        try {
            await (await message.guild.members.fetchMe()).setNickname(character.name);
            await message.client.user.setAvatar(Buffer.from(character.avatarImage.buffer));

            await message.reply(`Successfully changed character to \`${args.join(" ")}\`.`);
        } catch (error) {
            logger.error("Encountered error while trying to change avatar and username to character", args.join(" "), "\n", error, "\n", error.stack);
            await services.pager.sendError(error, "Trying to change avatar and username to character " + args.join(" "), services.state.state.pagedUsers, { message, args, character });
            await message.reply(`That's awkward. I encountered an error while changing character to \`${args.join(" ")}\`. Please try again.`);
        }
    }
}