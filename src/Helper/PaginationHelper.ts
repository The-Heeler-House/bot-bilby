import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, Message, MessageCreateOptions, MessageEditOptions, TextChannel } from "discord.js";

export class PageBuilder {
    type: "plain_text" | "embed"
    content: string[]
    private baseEmbed: EmbedBuilder = new EmbedBuilder()
    private index = 0
    private controlDisabled = false
    private topText = null;
    private bottomText = null;

    private backButton = new ButtonBuilder()
        .setCustomId("back")
        .setEmoji("◀")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true) //? since index by default is zero
    private pageButton = new ButtonBuilder()
        .setCustomId("current-page")
        .setLabel("Page ? of ?")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true) // This button will never be pushed.
    private forwardButton = new ButtonBuilder()
        .setCustomId("forward")
        .setEmoji("▶")
        .setStyle(ButtonStyle.Primary)

    private control = new ActionRowBuilder<ButtonBuilder>()
        .setComponents(this.backButton, this.forwardButton)

    constructor(type: "plain_text" | "embed", content: string[], topText?: string, bottomText?: string) {
        this.content = content
        this.type = type
        this.topText = topText;
        this.bottomText = bottomText;
    }

    private updateControl() {
        this.backButton = this.backButton
            .setDisabled(this.index <= 0 || this.controlDisabled)
        this.pageButton = this.pageButton
            .setLabel(`Page ${this.index+1} of ${this.content.length}`);
        this.forwardButton = this.forwardButton
            .setDisabled(this.index >= this.content.length - 1 || this.controlDisabled)

        this.control.setComponents(this.backButton, this.pageButton, this.forwardButton)
    }

    private async createMessage(content: MessageCreateOptions, message: Message): Promise<Message> {
        this.updateControl();

        content.components = [this.control];

        return await (message.channel as TextChannel).send(content);
    }

    private async update(content: MessageEditOptions, message: Message) {
        this.updateControl();

        content.components = [this.control];

        await message.edit(content);
    }

    private async getContent(index: number) {
        switch (this.type) {
            case "embed":
                this.baseEmbed.setDescription(`${this.topText || ""}${this.content[index]}${this.bottomText || ""}`);
                return {
                    embeds: [this.baseEmbed],
                }
            case "plain_text":
                return {
                    content: `${this.topText || ""}${this.content[index]}${this.bottomText || ""}`,
                }
        }
    }

    /**
     * Use the base embed as the template for the message if the `type` was set to `embed`
     * @param embed The base embed to use
     */
    setBaseEmbed(embed: EmbedBuilder) {
        if (this.type != "embed") throw new Error(`"type" must be "embed" to set a base embed`)
        this.baseEmbed = embed
    }

    /**
     * Send the pager to the channel of the origin `message`
     * @param message
     * @param inputTimeout Timeout in milliseconds before the buttons are disabled
     */
    async send(message: Message, inputTimeout = 600_000) {
        let sentMessage = await this.createMessage(await this.getContent(this.index), message);

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

            await this.update(await this.getContent(this.index), sentMessage)
            await button.update({})
        })

        collector.on("end", async () => {
            this.controlDisabled = true
            await this.update(await this.getContent(this.index), sentMessage);
        })
    }
}