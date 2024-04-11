const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('muteme')
    .setDescription('Is the Heeler House too addicting? I have the fix for you!')
    .addIntegerOption(option =>
      option.setName('length')
        .setDescription('Length in hours that you desire to be muted for. Default is 1 hour.')
        .setRequired(false)),
  async execute(interaction) {
    var target = interaction.options.getInteger('length');
    if (target != null) {
        await interaction.member.timeout(target * 3600000);
        await interaction.reply({ content: 'You have been muted for ' + target + ' hours.' });
    } else {
        await interaction.member.timeout(3600000);
        await interaction.reply({ content: 'You have been muted for 1 hour.' });
    }
  }
};