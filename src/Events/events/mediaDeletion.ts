import { AttachmentBuilder, ChannelType, Client, Events, GuildChannel, Message, TextChannel } from "discord.js";
import BotEvent from "../BotEvent";
import { channelIds } from "../../constants";
import { Services } from "../../Services";
import * as logger from "../../logger";
import { isTHHorDevServer } from "../../Helper/EventsHelper";
import { S3Error } from "minio";

export default class ModerationPingEvent extends BotEvent {
    public eventName = Events.MessageDelete;

    async execute(client: Client, services: Services, message: Message) {
        if (!isTHHorDevServer(message.guild.id)) return;

        if ([ChannelType.DM, ChannelType.GroupDM].includes(message.channel.type)) return; // Don't log DMs.
        if (message.author.id == client.user.id) return; // Avoid media from self

        if (services.state.state.ignoredChannels.includes(message.channelId)) return; // Don't log ignored channels.
        if (services.state.state.ignoredChannels.includes((message.channel as GuildChannel).parentId)) return; // Don't log children of ignored channels.
        if ((message.channel as GuildChannel).parent != null && services.state.state.ignoredChannels.includes((message.channel as GuildChannel).parent.parentId)) return; // Don't log children of children of ignored channels... This is getting absurd.

        try {
            message.attachments.forEach(async attachment => {
                const imageUrl = attachment.url || attachment.proxyURL;
                const logChannel = await message.client.channels.fetch(channelIds.mediaLog) as TextChannel;

                const attachmentSplitByDot = attachment.name.split(".");
                const extension = attachmentSplitByDot[attachmentSplitByDot.length-1];

                // First lets see if we can find it.
                try {
                    let imageFromS3 = await services.s3.get("media", `${attachment.id}.${extension}`);

                    await logChannel.send({
                        files: [ new AttachmentBuilder(imageFromS3, { name: attachment.name }) ],
                        content: `File sent by <@${message.author.id}> deleted in <#${message.channel.id}>.`
                    });
                } catch (err: any) {
                    if (err instanceof S3Error && err.code == "NoSuchKey") {
                        await logChannel.send({
                            files: [
                                {
                                    attachment: imageUrl,
                                    name: attachment.name
                                }
                            ],
                            content: `File sent by <@${message.author.id}> deleted in <#${message.channel.id}>. Image was not saved externally, attempting to get from Discord CDN as fallback.`
                        });
                    } else if (error.code == "EHOSTUNREACH") {
                        // Can't reach the host, just warn.
                        logger.warning("Failed to talk to S3 host. Is the server up?");
                        await services.pager.sendPage("Warning: Failed to talk to S3 host. Is the server up?");

                        await logChannel.send({
                            files: [
                                {
                                    attachment: imageUrl,
                                    name: attachment.name
                                }
                            ],
                            content: `File sent by <@${message.author.id}> deleted in <#${message.channel.id}>. Image was not saved externally, attempting to get from Discord CDN as fallback.`
                        });
                    } else {
                        logger.error("Encountered an error while trying to log deleted attachments.\n", err, "\n", err.stack);
                        await services.pager.sendError(err, "Trying to log deleted attachments.", services.state.state.pagedUsers, { message });
                    }
                }
            });
        } catch (error) {
            logger.error("Encountered an error while trying to log deleted attachments.\n", error, "\n", error.stack);
            await services.pager.sendError(error, "Trying to log deleted attachments.", services.state.state.pagedUsers, { message });
            // TODO: This used to ping Jalen if there was a problem, maybe a proper paging system could be worked on as a service?
        }
    }
}
