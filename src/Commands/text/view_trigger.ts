import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { devIds, roleIds } from "../../constants";
import * as logger from "../../logger";
import Triggers from "../../Services/Database/models/trigger";

export default class GetTriggerCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("view trigger")
        .setDescription("Outputs the response for a trigger.")
        .addImplicitStringArgument(
            "trigger_id",
            "The trigger ID to get the response from.",
        )
        .addAllowedRoles(roleIds.mod)
        .addAllowedUsers(...devIds)
        .allowInDMs(false);

    async execute(
        message: Message,
        args: { [key: string]: string },
        services: Services,
    ) {
        const trigger = (await services.database.collections.triggers.findOne({
            tid: args["trigger_id"],
        })) as unknown as Triggers;
        if (!trigger) {
            await message.reply(
                `Error! No trigger with specified trigger ID found! Please use \`${process.env.PREFIX}list triggers\` to see the trigger list.`,
            );
            return;
        }

        await message.reply(
            `Trigger \`${trigger.trigger}\`:\n\n\`\`\`\n${trigger.response}\n\`\`\``,
        );
    }
}
