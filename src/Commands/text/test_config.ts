import {
    AttachmentBuilder,
    Message,
    PermissionFlagsBits,
    TextChannel,
} from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds, channelIds } from "../../constants";

function boolToEmoji(boolean) {
    return boolean ? "✅" : "❌";
}

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
                [name: string]: {
                    id: string;
                    cName: string;
                    canRead: boolean;
                    canSend: boolean;
                };
            },
            roles: {} as {
                [name: string]: { id: string; rName: string; exists: boolean };
            },
        };
        for (const cName in channelIds) {
            const cId = channelIds[cName];
            result.channels[cName] = {
                id: cId,
                cName: "unknown",
                canRead: false,
                canSend: false,
            };
            try {
                const cInstance = await message.guild.channels.fetch(cId);
                if (cInstance) {
                    result.channels[cName].cName = cInstance.name;
                }
                const me = message.guild.members.me;
                const perms = cInstance.permissionsFor(me);
                if (!perms) {
                    result.channels[cName].canRead = false;
                    result.channels[cName].canSend = false;
                }
                const sendPerm = cInstance.isThread()
                    ? PermissionFlagsBits.SendMessagesInThreads
                    : PermissionFlagsBits.SendMessages;
                result.channels[cName].canSend = perms.has([sendPerm]);
                result.channels[cName].canRead = perms.has([
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.ReadMessageHistory,
                ]);
            } catch {
                result.channels[cName].canRead = false;
                result.channels[cName].canSend = false;
            }
        }
        for (const roles in roleIds) {
            const rId = roleIds[roles];
            result.roles[roles] = { id: rId, rName: "unknown", exists: false };
            try {
                const rInstance = await message.guild.roles.fetch(rId);
                if (rInstance) {
                    result.roles[roles].rName = rInstance.name;
                }
                result.roles[roles].exists = true;
            } catch {
                result.roles[roles].exists = false;
            }
        }
        const textOutput = [
            "Test finished!",
            "Channels:",
            ...Object.entries(result.channels).map(([cName, cInfo]) =>
                [
                    ` \\- ${cName}`,
                    `    name: ${cInfo.cName}`,
                    `    id: ${cInfo.id}`,
                    `    can_read: ${boolToEmoji(cInfo.canRead)}`,
                    `    can_send: ${boolToEmoji(cInfo.canSend)}`,
                ].join("\n"),
            ),
            "Roles:",
            ...Object.entries(result.roles).map(([rName, rInfo]) =>
                [
                    ` \\- ${rName}`,
                    `    name: ${rInfo.rName}`,
                    `    id: ${rInfo.id}`,
                    `    exists: ${boolToEmoji(rInfo.exists)}`,
                ].join("\n"),
            ),
        ];
        await output.edit(textOutput.join("\n"));
    }
}
