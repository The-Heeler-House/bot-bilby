const { SlashCommandBuilder } = require('@discordjs/builders');
const wait = require('node:timers/promises').setTimeout;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('is bilby dying'),
    async execute(interaction) {
        await interaction.deferReply();
        await interaction.followUp(`Websocket heartbeat: ${interaction.client.ws.ping}ms.`);
    }
};
