import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { devIds, roleIds } from "../../constants";
import * as logger from "../../logger";
import Triggers from "../../Services/Database/models/trigger";

export default class RemoveTriggerCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("remove trigger")
        .setDescription("Removes a trigger.")
        .addImplicitStringArgument("trigger_id", "The trigger ID to remove.")
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

        try {
            await services.database.collections.triggers.deleteOne({
                tid: args["trigger_id"],
            });

            await message.reply(`Removed trigger \`${args["trigger_id"]}\`.`);
        } catch (error) {
            logger.error(
                "Encountered error while trying to remove trigger",
                args["trigger"],
                "\n",
                error,
                "\n",
                error.stack,
            );
            await services.pager.sendError(
                error,
                "Trying to remove trigger " + args["trigger"],
                services.state.state.pagedUsers,
                { message, args, trigger },
            );
            await message.reply(
                `Error! Problem while removing the trigger \`${args["trigger"]}\`. Please try again.`,
            );
        }
    }
}
