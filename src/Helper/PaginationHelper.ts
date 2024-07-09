import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, Message } from "discord.js";

export class PageBuilder {
    type: "plain_text" | "embed"
    content: string[]
    private baseEmbed: EmbedBuilder = new EmbedBuilder()
    private index = 0
    private controlDisabled = false

    private backButton = new ButtonBuilder()
        .setCustomId("back")
        .setEmoji("◀")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true) //? since index by default is zero
    private forwardButton = new ButtonBuilder()
        .setCustomId("forward")
        .setEmoji("▶")
        .setStyle(ButtonStyle.Primary)

    private control = new ActionRowBuilder<ButtonBuilder>()
        .setComponents(this.backButton, this.forwardButton)

    constructor(type: "plain_text" | "embed", content: string[]) {
        this.content = content
        this.type = type
    }

    private async updateControl(message: Message) {
        this.backButton = this.backButton
            .setDisabled(this.index <= 0 || this.controlDisabled)
        this.forwardButton = this.forwardButton
            .setDisabled(this.index >= this.content.length - 1 || this.controlDisabled)

        this.control.setComponents(this.backButton, this.forwardButton)
        await message.edit({
            components: [this.control]
        })
    }

    private async getContent(index: number) {
        switch (this.type) {
            case "embed":
                this.baseEmbed.setDescription(this.content[index])
                return {
                    embeds: [this.baseEmbed],
                    components: [this.control]
                }
            case "plain_text":
                return {
                    content: this.content[this.index],
                    components: [this.control]
                }
        }
    }

    /**
     * Use the base embed for the message if the `type` was set to `embed`
     * @param embed The base embed to use
     */
    setBaseEmbed(embed: EmbedBuilder) {
        if (this.type != "embed") throw new Error(`"type" must be "embed" to set a base embed`)
        this.baseEmbed = embed
    }

    /**
     * Send the pager to the channel of the `message`
     * @param message
     * @param inputTimeout Timeout in milliseconds before the button stop working
     */
    async send(message: Message, inputTimeout = 600_000) {
        let sentMessage = await message.channel.send(
            await this.getContent(this.index)
        )

        const collector = sentMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.user.id == message.author.id,
            time: inputTimeout
        })

        collector.on("collect", async (button) => {
            switch (button.customId) {
                case "back":
                    this.index--
                    break
                case "forward":
                    this.index++
                    break
            }

            await this.updateControl(sentMessage)
            await sentMessage.edit(await this.getContent(this.index))

            button.update({})
        })

        collector.on("end", async () => {
            this.controlDisabled = true
            await this.updateControl(sentMessage)
        })
    }
}