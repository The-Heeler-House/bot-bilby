import { AttachmentBuilder, Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { devIds, roleIds } from "../../constants";

export default class DebugCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("debug")
        .setDescription("Various debug commands for Bilby development")
        .addAllowedUsers(...devIds)
        .addAllowedRoles(roleIds.staff) // Allowed in the very rare circumstance that staff need to fix bilby themselves.
        .allowInDMs(true);

    async execute(message: Message, args: string[], services: Services) {
        if (args[0] == "") {
            await message.reply(":warning: **__READ THE FOLLOWING WARNING CAREFULLY__** :warning:\nIf you're running the debug command and see this, chances are you don't know what you're doing. In that case please stop while you're ahead.\nSome subcommands in this command can cause serious damage to Bilby's production environment if executed incorrectly.\n\nIf you *really* want to know what these commands do, ping one of the developers.");
            return;
        }

        let response: boolean = await (async () => {
            switch (args[0]) {
                case "error_log":
                    // Outputs an error log as if an error was actually thrown.
                    await services.pager.sendError(new Error("Debug-intiaited error."), "Debug command", services.state.state.pagedUsers, { message, args });
                    return true;
                case "crash_log":
                    await services.pager.sendCrash(new Error("Debug-intiiated error"), "Debug command", services.state.state.pagedUsers, { message, args });
                    return true;
                case "page_log":
                    await services.pager.sendPage("Debug-initiated log");
                    return true;
                case "dump_mr_data":
                    let data = await services.database.collections.muteroulette.findOne({ user: args[1] });
                    await message.reply({
                        files: [
                            new AttachmentBuilder(Buffer.from(JSON.stringify(data)))
                                .setName(`mr_${args[1]}.json`)
                                .setDescription("Mute Roulette user data.")
                        ]
                    });
                    return true;
                default:
                    return false;
            }
        })();

        if (response === true) {
            await message.react("✅");
        } else {
            await message.react("❌");
        }
    }
}