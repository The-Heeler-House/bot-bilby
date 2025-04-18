import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { devIds, roleIds } from "../../constants";
import BotCharacter from "../../Services/Database/models/botCharacter";
import * as logger from "../../logger";

export default class EditTriggerCooldownCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("set trigger cooldown")
        .setDescription("Set a trigger's cooldown length.")
        .addImplicitStringArgument("trigger", "The trigger to edit the cooldown length of.")
        .addAllowedRoles(roleIds.staff)
        .addAllowedUsers(...devIds)
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        let trigger = args["trigger"];

        const dbTrigger = await services.database.collections.triggers.findOne({ trigger }) as unknown as BotCharacter;
        if (!dbTrigger) {
            await message.reply(`I don't seem to know about that trigger.`);
            return;
        }

        try {
            let collector = (message.channel as TextChannel).createMessageCollector({
                filter: (msg) => msg.author.id == message.author.id,
                time: 30_000,
                max: 1
            });

            collector.on("collect", async msg => {
                if (isNaN(parseInt(msg.content))) {
                    await msg.reply("This did not resolve to a number. Please try again.");
                    return;
                }

                await services.database.collections.triggers.updateOne({ trigger }, {
                    $set: {
                        cooldown: parseInt(msg.content)
                    }
                });

                await msg.reply(`Successfully edited the \`${trigger}\` trigger cooldown to ${parseInt(msg.content)} seconds.`);
            });

            collector.on("end", collected => {
                if (collected.size == 0)
                    message.reply("The trigger cooldown edit has been cancelled due to 30 seconds passing without response being received.");
            });

            await message.reply(`Editing trigger \`${trigger}\` cooldown. Please send the amount of seconds you want the bot to wait before responding to a trigger again.`);
        } catch (error) {
            logger.error("Encountered error while trying to edit trigger cooldown", trigger, "\n", error, "\n", error.stack);
            await services.pager.sendError(error, "Trying to edit trigger cooldown " + trigger, services.state.state.pagedUsers, { message, args, dbTrigger });
            await message.reply(`That's awkward. I encountered an error while editing the \`${trigger}\` trigger cooldown. Please try again.`);
        }
    }
}