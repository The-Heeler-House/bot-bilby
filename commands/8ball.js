const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Shake the magic 8-ball!')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('The question you want to ask the magic 8-ball.')
        .setRequired(true)),
  async execute(interaction) {
    var path = '../Bot-Bilby-Heeler-House/eightball/' + Math.floor(Math.random() * 20 + 1) + '.png'
    interaction.reply({ files: [path] });
  },
};