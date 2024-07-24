import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { devIds, roleIds } from "../../constants";
import * as logger from "../../logger";
import { ObjectId, WithId } from "mongodb";
import Trigger from "../../Services/Database/models/trigger";
import { addAttachmentToDb, removeAttachmentFromDb } from "../../Helper/TriggerHelper";

export default class EditTriggerCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("edit trigger")
        .setDescription("Edits a trigger.")
        .addArgument("trigger", "The trigger to edit.")
        .addAllowedRoles(roleIds.staff)
        .addAllowedUsers(...devIds)
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        let trigger = args.join(" ");

        const dbTrigger = await services.database.collections.triggers.findOne({ trigger }) as WithId<Trigger>;
        if (!dbTrigger) {
            await message.reply(`I don't seem to know about that trigger. Maybe you meant to add it?`);
            return;
        }

        try {
            let collector = message.channel.createMessageCollector({
                filter: (msg) => msg.author.id == message.author.id,
                time: 120_000,
                max: 1
            });

            collector.on("collect", async msg => {
                for (const attachment of dbTrigger.attachmentIds) {
                    await removeAttachmentFromDb(services.database.bilbyDb, attachment)
                }

                const newAttachments: ObjectId[] = []
                for (const [_, attachment] of msg.attachments) {
                    newAttachments.push(await addAttachmentToDb(services.database.bilbyDb, attachment))
                }

                await services.database.collections.triggers.updateOne({ trigger }, {
                    $set: {
                        response: msg.content,
                        attachmentIds: newAttachments
                    }
                });

                await msg.reply(`Successfully edited the \`${trigger}\` trigger.`);
            });

            collector.on("end", collected => {
                if (collected.size == 0)
                    message.reply("The trigger edit has been cancelled due to 2 minutes passing without response being received.");
            });

            await message.reply(`Editing trigger \`${trigger}\`. Please send the response you want the bot to send when the trigger is sent.`);
        } catch (error) {
            logger.error("Encountered error while trying to edit trigger", trigger, "\n", error, "\n", error.stack);
            await services.pager.sendError(error, "Trying to edit trigger " + trigger, services.state.state.pagedUsers);
            await message.reply(`That's awkward. I encountered an error while editing the \`${trigger}\` trigger. Please try again.`);
        }
    }
}