import { Events, GuildEmoji, GuildMember, Message, MessageReaction, TextChannel, User } from "discord.js";
import BotEvent, { MessageCreateEventData } from "../BotEvent";
import { Services } from "../../Services";
import * as logger from "../../Logger";

export default class ReactionTrackingAddEvent extends BotEvent {
    public eventName = Events.MessageReactionRemove;

    async execute(services: Services, reaction: MessageReaction, user: User) {
        if (reaction.message.partial) {
            // The message is only partial, try to fetch the full message.
            try {
                await reaction.message.fetch();
            } catch (error) {
                logger.error("Encountered an error while trying to fetch full message from a reaction add event (for reaction tracking).\n", error, "\n", error.stack);
                return; // Don't continue execution.
            }
        }

        const isServerEmote = reaction.emoji instanceof GuildEmoji;
        const isCustomEmote = reaction.emoji.id;
        const staffChatChannel = await reaction.client.channels.fetch("1241199271022301266") as TextChannel;
        const reactionEmoteImage = reaction.emoji.imageURL({
            extension: "png",
            size: 128
        });

        const messageLink = reaction.message.url;

        const emote = isCustomEmote 
            ? !isServerEmote
                ? `[:${reaction.emoji.name}:](${reactionEmoteImage})`
                : reaction.emoji.toString()
            : reaction.emoji.toString();

        const member = await reaction.message.guild.members.fetch(user.id);

        staffChatChannel.send(`${emote} **removed** by \`${member.displayName}\`: ${messageLink}`);
    }
}