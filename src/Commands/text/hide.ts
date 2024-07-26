import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class HideCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("hide")
        .setDescription("Makes Bot Bilby invisible.")
        .addAllowedRoles(roleIds.staff)
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        message.client.user.setStatus("invisible");
        await message.reply("Done! I am now hidden.");
    }
}