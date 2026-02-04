import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { devIds, roleIds } from "../../constants";
import BotCharacter from "../../Services/Database/models/botCharacter";
import * as logger from "../../logger";

export default class EditTriggerCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("edit trigger")
        .setDescription("Edits a trigger.")
        .addImplicitStringArgument("trigger_id", "The trigger to edit.")
        .addAllowedRoles(roleIds.mod)
        .addAllowedUsers(...devIds)
        .allowInDMs(false);

    async execute(
        message: Message,
        args: { [key: string]: string },
        services: Services,
    ) {
        let triggerID = args["trigger_id"];

        const dbTrigger = await services.database.collections.triggers.findOne({
            tid: triggerID,
        });
        if (!dbTrigger) {
            await message.reply(
                `I don't seem to know about that trigger. Maybe you meant to add it?`,
            );
            return;
        }

        try {
            let collector = (
                message.channel as TextChannel
            ).createMessageCollector({
                filter: (msg) => msg.author.id == message.author.id,
                time: 120_000,
                max: 1,
            });

            collector.on("collect", async (msg) => {
                await services.database.collections.triggers.updateOne(
                    { tid: triggerID },
                    {
                        $set: {
                            response: msg.content,
                        },
                    },
                );

                await msg.reply(
                    `Successfully edited the \`${triggerID}\` trigger.`,
                );
            });

            collector.on("end", (collected) => {
                if (collected.size == 0)
                    message.reply(
                        "The trigger edit has been cancelled due to 2 minutes passing without response being received.",
                    );
            });

            await message.reply(
                `Editing trigger \`${triggerID}\`. Please send the response you want the bot to send when the trigger is sent.`,
            );
        } catch (error) {
            logger.error(
                "Encountered error while trying to edit trigger",
                triggerID,
                "\n",
                error,
                "\n",
                error.stack,
            );
            await services.pager.sendError(
                error,
                "Trying to edit trigger " + triggerID,
                services.state.state.pagedUsers,
                { message, args, dbTrigger },
            );
            await message.reply(
                `That's awkward. I encountered an error while editing the \`${triggerID}\` trigger. Please try again.`,
            );
        }
    }
}
