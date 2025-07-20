import { AttachmentBuilder, Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { devIds, roleIds } from "../../constants";

export default class DebugCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("debug")
        .setDescription("Various debug commands for Bilby development")
        .addImplicitStringArgument("args", "required args that only the dev knows lol")
        .addAllowedUsers(...devIds)
        .addAllowedRoles(roleIds.leadership) // Allowed in the very rare circumstance that staff need to fix bilby themselves.
        .allowInDMs(true);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        const argList = args["args"].split(" ")

        if (argList[0] == "") {
            await message.reply(":warning: **__READ THE FOLLOWING WARNING CAREFULLY__** :warning:\nIf you're running the debug command and see this, chances are you don't know what you're doing. In that case please stop while you're ahead.\nSome subcommands in this command can cause serious damage to Bilby's production environment if executed incorrectly.\n\nIf you *really* want to know what these commands do, ping one of the developers.");
            return;
        }

        let response: boolean = await (async () => {
            switch (argList[0]) {
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
                    let data = await services.database.collections.muteroulette.findOne({ user: argList[1] });
                    await message.reply({
                        files: [
                            new AttachmentBuilder(Buffer.from(JSON.stringify(data)))
                                .setName(`mr_${argList[1]}.json`)
                                .setDescription("Mute Roulette user data.")
                        ]
                    });
                    return true;
                case "perms_check":
                    if (!argList[0]) return false;

                    let commands = await message.guild.commands.fetch()
                    let bilbyCommands = commands.filter(command => command.applicationId == message.client.user.id);

                    let output = [];
                    for (let [name, bilbyCommand] of bilbyCommands) {
                        let permissions = await bilbyCommand.permissions.fetch({ command: bilbyCommand.id });

                        for (let permission of permissions) {
                            let name = "";
                            let type = "";
                            switch (permission.type) {
                                case 1: // Role
                                    type = "R";
                                    let role = await message.guild.roles.fetch(permission.id);
                                    name = role.name;
                                    break;
                                case 2: // User
                                    type = "U";
                                    let user = await message.guild.members.fetch(permission.id);
                                    name = user.displayName;
                                    break;
                                case 3: // Channel
                                    type = "C";
                                    let channel = await message.guild.channels.fetch(permission.id);
                                    name = channel.name;
                                    break;
                                default:
                                    name = "no clue lmao";
                            }
                            output.push(`[${type}] **${name}**: ${permission.permission ? ":white_check_mark:" : ":x:"}`);
                        }
                    }

                    await message.reply(output.length == 0 ? "no perms" : output.join("\n"));
                    return;
                case "volatile_state":
                    await message.reply({
                        files: [
                            new AttachmentBuilder(Buffer.from(JSON.stringify(services.state.volatileState)))
                                .setName(`vstate.json`)
                        ]
                    });
                    return true;
                default:
                    return false;
            }
        })();

        if (response === true) {
            await message.react("✅");
        } else if (response === false) {
            await message.react("❌");
        } else {
            // Assume it's already done
        }
    }
}