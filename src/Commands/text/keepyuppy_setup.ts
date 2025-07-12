import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

//? For actual game logic, refer to src/Events/events/keepyuppy.ts

export default class KeepyUppySetupCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("keepyuppy setup")
        .setDescription("Setup a session of keepy uppy for a channel.")
        .addAllowedRoles(roleIds.mod)
        .addChannelMentionArgument("channel", "Channel to set the game up.")
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        const channel = await message.guild.channels.fetch(args["channel"])
        if (!channel || !channel.isSendable() || !channel.isTextBased()) {
            await message.reply("Invalid channel specified! Please select a channel in the server, and make sure it's a text channel.")
            return
        }

        await services.database.collections.keepyUppy.insertOne({
            channel: channel.id,
            currentStreak: 0,
            longestStreak: 0,
            balloon_state: "off_ground"
        })
        await message.reply("Successful!")
    }
}