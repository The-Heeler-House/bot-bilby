import { Client, Events, GuildEmoji, MessageReaction, TextChannel, User } from "discord.js";
import BotEvent from "../BotEvent";
import { channelIds } from "../../constants";
import { Services } from "../../Services";
import * as logger from "../../logger";
import { isTHHorDevServer } from "../../Helper/EventsHelper";

export default class ReactionTrackingAddEvent extends BotEvent {
    public eventName = Events.MessageReactionAdd;

    async execute(client: Client, services: Services, reaction: MessageReaction, user: User) {
        if (!isTHHorDevServer(reaction.message.guildId)) return;

        if (reaction.me) return; // Don't log our own reactions as they're spammy.

        if (reaction.message.partial) {
            // The message is only partial, try to fetch the full message.
            try {
                await reaction.message.fetch();
            } catch (error) {
                logger.error("Encountered an error while trying to fetch full message from a reaction add event (for reaction tracking).\n", error, "\n", error.stack);
                await services.pager.sendError(error, "Trying to fetch full message from a reaction add event.", services.state.state.pagedUsers, { reaction, user });
                return; // Don't continue execution.
            }
        }

        const isServerEmote = reaction.emoji instanceof GuildEmoji;
        const isCustomEmote = reaction.emoji.id;
        const staffChatChannel = await reaction.client.channels.fetch(channelIds.reactionLog) as TextChannel;
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

        services.state.volatileState.trackedReactions.set(`${reaction.message.id}_${reaction.emoji.id || reaction.emoji.toString()}`, {
            authorId: member.id,
            emote: reaction.emoji as GuildEmoji,
            timestamp: Date.now()
        });

        await staffChatChannel.send(`${emote} **added** by \`${member.displayName}\`: ${messageLink}`);
    }
}