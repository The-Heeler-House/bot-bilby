import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class ToggleGateCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("toggle altgate")
        .setDescription("Toggles whether the alt gate is enabled or not.")
        .addAllowedRoles(roleIds.staff)
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        let altGate = !services.state.state.altGate;

        services.state.state.altGate = altGate;
        services.state.save();

        await message.reply(`Successfully **${altGate ? "enabled" : "disabled"}** the altgate.`);
    }
}