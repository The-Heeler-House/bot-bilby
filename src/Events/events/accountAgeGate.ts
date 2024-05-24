import { Events, GuildMember, Message } from "discord.js";
import BotEvent, { MessageCreateEventData } from "../BotEvent";
import { Services } from "../../Services";
import * as logger from "../../logger";

export default class AccountAgeGateEvent extends BotEvent {
    public eventName = Events.GuildMemberAdd;

    async execute(services: Services, member: GuildMember) {
        if (!services.state.state.joinGate) return; // The join age gate is disabled.
        if (member.guild.id != "959534476520730724" && process.env.DEVELOPMENT_GUILD == undefined) return;

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