import { EmbedBuilder, Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { devIds, roleIds } from "../../constants";
import BotCharacter from "../../Services/Database/models/botCharacter";
import * as logger from "../../logger";
import Triggers from "../../Services/Database/models/trigger";

export default class ListTriggersCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("list triggers")
        .setDescription("Gets a list of all triggers.")
        .addAllowedRoles(roleIds.staff)
        .addAllowedUsers(...devIds)
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        const triggers = await services.database.collections.triggers.find().toArray() as unknown as Triggers[];
        if (triggers.length == 0) {
            await message.reply(`I didn't find any triggers. Please say \`${process.env.PREFIX}add trigger <trigger>\` to begin creating one.`);
            return;
        }

        await message.reply(`Here's a list of all triggers. To get information on a trigger, say \`${process.env.PREFIX}get trigger <trigger>\`. To view the response of a trigger, say \`${process.env.PREFIX}view trigger <trigger>\`.\n\n${triggers.map(trigger => `\`${trigger.trigger}\``).join(", ")}`);
    }
}