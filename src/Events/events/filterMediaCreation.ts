import BotEvent from "../BotEvent"
import { ChannelType, Client, Events, GuildChannel, Message, TextChannel } from "discord.js"
import { Services } from "../../Services"
import { isTHHorDevServer } from "../../Helper/EventsHelper"
import { channelIds } from "../../constants"
import { SwearScanner } from "../../Helper/OCRHelper"

const swearScanner = new SwearScanner()

;
(async () => {
    await swearScanner.resetOCR()
    setInterval(async () => {
        await swearScanner.resetOCR()
    }, 3 * 60 * 60 * 1000)
})()

export default class FilterImageSentEvent extends BotEvent {
    public eventName = Events.MessageCreate;

    async execute(client: Client, services: Services, message: Message): Promise<void> {
        if (!services.state.state.detectSwearInMedia) return
        if (!isTHHorDevServer(message.guild.id)) return;

        if ([ChannelType.DM, ChannelType.GroupDM].includes(message.channel.type)) return; // Don't log DMs.

        if (message.channelId == channelIds.mediaLog) return; // Avoid logging media in the media log channel.
        if (message.author.id == client.user.id) return; // Avoid media from self

        if (services.state.state.ignoredChannels.includes(message.channelId)) return; // Don't log ignored channels.
        if (services.state.state.ignoredChannels.includes((message.channel as GuildChannel).parentId)) return; // Don't log children of ignored channels.
        if ((message.channel as GuildChannel).parent != null && services.state.state.ignoredChannels.includes((message.channel as GuildChannel).parent.parentId)) return; // Don't log children of children of ignored channels... This is getting absurd.

        swearScanner.swearWords = services.state.state.swearWords
        const imageURLs = message.attachments.filter(v => v.contentType.startsWith("image/")).map(v => v.url)
        imageURLs.push(...message.attachments.filter(v => v.contentType.startsWith("video/")).map(v => v.proxyURL + "format=webp"))
        imageURLs.push(...message.embeds.map(v => v.thumbnail.proxyURL))

        const ocrResult = await swearScanner.scan(imageURLs)
        const swearResult = ocrResult.result
        const logChannel = await message.client.channels.fetch(channelIds.mediaLog) as TextChannel;

        const timing: string[] = []

        for (let i = 0; i < ocrResult.timing.length; i += 4) {
            timing.push(`[${((ocrResult.timing[i + 1] - ocrResult.timing[i]) / 1000).toFixed(3)}s, ${((ocrResult.timing[i + 3] - ocrResult.timing[i + 2]) / 1000).toFixed(3)}s]`)
        }

        if (swearResult.length > 0) {
            await message.reply(`<@${message.author.id}>, Watch your language.`)
            for (const result of swearResult) {
                await logChannel.send({
                    content: `Swear detected in this image/video/embed: \`${result.swears.map(v => `${v.word} (${v.confidence.toFixed(2)}%)`).join(", ")}\` sent by <@${message.author.id}> in <#${message.channelId}>.`,
                    files: [{
                        attachment: result.url
                    }]
                })
            }
            await logChannel.send({
                content: `OCR timing (process image, ocr): \`${timing.join(" | ")}\``
            })
        }
    }
}