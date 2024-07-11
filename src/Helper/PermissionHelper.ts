// Permission-related helper functions.

import { GuildMember } from "discord.js";
import TextCommand from "../Commands/TextCommand";

/**
 * Checks whether the member can use the command.
 * @param command The command to check permissions for.
 * @param member The member running the command.
 * @returns `true` if the member is allowed to run the command, `false` if not.
 */
export function canExecuteCommand(command: TextCommand, member: GuildMember) {
    // User allows override role allows/denies.
    let allowed = false;

    // Gets list of current user's roles allowed to use the command
    let allowedUserRoles = member.roles.cache.filter((_, snowflake) => command.data.permissions.allowedRoles.includes(snowflake));

    // Gets list of current user's roles which deny use of the command
    let deniedUserRoles = member.roles.cache.filter((_, snowflake) => command.data.permissions.deniedRoles.includes(snowflake));

    if (allowedUserRoles.size != 0 || command.data.permissions.allowedRoles.length == 0)
        allowed = true; // Either the user has a role that allows them to use the command, or there are no allowed roles, which implicitly allows all roles.

    if (deniedUserRoles.size != 0)
        allowed = false; // The user has a role that denies them from using the command.

    if (command.data.permissions.allowedUsers.includes(member.user.id))
        allowed = true; // The user's id is in the allowed users list.

    return allowed;
}