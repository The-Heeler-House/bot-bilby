import { ChannelType, Events, GuildMember, Message, TextChannel } from "discord.js";
import BotEvent, { MessageCreateEventData } from "../BotEvent";
import { Services } from "../../Services";
import * as logger from "../../Logger";

export default class ModerationPingEvent extends BotEvent {
    public eventName = Events.MessageUpdate;

    async execute(services: Services, oldMessage: Message, newMessage: Message) {
        if ([ChannelType.DM, ChannelType.GroupDM].includes(oldMessage.channel.type)) return; // Don't log DMs.

        try {
            oldMessage.attachments.forEach(async (attachment, id) => {
                if (newMessage.attachments.has(id)) return; // The attachment wasn't deleted.
                const image = attachment.proxyURL;

                const logChannel = await oldMessage.client.channels.fetch("1098673855809204294") as TextChannel;

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
            // TODO: This used to ping Jalen if there was a problem, maybe a proper paging system could be worked on as a service?
        }
    }
}