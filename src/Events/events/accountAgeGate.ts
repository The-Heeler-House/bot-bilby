import { Client, Events, GuildMember, TextChannel } from "discord.js";
import BotEvent from "../BotEvent";
import { Services } from "../../Services";
import * as logger from "../../logger";
import { isTHHorDevServer } from "../../Helper/EventsHelper";
import { channelIds } from "../../constants"

export default class AccountAgeGateEvent extends BotEvent {
    public eventName = Events.GuildMemberAdd;

    async execute(client: Client, services: Services, member: GuildMember) {
        if (!isTHHorDevServer(member.guild.id)) return;

        const dayToMiliseconds = 24 * 60 * 60 * 1000

        const accountAge = Date.now() - member.user.createdTimestamp;
        const minAge = services.state.state.joinGate * dayToMiliseconds;
        if (accountAge < minAge) {
            await member
                .send(
                    `Welcome to The Heeler House! Unfortunately, your account is too new to join the server. Please try again in a few days. If you believe this is a mistake, please contact a staff member.`
                )
                .catch((error) => {
                    logger.error("Encountered an error while trying to inform user that they cannot join due to low account age. They most likely have DMs from server members off.\n", error);
                });
            await member.kick(`Account age is less than ${services.state.state.joinGate} days`);
            const channel = await client.channels.fetch(channelIds.memberLog) as TextChannel;
            await channel.send(`Member KICKED by the account age gate.\nUser: <@${member.user.id}> [${member.user.username}] (${member.user.id})\nAccount age: ${accountAge / dayToMiliseconds} days < ${services.state.state.joinGate} days`)
        }
    }
}