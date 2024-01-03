const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageSelectMenu, MessageButton } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bored')
    .setDescription('Are you bored? Let me give you something to do!'),
  async execute(interaction) {
    function ra(ary) {
      return ary[Math.floor(Math.random() * ary.length)];
    };
    var bored = ra([
      "fly to Paris!", "go bungee jumping!", "binge Season 2 of Bluey!", "learn to sail!", "go metal detecting!", "write a book!", "read a book!", "paint a painting!", "develop a model rocket!", "dress up as a granny!", "go out in public with a balloon and start a mass game of keepy-uppy!", "edit together an AMAZING bluey meme!", "DM Dolphinman with more suggestions of things to do when you're bored!", "go to the beach!", "write about your life!", "start a diary!", "cook a cake!", "write a song!", "sing a song!", "join a band!", "train for a triathlon!", "run a triathlon!"
    ])
    await interaction.editReply({ content: 'So you\'re bored ' + interaction.user.tag + '? You should ' + bored });
  }
};