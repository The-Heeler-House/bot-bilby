import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class ToggleGateCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("add excl joingate")
        .setDescription(
            "Add an account to the joingate exclusion list temporarily.",
        )
        .addUserMentionArgument("user", "The user in question")
        .addAllowedRoles(roleIds.mod)
        .allowInDMs(false);

    async execute(
        message: Message,
        args: { [key: string]: string },
        services: Services,
    ) {
        if (services.state.volatileState.exclude_joingate.has(args["user"])) {
            await message.reply(
                `User (${args["user"]}) is already in the temporary exclusion of joingate.`,
            );
            return;
        }
        services.state.volatileState.exclude_joingate.add(args["user"]);
        await message.reply(
            `Added user (${args["user"]}) for temporary exclusion of joingate.`,
        );
    }
}
