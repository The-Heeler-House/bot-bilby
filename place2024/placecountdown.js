const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('placecountdown')
    .setDescription('How many days until r/Place 2024? (rumored)'),
  async execute(interaction) {
    const date1 = new Date();
    const date2 = new Date('2024-06-023');
    const diffTime = Math.abs(date2 - date1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    await interaction.reply({ content: 'There are ' + diffDays + ' days until r/Place 2024! (rumored)' });
  }
};