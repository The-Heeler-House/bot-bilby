import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { devIds, roleIds } from "../../constants";
import BotCharacter from "../../Services/Database/models/botCharacter";
import * as logger from "../../logger";
import {
    CollectionTimeoutError,
    getUpcomingMessage,
} from "../../Helper/FlowHelper";
import Trigger from "../../Services/Database/models/trigger";

export default class AddTriggerCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("add trigger")
        .setDescription("Adds a trigger for Bot Bilby respond to.")
        .addAllowedRoles(roleIds.mod)
        .addAllowedUsers(...devIds)
        .allowInDMs(false);

    async execute(
        message: Message,
        _args: { [key: string]: string },
        services: Services,
    ) {
        try {
            await message.reply(
                [
                    "Now creating a trigger...",
                    "Please specify the ID of the trigger you want to create by typing the ID below.",
                    "Do not specify an ID that already exists, and only use A-Z, a-z, 0-9 and _ for the ID.",
                ].join("\n"),
            );
            let triggerID = await getUpcomingMessage(
                message.channel as TextChannel,
                (msg) => msg.author.id == message.author.id,
                30_000,
            );
            if (!/^[\w]+$/.test(triggerID.content)) {
                await message.reply(
                    "Invalid message ID specified. Type the command again to try again.",
                );
                return;
            }
            const dbTrigger =
                (await services.database.collections.triggers.findOne({
                    tid: triggerID.content,
                })) as Trigger;
            if (dbTrigger) {
                await message.reply(
                    `Error! Trigger with specified trigger ID already exists.`,
                );
                return;
            }

            await triggerID.reply(
                [
                    "Trigger ID specified.",
                    "Please type 'text' or 'regex' below to specify the type of your trigger.",
                ].join("\n"),
            );
            let triggerType = await getUpcomingMessage(
                message.channel as TextChannel,
                (msg) => msg.author.id == message.author.id,
                30_000,
            );

            let type: "text" | "regex" = null;

            if (
                !["text", "regex"].includes(triggerType.content.toLowerCase())
            ) {
                await triggerType.reply(
                    "Invalid type of trigger specified. Run the command again to try again.",
                );
                return;
            }

            if (triggerType.content.toLowerCase() == "text") type = "text";
            else type = "regex";

            await triggerType.reply(
                [
                    `Trigger type specified.`,
                    "Please type the trigger phrase below (aka. what would trigger this).",
                    type == "regex"
                        ? "For regex trigger, refer to tools like https://regex101.com/ to test your trigger phrase. Only add the content of the regex, and not the delimeter/regex options."
                        : "",
                ].join("\n"),
            );

            let triggerTrigger = await getUpcomingMessage(
                message.channel as TextChannel,
                (msg) => msg.author.id == message.author.id,
                60_000,
            );
            let trigger: string =
                type == "regex"
                    ? triggerTrigger.content
                    : escapeRegex(triggerTrigger.content);

            await triggerTrigger.reply(
                [
                    `Trigger phrase specified.`,
                    "Please type the trigger content below (aka. what would Bilby say).",
                ].join("\n"),
            );
            let triggerResponse = await getUpcomingMessage(
                message.channel as TextChannel,
                (msg) => msg.author.id == message.author.id,
                120_000,
            );
            let response: string = triggerResponse.content;

            await services.database.collections.triggers.insertOne({
                tid: triggerID.content,
                trigger,
                response,
                cooldown: 10,
                meta: {
                    uses: 0,
                },
            });

            await triggerResponse.reply(`Trigger created.`);
        } catch (error) {
            if (error instanceof CollectionTimeoutError) {
                (message.channel as TextChannel).send(
                    `<@${message.author.id}> This command has timed out. Please try again!`,
                );
            } else {
                logger.error(
                    "Encountered error while trying to create trigger\n",
                    error,
                    "\n",
                    error.stack,
                );
                await services.pager.sendError(
                    error,
                    "Trying to create trigger",
                    services.state.state.pagedUsers,
                    { message },
                );
                await message.reply(
                    `That's awkward. I encountered an error while creating the trigger. Please try again.`,
                );
            }
        }
    }
}

function escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
