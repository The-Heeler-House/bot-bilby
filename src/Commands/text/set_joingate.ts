import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class ToggleGateCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("set joingate")
        .setDescription("Set the duration for joingate (aka. how long must an account be to join)")
        .addNumberArgument("duration", "The duration in days")
        .addAllowedRoles(roleIds.mod)
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        let duration = Number(args["duration"])
        services.state.state.joinGate = duration;
        services.state.save();

        await message.reply(`Join gate duration set to ${duration} day(s).`);
    }
}