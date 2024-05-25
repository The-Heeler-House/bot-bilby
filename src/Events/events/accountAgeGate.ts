import { Events, GuildMember, Message } from "discord.js";
import BotEvent, { MessageCreateEventData } from "../BotEvent";
import { THH_SERVER_ID } from "../../constants";
import { Services } from "../../Services";
import * as logger from "../../logger";

export default class AccountAgeGateEvent extends BotEvent {
    public eventName = Events.GuildMemberAdd;

    async execute(services: Services, member: GuildMember) {
        if (process.env.DEVELOPMENT_GUILD ? member.guild.id != process.env.DEVELOPMENT_GUILD : member.guild.id != THH_SERVER_ID) return;

        if (!services.state.state.joinGate) return; // The join age gate is disabled.

        const accountAge = Date.now() - member.user.createdTimestamp;
        const fiveDays = 432000000;
        if (accountAge < fiveDays) {
            await member
            .send(
                `Welcome to The Heeler House! Unfortunately, your account is too new to join the server. Please try again in a few days. If you believe this is a mistake, please contact a staff member.`
            )
            .catch((error) => {
                logger.error("Encountered an error while trying to inform user that they cannot join due to low account age. They most likely have DMs from server members off.\n", error);
            });
            await member.kick("Account age is less than 5 days");
        }
    }
}