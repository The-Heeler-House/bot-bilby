import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class ConfigCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("config")
        .setDescription("Configure Bot Bilby for the current server.")
        .addAllowedRoles(roleIds.staff)
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        message.client.user.setStatus("invisible");
        await message.reply("Done! I am now hidden.");
    }
}