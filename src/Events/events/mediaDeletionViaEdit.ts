import { ChannelType, Client, Events, GuildChannel, Message, TextChannel } from "discord.js";
import BotEvent from "../BotEvent";
import { channelIds } from "../../constants";
import { Services } from "../../Services";
import * as logger from "../../logger";
import { isTHHorDevServer } from "../../Helper/EventsHelper";

export default class ModerationPingEvent extends BotEvent {
    public eventName = Events.MessageUpdate;

    async execute(client: Client, services: Services, oldMessage: Message, newMessage: Message) {
        if (!isTHHorDevServer(oldMessage.guildId)) return;

        if ([ChannelType.DM, ChannelType.GroupDM].includes(oldMessage.channel.type)) return; // Don't log DMs.

        if (services.state.state.ignoredChannels && services.state.state.ignoredChannels.includes(newMessage.channelId)) return; // Don't log ignored channels.
        if (services.state.state.ignoredChannels && services.state.state.ignoredChannels.includes((newMessage.channel as GuildChannel).parentId)) return; // Don't log children of ignored channels.
        if ((newMessage.channel as GuildChannel).parent != null && services.state.state.ignoredChannels && services.state.state.ignoredChannels.includes((newMessage.channel as GuildChannel).parent.parentId)) return; // Don't log children of children of ignored channels... This is getting absurd.

        try {
            oldMessage.attachments.forEach(async (attachment, id) => {
                if (newMessage.attachments.has(id)) return; // The attachment wasn't deleted.
                const image = attachment.proxyURL;

                const logChannel = await oldMessage.client.channels.fetch(channelIds.mediaLog) as TextChannel;

                await logChannel.send({
                    files: [
                        {
                            attachment: image,
                            name: attachment.name
                        }
                    ],
                    content: `File sent by <@${oldMessage.author.id}> deleted in <#${oldMessage.channel.id}>`
                });
            });
        } catch (error) {
            logger.error("Encountered an error while trying to log deleted attachments as part of a message edit.\n", error, "\n", error.stack);
            await services.pager.sendError(error, "Trying to log deleted attachments as part of a message edit.", services.state.state.pagedUsers, { oldMessage, newMessage });
            // TODO: This used to ping Jalen if there was a problem, maybe a proper paging system could be worked on as a service?
        }
    }
}