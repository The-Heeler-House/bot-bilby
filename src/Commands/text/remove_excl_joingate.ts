import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class ToggleGateCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("remove excl joingate")
        .setDescription("Remove an account from the joingate exclusion list.")
        .addUserMentionArgument("user", "The user in question")
        .addAllowedRoles(roleIds.mod)
        .allowInDMs(false);

    async execute(
        message: Message,
        args: { [key: string]: string },
        services: Services,
    ) {
        if (!services.state.volatileState.exclude_joingate.has(args["user"])) {
            await message.reply(
                `User (${args["user"]}) is not in the temporary exclusion of joingate.`,
            );
            return;
        }
        services.state.volatileState.exclude_joingate.delete(args["user"]);
        await message.reply(
            `Remove user (${args["user"]}) from temporary exclusion of joingate.`,
        );
    }
}
