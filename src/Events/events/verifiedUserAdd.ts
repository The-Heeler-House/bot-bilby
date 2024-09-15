import { Client, Events, GuildMember } from "discord.js";
import BotEvent from "../BotEvent";
import { Services } from "../../Services";
import { isTHHorDevServer } from "../../Helper/EventsHelper";
import { roleIds } from "../../constants";
import * as logger from "../../logger"

export default class VerifiedUserAdd extends BotEvent {
    public eventName = Events.GuildMemberUpdate;

    async execute(client: Client, services: Services, member: GuildMember, newMember: GuildMember): Promise<void> {
        if (!isTHHorDevServer(newMember.guild.id)) return
        if (!(await newMember.guild.members.fetch(newMember.id))) return
        const userRoles = newMember.roles.cache

        if (userRoles.has(roleIds.newbie)) {
            try {
                await newMember.roles.remove(roleIds.verifying)
            } catch (e) {
                const errorMsg = `Unable to remove new member role from user "${newMember.user.username}" (id: ${newMember.id})! `
                logger.warning(errorMsg)
                await services.pager.sendPage(errorMsg)
            }
        }
    }
}
