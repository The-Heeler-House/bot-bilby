import { ChannelType, Events, GuildMember, Message, TextChannel } from "discord.js";
import BotEvent, { MessageCreateEventData } from "../BotEvent";
import { THH_SERVER_ID } from "../../constants";
import { Services } from "../../Services";
import * as logger from "../../logger";

export default class ModerationPingEvent extends BotEvent {
    public eventName = Events.MessageDelete;

    async execute(services: Services, message: Message) {
        if (process.env.DEVELOPMENT_GUILD ? message.guild.id != process.env.DEVELOPMENT_GUILD : message.guild.id != THH_SERVER_ID) return;
        
        if ([ChannelType.DM, ChannelType.GroupDM].includes(message.channel.type)) return; // Don't log DMs.

        try {
            message.attachments.forEach(async attachment => {
                const image = attachment.proxyURL;

                const logChannel = await message.client.channels.fetch("1098673855809204294") as TextChannel;

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
            // TODO: This used to ping Jalen if there was a problem, maybe a proper paging system could be worked on as a service?
        }
    }
}