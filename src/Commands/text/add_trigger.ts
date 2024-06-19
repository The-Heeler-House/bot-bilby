import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";
import BotCharacter from "../../Services/Database/models/botCharacter";
import * as logger from "../../logger";

export default class AddTriggerCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("add trigger")
        .setDescription("Adds a trigger for Bot Bilby respond to.")
        .addArgument("trigger", "The trigger to respond to.")
        .addAllowedRoles(roleIds.staff)
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        let trigger = args.join(" ");

        const dbTrigger = await services.database.collections.botCharacters.findOne({ trigger }) as unknown as BotCharacter;
        if (dbTrigger) {
            await message.reply(`I seem to already have a trigger like that.`);
            return;
        }

        try {
            let collector = message.channel.createMessageCollector({
                filter: (msg) => msg.author.id == message.author.id,
                time: 120_000,
                max: 1
            });

            collector.on("collect", async msg => {
                await services.database.collections.triggers.insertOne({
                    trigger,
                    response: msg.content,
                    cooldown: 10,
                });

                await msg.reply(`Created the trigger \`${trigger}\` with a cooldown of 10 seconds. You can modify this cooldown with the \`edit trigger cooldown\` text command.`);
            });

            collector.on("end", collected => {
                if (collected.size == 0)
                    message.reply("The trigger creation has been cancelled due to 2 minutes passing without response being received.");
            });

            await message.reply(`Creating trigger \`${trigger}\`. Please send the response you want the bot to send when the trigger is sent.\n**Hint:** *If you are using Regexp for the trigger, you can refer to any capture groups with \`{group <number>}\`.*`);
        } catch (error) {
            logger.error("Encountered error while trying to create trigger", trigger, "\n", error, "\n", error.stack);
            await services.pager.sendError(error, "Trying to create trigger " + trigger, services.state.state.pagedUsers);
            await message.reply(`That's awkward. I encountered an error while creating the trigger \`${trigger}\`. Please try again.`);
        }
    }
}