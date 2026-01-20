import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { devIds, roleIds } from "../../constants";
import Triggers from "../../Services/Database/models/trigger";
import { PageBuilder } from "../../Helper/PaginationHelper";

export default class ListTriggersCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("list triggers")
        .setDescription("Gets a list of all triggers.")
        .addAllowedRoles(roleIds.mod)
        .addAllowedUsers(...devIds)
        .allowInDMs(false);

    async execute(
        message: Message,
        args: { [key: string]: string },
        services: Services,
    ) {
        const triggers = (await services.database.collections.triggers
            .find()
            .toArray()) as unknown as Triggers[];
        if (triggers.length == 0) {
            await message.reply(
                `Error! No triggers yet. Refer to the help page for \`${process.env.PREFIX}add trigger <trigger>\` to create one.`,
            );
            return;
        }

        let paginatedMessage = new PageBuilder(
            "plain_text",
            triggers
                .map((c) => `- (ID: \`${c.tid}\`) - \`${c.trigger}\``)
                .join("\n")
                .match(/(?=[\s\S])(?:.*\n?){1,10}/g),
            `Listed ${triggers.length} triggers(s)!\n`,
            `\nTo get information on a trigger, use, use \`${process.env.PREFIX}get trigger <trigger_id>\`.`,
        );

        await paginatedMessage.send(message);
    }
}
