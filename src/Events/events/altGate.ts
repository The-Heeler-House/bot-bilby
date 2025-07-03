import { Client, Events, GuildMember } from "discord.js";
import BotEvent from "../BotEvent";
import { Services } from "../../Services";
import * as logger from "../../logger";
import { roleIds } from "../../constants";
import { isTHHorDevServer } from "../../Helper/EventsHelper";

export default class AccountAgeGateEvent extends BotEvent {
    public eventName = Events.GuildMemberAdd;

    async execute(client: Client, services: Services, member: GuildMember) {
        if (!isTHHorDevServer(member.guild.id)) return;

        if (!services.state.state.altGate) {
            // assign them the heeler newbie role
            try {
                await member.roles.add(roleIds.newbie);
            } catch (e) {
                const errorMsg = `Unable to add Heeler Newbie role from user "${member.user.username}" (id: ${member.id})! `
                logger.warning(errorMsg, "\n", e)
                await services.pager.sendPage(errorMsg, "\n", e)
            }
        } else {
            // assign them the verifying role
            try {
                await member.roles.add(roleIds.verifying);
            } catch (e) {
                const errorMsg = `Unable to add Verifying role from user "${member.user.username}" (id: ${member.id})! `
                logger.warning(errorMsg, "\n", e)
                await services.pager.sendPage(errorMsg, "\n", e)
            }
        }
    }
}