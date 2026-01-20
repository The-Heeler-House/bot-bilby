import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";
import BotCharacter from "../../Services/Database/models/botCharacter";
import { PageBuilder } from "../../Helper/PaginationHelper";

export default class ListCharactersCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("list characters")
        .setDescription("Gets a list of all characters.")
        .addAllowedRoles(roleIds.mod)
        .allowInDMs(false);

    async execute(
        message: Message,
        args: { [key: string]: string },
        services: Services,
    ) {
        const characters = (await services.database.collections.botCharacters
            .find()
            .toArray()) as unknown as BotCharacter[];

        if (characters.length <= 0) {
            await message.reply(
                `Error! No characters yet. Refer to the help page for \`${process.env.PREFIX}set character\` on how to create one.`,
            );
        }

        let paginatedMessage = new PageBuilder(
            "plain_text",
            characters
                .map((c) => "- " + "`" + c.name + "`")
                .join("\n")
                .match(/(?=[\s\S])(?:.*\n?){1,10}/g),
            `Listed ${characters.length} character(s)!\n`,
            `\nTo preview a character, use \`${process.env.PREFIX}preview character <name>\`. To create a character, refer to the help page for \`${process.env.PREFIX}set character\``,
        );

        await paginatedMessage.send(message);
    }
}
