import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { devIds, roleIds } from "../../constants";
import * as logger from "../../logger";
import Triggers from "../../Services/Database/models/triggers";

export default class RemoveTriggerCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("remove trigger")
        .setDescription("Removes a triggery.")
        .addArgument("trigger", "The trigger to remove.")
        .addAllowedRoles(roleIds.staff)
        .addAllowedUsers(...devIds)
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        const trigger = await services.database.collections.triggers.findOne({ trigger: args.join(" ") }) as unknown as Triggers;
        if (!trigger) {
            await message.reply(`I don't seem to know of this trigger. Please say \`${process.env.PREFIX}list triggers\` to see the trigger list.`);
            return;
        }

        try {

            await services.database.collections.triggers.deleteOne({
                trigger: args.join(" ")
            });

            await message.reply(`Successfully removed trigger \`${args.join(" ")}\`.`);
        } catch (error) {
            logger.error("Encountered error while trying to remove trigger", args.join(" "), "\n", error, "\n", error.stack);
            await services.pager.sendError(error, "Trying to remove trigger " + args.join(" "), services.state.state.pagedUsers);
            await message.reply(`That's awkward. I encountered an error while removing the trigger \`${args.join(" ")}\`. Please try again.`);
        }
    }
}