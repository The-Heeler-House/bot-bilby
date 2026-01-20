import { AttachmentBuilder, EmbedBuilder, Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";
import BotCharacter from "../../Services/Database/models/botCharacter";
import { WithId } from "mongodb";

export default class PreviewCharacterCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("preview character")
        .setDescription("Preview what a character looks like.")
        .addImplicitStringArgument(
            "character",
            "The character preset to preview.",
        )
        .addAllowedRoles(roleIds.mod)
        .allowInDMs(false);

    async execute(
        message: Message,
        args: { [key: string]: string },
        services: Services,
    ) {
        const character =
            (await services.database.collections.botCharacters.findOne({
                name: args["character"],
            })) as WithId<BotCharacter>;
        if (!character) {
            await message.reply(
                `Error! No character with name ${args["character"]} found. Please use \`${process.env.PREFIX}list characters\` to see the character list.`,
            );
            return;
        }

        const icon = new AttachmentBuilder(
            Buffer.from(character.avatarImage.buffer),
            { name: "data.png" },
        );
        const embed = new EmbedBuilder()
            .setAuthor({
                name: character.name,
                iconURL: "attachment://data.png",
            })
            .setFooter({
                text: `ID: ${character._id}`,
            });

        await message.reply({
            content: `Preview for character \`${character.name}\`. To set the character, use \`${process.env.PREFIX}set character ${character.name}\`. To remove the character, use \`${process.env.PREFIX}remove character ${character.name}\``,
            files: [icon],
            embeds: [embed],
        });
    }
}
