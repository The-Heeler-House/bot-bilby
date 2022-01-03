const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageSelectMenu, MessageButton } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fortune')
    .setDescription('Check your or someone\'s fortune!')
    .addMentionableOption(option =>
      option.setName('person')
        .setDescription('The person who\'s fortune you want to check. OPTIONAL.')
        .setRequired(false)),
  async execute(interaction) {
    var target = interaction.options.getMentionable('person');
    function ra(ary) {
      return ary[Math.floor(Math.random() * ary.length)];
    };
    var fortune = ra([
      'Reply hazy, try again.',
      'Excellent Luck.',
      'Good Luck.',
      'Average Luck.',
      'Bad Luck.',
      'Good news will come to you by mail.',
      '（　´_ゝ`）ﾌｰﾝ.',
      'ｷﾀ━━━━━━(ﾟ∀ﾟ)━━━━━━ !!!!',
      'You will meet a dark handsome stranger.',
      'Better not tell you now.',
      'Outlook good.',
      'Very Bad Luck.',
      'Godly Luck.'
    ])
    if (target != null){
    const message = await interaction.reply({ content: '<@' + target + '>\'s fortune: ' + fortune, fetchReply: true });
    } else {
          const message = await interaction.reply({ content: 'Your fortune: ' + fortune, fetchReply: true });
    }
  }
};