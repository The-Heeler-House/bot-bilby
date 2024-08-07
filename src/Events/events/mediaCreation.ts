import { ChannelType, Events, Message, TextChannel } from "discord.js";
import BotEvent from "../BotEvent";
import { channelIds } from "../../constants";
import { Services } from "../../Services";
import * as logger from "../../logger";
import { isTHHorDevServer } from "../../Helper/EventsHelper";

export default class MediaCreationEvent extends BotEvent {
    public eventName = Events.MessageCreate;

    async execute(services: Services, message: Message) {
        if (!isTHHorDevServer(message.guild.id)) return;

        if ([ChannelType.DM, ChannelType.GroupDM].includes(message.channel.type)) return; // Don't log DMs.

        if (message.channelId == channelIds.mediaLog) return; // Avoid logging media in the media log channel.

        try {
            message.attachments.forEach(async attachment => {
                const imageReq = await fetch(attachment.url || attachment.proxyURL);
                const image = await imageReq.arrayBuffer();

                const attachmentSplitByDot = attachment.name.split(".");
                const extension = attachmentSplitByDot[attachmentSplitByDot.length-1];

                await services.s3.putBuffer("media", `${attachment.id}.${extension}`, Buffer.from(image));
            });
        } catch (error) {
            logger.error("Encountered an error while trying to store attachments.\n", error, "\n", error.stack);
            await services.pager.sendError(error, "Trying to store attachments.", services.state.state.pagedUsers, { message });
        }
    }
}