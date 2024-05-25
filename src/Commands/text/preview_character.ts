import { EmbedBuilder, Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";
import BotCharacter from "../../Services/Database/models/botCharacter";
import * as logger from "../../logger";

export default class PreviewCharacterCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("preview character")
        .setDescription("Preview what a character looks like.")
        .addArgument("character", "The character preset to preview.")
        .addAllowedRoles(roleIds.staff)
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        const character = await services.database.collections.botCharacters.findOne({ name: args.join(" ") }) as unknown as BotCharacter;
        if (!character) {
            await message.reply(`I don't recognise the character named ${args.join(" ")}. Please say \`${process.env.PREFIX}list characters\` to see the character list.`);
            return;
        }

        const embed = new EmbedBuilder()
            .setAuthor({
                name: character.name,
                iconURL: character.avatar
            })
            .setFooter({
                text: `ID: ${character.id}`
            });

        await message.reply({
            content: `This is what the character \`${character.name}\` looks like. To set, say \`${process.env.PREFIX}set character ${character.name}\`. To remove, say \`${process.env.PREFIX}remove character ${character.name}\``,
            embeds: [ embed ]
        });
    }
}