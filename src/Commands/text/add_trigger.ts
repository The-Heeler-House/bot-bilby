import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { devIds, roleIds } from "../../constants";
import BotCharacter from "../../Services/Database/models/botCharacter";
import * as logger from "../../logger";
import { CollectionTimeoutError, getUpcomingMessage } from "../../Helper/FlowHelper";

export default class AddTriggerCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("add trigger")
        .setDescription("Adds a trigger for Bot Bilby respond to.")
        .addAllowedRoles(roleIds.staff)
        .addAllowedUsers(...devIds)
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        try {
            await message.reply("Creating a trigger. Please tell me what kind of trigger you want to create. Either `text` or `regex`.\n`text` is best for static triggers that just match an exact string.\n`regex` is best for triggers that still need to work if parts are missing, or if you want to use part of the trigger in the response.\nKeep in mind that you *will* need knowledge of RegEx (Regular Expressions) in order to create a working RegEx trigger.");
            let triggerType = await getUpcomingMessage(message.channel as TextChannel, (msg) => msg.author.id == message.author.id, 30_000);
            let type: "text" | "regex" = null;

            if (!["text", "regex"].includes(triggerType.content.toLowerCase())) {
                await triggerType.reply("The response you provided did not match either `text` or `regex`. Please rerun the command to try again.");
                return;
            }

            if (triggerType.content.toLowerCase() == "text") type = "text";
            else type = "regex";

            await triggerType.reply(`Okay! We're creating a ${type}-based trigger. Now please tell me what you want the trigger to be.${type == "regex" ? "\n**Hint:** *Want to test your regex somewhere before entering it? Use https://regexr.com/ to test your regex then restart this command (as it will probably have timed out).*" : ""}`);
            let triggerTrigger = await getUpcomingMessage(message.channel as TextChannel, (msg) => msg.author.id == message.author.id, 60_000);
            let trigger: string = type == "regex" ? triggerTrigger.content : escapeRegex(triggerTrigger.content);

            const dbTrigger = await services.database.collections.triggers.findOne({ trigger }) as unknown as BotCharacter;
            if (dbTrigger) {
                await message.reply(`I seem to already have a trigger like that. Try again with a different trigger. To see what triggers I do have, run \`${process.env.PREFIX}list triggers\``);
                return;
            }

            await triggerTrigger.reply(`Gotcha! We're making a ${type}-based trigger triggered by \`${triggerTrigger.content}\`. What do you want the response to be?`);
            let triggerResponse = await getUpcomingMessage(message.channel as TextChannel, (msg) => msg.author.id == message.author.id, 120_000);
            let response: string = triggerResponse.content;

            await services.database.collections.triggers.insertOne({
                trigger,
                response,
                cooldown: 10,
                meta: {
                    uses: 0
                }
            });

            await triggerResponse.reply(`Created the ${type}-based trigger \`${triggerTrigger.content}\` with a cooldown of 10 seconds. You can modify this cooldown with the \`edit trigger cooldown\` text command.`);
        } catch (error) {
            if (error instanceof CollectionTimeoutError) {
                message.channel.send(`<@${message.author.id}> This command has timed out. Please try again!`);
            } else {
                logger.error("Encountered error while trying to create trigger\n", error, "\n", error.stack);
                await services.pager.sendError(error, "Trying to create trigger", services.state.state.pagedUsers, { message, args, services });
                await message.reply(`That's awkward. I encountered an error while creating the trigger. Please try again.`);
            }
        }
    }
}

function escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}