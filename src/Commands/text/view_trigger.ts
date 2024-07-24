import { AttachmentBuilder, Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { devIds, roleIds } from "../../constants";
import Triggers from "../../Services/Database/models/trigger";
import { WithId } from "mongodb";
import { createDiscordAttachmentFromDb } from "../../Helper/TriggerHelper";

export default class GetTriggerCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("view trigger")
        .setDescription("Outputs the response for a trigger.")
        .addArgument("trigger", "The trigger to get the response from.")
        .addAllowedRoles(roleIds.staff)
        .addAllowedUsers(...devIds)
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        const trigger = await services.database.collections.triggers.findOne({ trigger: args.join(" ") }) as WithId<Triggers>;
        if (!trigger) {
            await message.reply(`I don't seem to know of this trigger. Please say \`${process.env.PREFIX}list triggers\` to see the trigger list.`);
            return;
        }

        let files: AttachmentBuilder[] = []
        for (const attachment of trigger.attachmentIds) {
            files.push(await createDiscordAttachmentFromDb(services.database.bilbyDb, attachment))
        }

        await message.reply({
            content: `Trigger \`${trigger.trigger}\`:\n\n\`\`\`\n${trigger.response}\n\`\`\``,
            files: files
        });
    }
}