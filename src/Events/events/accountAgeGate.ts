import { Client, Events, GuildMember } from "discord.js";
import BotEvent from "../BotEvent";
import { Services } from "../../Services";
import * as logger from "../../logger";
import { isTHHorDevServer } from "../../Helper/EventsHelper";

export default class AccountAgeGateEvent extends BotEvent {
    public eventName = Events.GuildMemberAdd;

    async execute(client: Client, services: Services, member: GuildMember) {
        if (!isTHHorDevServer(member.guild.id)) return;

        const accountAge = Date.now() - member.user.createdTimestamp;
        const minAge = services.state.state.joinGate * 24 * 60 * 60 * 1000;
        if (accountAge < minAge) {
            await member
                .send(
                    `Welcome to The Heeler House! Unfortunately, your account is too new to join the server. Please try again in a few days. If you believe this is a mistake, please contact a staff member.`
                )
                .catch((error) => {
                    logger.error("Encountered an error while trying to inform user that they cannot join due to low account age. They most likely have DMs from server members off.\n", error);
                });
            await member.kick(`Account age is less than ${services.state.state.joinGate} days`);
        }
    }
}