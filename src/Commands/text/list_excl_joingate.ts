import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class ToggleGateCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("list excl joingate")
        .setDescription("List the joingate exclusion list.")
        .addAllowedRoles(roleIds.mod)
        .allowInDMs(false);

    async execute(
        message: Message,
        args: { [key: string]: string },
        services: Services,
    ) {
        await message.reply(
            `Excluded users from joingate: ${[...services.state.volatileState.exclude_joingate].join(", ")}`,
        );
    }
}
