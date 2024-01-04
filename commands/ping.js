const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bored')
    .setDescription('Are you bored? Let me give you something to do!'),
  async execute(interaction) {
    await interaction.deferReply();
    await wait(4_000);
    await interaction.reply(`Websocket heartbeat: ${interaction.client.ws.ping}ms.`);
  }
};
