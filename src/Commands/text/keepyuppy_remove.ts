import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class KeepyUppyRemoveCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("keepyuppy remove")
        .setDescription("Remove a running session of keepy uppy in a channel.")
        .addAllowedRoles(roleIds.mod)
        .addChannelMentionArgument("channel", "Channel to remove the game.")
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        const deleteResult = await services.database.collections.keepyUppy.deleteOne({
            channel: args["channel"]
        })

        if (deleteResult.deletedCount > 0) await message.reply("Successful!")
        else await message.reply("No channel found in database!")
    }
}