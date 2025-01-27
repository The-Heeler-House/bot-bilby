import { Client, Events, Interaction, TextChannel } from "discord.js";
import BotEvent from "../BotEvent";
import { Services } from "../../Services";
import { badWordFilter, channelIds } from "../../constants";

export default class FilterSlashCommandEvent extends BotEvent {
    public eventName = Events.InteractionCreate;

    async execute(client: Client, services: Services, interaction: Interaction) {
        const logChannel = await interaction.client.channels.fetch(channelIds.chatLog) as TextChannel;
        if (!interaction.isChatInputCommand()) return

        const concatenatedOptions = interaction.options.data.map(v => `[${v.name}: ${v.value}]`).join(" ")

        let concatenatedData = interaction.options.data.map(v => v.value).join(" ")
        let wordList = concatenatedData.split(/\b/g).map(v => v.trim().toLowerCase().normalize("NFD").replace(/(\p{Diacritic})|[^a-zA-Z0-9 ]/gu, "")).filter(v => v)
        let detected = false
        detect_loop: for (let word of wordList) {
            for (let matchAll of badWordFilter.match_all) {
                if (word.includes(matchAll)) {
                    detected = true
                    break detect_loop
                }
            }
            for (let matchExact of badWordFilter.match_exact) {
                if (word == matchExact.toLowerCase()) {
                    detected = true
                    break detect_loop
                }
            }
        }
        if (detected) {
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