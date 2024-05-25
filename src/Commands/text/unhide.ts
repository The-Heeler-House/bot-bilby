import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class UnhideCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("unhide")
        .setDescription("Makes Bot Bilby visible.")
        .addAllowedRoles(roleIds.staff)
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        message.client.user.setStatus("dnd");
        await message.reply("Done! I am now visible.");
    }
}