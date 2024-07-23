import { ChannelType, Events, Message, TextChannel } from "discord.js";
import BotEvent from "../BotEvent";
import { channelIds } from "../../constants";
import { Services } from "../../Services";
import * as logger from "../../logger";
import { isTHHorDevServer } from "../../Helper/EventsHelper";

export default class ModerationPingEvent extends BotEvent {
    public eventName = Events.MessageDelete;

    async execute(services: Services, message: Message) {
        if (!isTHHorDevServer(message.guild.id)) return;

        if ([ChannelType.DM, ChannelType.GroupDM].includes(message.channel.type)) return; // Don't log DMs.

        try {
            message.attachments.forEach(async attachment => {
                const image = attachment.proxyURL;

                const logChannel = await message.client.channels.fetch(channelIds.mediaLog) as TextChannel;

                await logChannel.send({
                    files: [
                        {
                            attachment: image,
                            name: attachment.name
                        }
                    ],
                    content: `File sent by <@${message.author.id}> deleted in <#${message.channel.id}>`
                });
            });
        } catch (error) {
            logger.error("Encountered an error while trying to log deleted attachments.\n", error, "\n", error.stack);
            await services.pager.sendError(error, "Trying to log deleted attachments.", services.state.state.pagedUsers, { services, message });
            // TODO: This used to ping Jalen if there was a problem, maybe a proper paging system could be worked on as a service?
        }
    }
}