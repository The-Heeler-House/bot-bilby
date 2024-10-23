import { ChannelType, Client, Events, Guild, GuildChannel, Message, TextChannel } from "discord.js";
import BotEvent from "../BotEvent";
import { channelIds } from "../../constants";
import { Services } from "../../Services";
import * as logger from "../../logger";
import { isTHHorDevServer } from "../../Helper/EventsHelper";

export default class MediaCreationEvent extends BotEvent {
    public eventName = Events.MessageCreate;

    async execute(client: Client, services: Services, message: Message) {
        if (!isTHHorDevServer(message.guild.id)) return;

        if ([ChannelType.DM, ChannelType.GroupDM].includes(message.channel.type)) return; // Don't log DMs.

        if (message.channelId == channelIds.mediaLog) return; // Avoid logging media in the media log channel.
        if (message.author.id == client.user.id) return; // Avoid media from self

        if (services.state.state.ignoredChannels.includes(message.channelId)) return; // Don't log ignored channels.
        if (services.state.state.ignoredChannels.includes((message.channel as GuildChannel).parentId)) return; // Don't log children of ignored channels.
        if ((message.channel as GuildChannel).parent != null && services.state.state.ignoredChannels.includes((message.channel as GuildChannel).parent.parentId)) return; // Don't log children of children of ignored channels... This is getting absurd.

        try {
            console.log(message.attachments)
            for (const [_, attachment] of message.attachments) {

                const imageReq = await fetch(attachment.url || attachment.proxyURL);
                const image = await imageReq.arrayBuffer();

                const attachmentSplitByDot = attachment.name.split(".");
                const extension = attachmentSplitByDot[attachmentSplitByDot.length-1];

                await services.s3.putBuffer("media", `${attachment.id}.${extension}`, Buffer.from(image));
            }
        } catch (error) {
            if (error.code == "EHOSTUNREACH") {
                // Can't reach the host, just warn.
                logger.warning("Failed to talk to S3 host. Is the server up?);
                await services.pager.sendPage("Warning: Failed to talk to S3 host. Is the server up? IP:");
            } else {
                logger.error("Encountered an error while trying to store attachments.\n", error, "\n", error.stack);
                await services.pager.sendError(error, "Trying to store attachments.", services.state.state.pagedUsers, { message });
            }
        }
    }
}
