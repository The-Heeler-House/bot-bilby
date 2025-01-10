import { Message, PermissionsBitField, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds, channelIds } from "../../constants";

export default class ToggleMediaCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("toggle media")
        .setDescription("Toggles whether media are allowed in a channel.")
        .addAllowedRoles(roleIds.staff)
        .addChannelMentionArgument("channel", "Channel to disable media.")
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        let channel = await message.guild.channels.fetch(args["channel"]) as TextChannel;
        const currentPerms = channel.permissionOverwrites.cache.get(roleIds.fan)
        let current = false

        if (!currentPerms) {
            await channel.permissionOverwrites.create(roleIds.fan, {
                AttachFiles: false,
                EmbedLinks: false
            })
        } else {
            await channel.permissionOverwrites.edit(roleIds.fan, {
                AttachFiles: !currentPerms.allow.has(PermissionsBitField.Flags.AttachFiles),
                EmbedLinks: !currentPerms.allow.has(PermissionsBitField.Flags.EmbedLinks)
            })
            current = !currentPerms.allow.has(PermissionsBitField.Flags.AttachFiles)
        }
        await channel.send(`Successfully **${current ? "allow" : "disallow"}** media perms for everyone in <#${args["channel"]}> (excluding staff).`);
    }
}