const { SlashCommandBuilder, time } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageSelectMenu, MessageButton } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('changelog')
    .setDescription('See what\'s new with Bot Bilby.'),
  async execute(interaction) {
    
    await interaction.reply({
      embeds: [
        {
          "title": "Bot Changelog",
          "color": 9356018,
          "description": "- Muteme? Why would anyone want to do that?\n- Muteroulette 2.0! Try your luck and don't get muted!\n- BILBY MUSIC PLAYER!!!\n- New episode guesser feature!\n- Play some Bluey themed hangman!\n- More commands coming soon!",
          "timestamp": "2024-04-11",
          "author": {
            "name": "Bot Bilby 3.0.0",
            "url": "",
            "icon_url": "https://cdn.discordapp.com/avatars/537583059348750336/22e5087eb405782afccab3e635c7df91.png?size=64"
          },
          "image": {},
          "thumbnail": {},
          "footer": {
            "text": "Created by Jalenluorion#6435"
          },
          "fields": []
        }
      ]
    });
  }
};