import {
    AttachmentBuilder,
    Message,
    PermissionFlagsBits,
    TextChannel,
} from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds, channelIds } from "../../constants";

export default class TestConfigCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("test config")
        .setDescription("Test the configuration file.")
        .addAllowedRoles(roleIds.mod)
        .allowInDMs(false);

    async execute(
        message: Message,
        args: { [key: string]: string },
        services: Services,
    ) {
        const output = await message.reply(
            ":hourglass: Testing, please wait...",
        );
        const result = {
            channels: {} as {
                [key: string]: { canRead: boolean; canSend: boolean };
            },
            roles: {} as { [key: string]: boolean },
        };
        for (const channel in channelIds) {
            const id = channelIds[channel];
            try {
                const channelInstance = await message.guild.channels.fetch(id);
                const me = message.guild.members.me;
                const perms = channelInstance.permissionsFor(me);
                if (!perms) {
                    result.channels[channel].canRead = false;
                    result.channels[channel].canSend = false;
                }
                const sendPerm = channelInstance.isThread()
                    ? PermissionFlagsBits.SendMessagesInThreads
                    : PermissionFlagsBits.SendMessages;
                result.channels[channel].canSend = perms.has([sendPerm]);
                result.channels[channel].canRead = true;
            } catch {
                result.channels[channel].canRead = false;
                result.channels[channel].canSend = false;
            }
        }
        for (const roles in roleIds) {
            const id = roleIds[roles];
            try {
                await message.guild.roles.fetch(id);
                result.roles[roles] = true;
            } catch {
                result.roles[roles] = false;
            }
        }
        const textOutput = [
            "Test result for server:",
            "Channels:",
            ...Object.entries(result.channels).map(
                ([channel, perms]) =>
                    ` \\- <#${channel}> (${channel}) read=${perms.canRead}, send=${perms.canSend}`,
            ),
            "Roles:",
            ...Object.entries(result.roles).map(
                ([role, hasRole]) =>
                    ` \\- <@&${role}> (${role}): ${hasRole ? "exists" : "does not exist"}`,
            ),
        ];
        await output.edit(textOutput.join("\n"));
    }
}
