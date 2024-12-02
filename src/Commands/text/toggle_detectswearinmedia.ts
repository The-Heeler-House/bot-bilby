import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class ToggleDetectSwearInMediaCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("toggle detect_swear_in_media")
        .setDescription("Toggles whether Bot Bilby will scan media for swear words.")
        .addAllowedRoles(roleIds.staff)
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        let detectSwearInMedia = !services.state.state.detectSwearInMedia;

        services.state.state.detectSwearInMedia = detectSwearInMedia;
        services.state.save();

        await message.reply(`Successfully **${detectSwearInMedia ? "enabled" : "disabled"}** the scanner.`);
    }
}