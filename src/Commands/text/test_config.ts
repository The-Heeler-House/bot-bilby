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
                    canRead: boolean;
                    canSend: boolean;
                };
            },
            roles: {} as { [name: string]: { id: string; exists: boolean } },
        };
        for (const cName in channelIds) {
            const cId = channelIds[cName];
            result.channels[cName] = {
                id: cId,
                canRead: false,
                canSend: false,
            };
            try {
                const cInstance = await message.guild.channels.fetch(cId);
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
            result.roles[roles] = { id: rId, exists: false };
            try {
                await message.guild.roles.fetch(rId);
                result.roles[roles].exists = true;
            } catch {
                result.roles[roles].exists = false;
            }
        }
        const textOutput = [
            "Test finished!",
            "Channels:",
            ...Object.entries(result.channels).map(
                ([cName, cInfo]) =>
                    ` \\- ${cName} (<#${cInfo.id}>) [${cInfo.id}] read=${boolToEmoji(cInfo.canRead)}, send=${boolToEmoji(cInfo.canSend)}`,
            ),
            "Roles:",
            ...Object.entries(result.roles).map(
                ([rName, rInfo]) =>
                    ` \\- ${rName} [${rInfo.id}]: exists=${boolToEmoji(rInfo.exists)}`,
            ),
        ];
        await output.edit(textOutput.join("\n"));
    }
}
