import { Events, GuildMember, Message, MessageReaction, User } from "discord.js";
import { Services } from "../Services";

export default class BotEvent {
    /**
     * The name of the event to hook into.
     */
    public eventName: Events;

    /**
     * The code to execute on receiving the event.
     * @returns
     */
    async execute(services: Services, ...params: any) {
        return;
    }
}

// Store all the interfaces for events here, since it'll make everyone's life easier in the long run.
export interface MessageCreateEventData {
    message: Message
}

export interface MessageDeleteEventData {
    message: Message
}

export interface MessageReactionAddEventData {
    reaction: MessageReaction,
    user: User
}

export interface MessageReactionRemoveEventData{
    reaction: MessageReaction,
    user: User
}

export interface GuildMemberAddEventData {
    member: GuildMember
}

