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
        .addImplicitStringArgument("trigger", "The trigger to remove.")
        .addAllowedRoles(roleIds.staff)
        .addAllowedUsers(...devIds)
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        const trigger = await services.database.collections.triggers.findOne({ trigger: args["trigger"] }) as unknown as Triggers;
        if (!trigger) {
            await message.reply(`I don't seem to know of this trigger. Please say \`${process.env.PREFIX}list triggers\` to see the trigger list.`);
            return;
        }

        try {

            await services.database.collections.triggers.deleteOne({
                trigger: args["trigger"]
            });

            await message.reply(`Successfully removed trigger \`${args["trigger"]}\`.`);
        } catch (error) {
            logger.error("Encountered error while trying to remove trigger", args["trigger"], "\n", error, "\n", error.stack);
            await services.pager.sendError(error, "Trying to remove trigger " + args["trigger"], services.state.state.pagedUsers, { message, args, trigger });
            await message.reply(`That's awkward. I encountered an error while removing the trigger \`${args["trigger"]}\`. Please try again.`);
        }
    }
}