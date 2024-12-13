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
        .addImplicitStringArgument("trigger", "The trigger to get the response from.")
        .addAllowedRoles(roleIds.staff)
        .addAllowedUsers(...devIds)
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        const trigger = await services.database.collections.triggers.findOne({ trigger: args["trigger"] }) as unknown as Triggers;
        if (!trigger) {
            await message.reply(`I don't seem to know of this trigger. Please say \`${process.env.PREFIX}list triggers\` to see the trigger list.`);
            return;
        }

        await message.reply(`Trigger \`${trigger.trigger}\`:\n\n\`\`\`\n${trigger.response}\n\`\`\``);
    }
}