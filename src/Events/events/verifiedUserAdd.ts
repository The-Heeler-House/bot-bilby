import { Client, Events, GuildMember } from "discord.js";
import BotEvent from "../BotEvent";
import { Services } from "../../Services";
import { isTHHorDevServer } from "../../Helper/EventsHelper";
import { roleIds } from "../../constants";

export default class VerifiedUserAdd extends BotEvent {
    public eventName = Events.GuildMemberUpdate;

    async execute(client: Client, services: Services, _: GuildMember, newMember: GuildMember): Promise<void> {
        if (!isTHHorDevServer(newMember.guild.id)) return
        const userRoles = newMember.roles.cache

        if (userRoles.has(roleIds.newbie)) {
            await newMember.roles.remove(roleIds.verifying)
        }
    }
}
