import { Collection, Message, TextChannel, TextThreadChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class SayCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("cleanup guesswho")
        .setDescription("Clean up guesswho sessions that were created in a channel.")
        .addAllowedRoles(roleIds.staff)
        .addArgument("channel", "Channel to cleanup")
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        await message.reply(`WARNING: This command should not be run regularly since it can cause Discord to timeout the bot!`)
        let threads: Collection<string, TextThreadChannel>
        try {
            let channel = await message.guild.channels.fetch(args[0].trim().replace(/^<#(.*)>$/g, "$1")) as TextChannel;
            threads = channel.threads.cache.filter(v => v.name.startsWith("guesswho-") && (!v.locked || !v.archived))
        } catch (e) {
            await message.reply("Invalid channel!");
            return
        }
        await message.reply(`Found ${threads.size} unmanaged guesswho sessions! Cleaning up now.`)

        for (const [_, thread] of threads) {
            try {
                if (!thread.locked) await thread.setLocked()
                if (!thread.archived) await thread.setArchived()
            } catch (e) {
                await message.reply(`Unable to cleanup thread ${thread.name}!`)
            }
        }

        await message.reply(`Finished!`)
    }
}