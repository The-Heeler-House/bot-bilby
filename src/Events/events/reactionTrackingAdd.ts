import { Events, GuildEmoji, GuildMember, Message, MessageReaction, TextChannel, User } from "discord.js";
import BotEvent, { MessageCreateEventData } from "../BotEvent";
import { THH_SERVER_ID, channelIds } from "../../constants";
import { Services } from "../../Services";
import * as logger from "../../logger";

export default class ReactionTrackingAddEvent extends BotEvent {
    public eventName = Events.MessageReactionAdd;

    async execute(services: Services, reaction: MessageReaction, user: User) {
        if (process.env.DEVELOPMENT_GUILD ? reaction.message.guildId != process.env.DEVELOPMENT_GUILD : reaction.message.guildId != THH_SERVER_ID) return;

        if (reaction.message.partial) {
            // The message is only partial, try to fetch the full message.
            try {
                await reaction.message.fetch();
            } catch (error) {
                logger.error("Encountered an error while trying to fetch full message from a reaction add event (for reaction tracking).\n", error, "\n", error.stack);
                await services.pager.sendError(error, "Trying to fetch full message from a reaction add event.", services.state.state.pagedUsers);
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

        staffChatChannel.send(`${emote} **added** by \`${member.displayName}\`: ${messageLink}`);
    }
}