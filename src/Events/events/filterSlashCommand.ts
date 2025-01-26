import { Client, Events, Interaction, TextChannel } from "discord.js";
import BotEvent from "../BotEvent";
import { Services } from "../../Services";
import { badWordRegex, channelIds } from "../../constants";

export default class FilterSlashCommandEvent extends BotEvent {
    public eventName = Events.InteractionCreate;

    async execute(client: Client, services: Services, interaction: Interaction) {
        const logChannel = await interaction.client.channels.fetch(channelIds.chatLog) as TextChannel;
        if (!interaction.isChatInputCommand()) return

        const concatenatedOptions = interaction.options.data.map(v => `[${v.name}: ${v.value}]`).join(" ")

        for (let data of interaction.options.data) {
            let value = String(data.value)
            console.log(value, badWordRegex.test(value))
            if (badWordRegex.test(value)) {
                await interaction.deleteReply()
                await interaction.followUp({
                    content: `<@${interaction.user.id}>, Watch your language!`,
                    ephemeral: true
                })
                await logChannel.send({
                    content: `Interaction sent by <@${interaction.user.id}> deleted in <#${interaction.channelId}>. Interaction command was: \`/${interaction.commandName} ${concatenatedOptions}\``
                })
                return
            }
        }
    }
}