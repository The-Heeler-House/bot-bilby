const { SlashCommandBuilder, time } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageSelectMenu, MessageButton } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('changelog')
    .setDescription('See what\'s new with Bot Bilby.'),
  async execute(interaction) {

    interaction.reply({
      embeds: [
        {
          "title": "Bot Changelog",
          "color": 9356018,
          "description": "- Revamped commands to work with slash commands.\n- New chatbot features: Bilby, hello! Bilby, how are you?\n- Revamped ship command, complete with a new character picker.\n- Deprecated the rarely used tiermaker commands.\n- Search Blueypedia inside of Discord with the new Character command!\n- More commands coming soon!",
          "timestamp": "2022-01-03",
          "author": {
            "name": "Bot Bilby 2.2.1",
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