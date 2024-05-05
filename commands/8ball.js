const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../Album');
const files = fs.readdirSync(directoryPath);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Shake the magic 8-ball!')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('The question you want to ask the magic 8-ball.')
        .setRequired(true)),
  async execute(interaction) {
    var path = directoryPath + "/" + Math.floor(Math.random() * 20 + 1) + '.png'
    await interaction.reply({ files: [path] });
  },
};