import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class ToggleGateCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("get joingate")
        .setDescription("Get the current duration of joingate (aka. how long must an account be to join)")
        .addAllowedRoles(roleIds.mod)
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        await message.reply(`Join gate duration is currently set to ${services.state.state.joinGate} day(s).`);
    }
}