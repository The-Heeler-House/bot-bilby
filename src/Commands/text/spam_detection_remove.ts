import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class SpamDetectionRemoveCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("spam detection remove")
        .setDescription("Remove spam detection (message and media spam) alert for a channel.")
        .addAllowedRoles(roleIds.mod)
        .addChannelMentionArgument("channel", "Channel to setup or update detection")
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        const result = await services.database.collections.spamDetection.deleteOne({
            channel: args["channel"]
        })

        if (result.deletedCount > 0) {
            await message.reply("Successful!")
        } else {
            await message.reply("No channel found in database!")
        }
    }
}