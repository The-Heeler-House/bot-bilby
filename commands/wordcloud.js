// Import the necessary modules
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wordcloud')
        .setDescription('Send in your word submissions for the word cloud')
        .addStringOption(option =>
            option.setName('word')
                .setDescription('Your word submission for the word cloud')
                .setRequired(true)
        ),
    async execute(interaction) {
        // Get the prompt from the user's input
        const prompt = interaction.options.getString('word');

        // Send a success message to the user via DM
        await interaction.reply({ content: `Your word submission has been sent to the staff team!`, ephemeral: true });
        await interaction.channel.send({ content: `Thank you for sending in your submission for the christmas word cloud! For other members, if you want to send in your word submission, use the \`/wordcloud\` command.` });
        // Get the staff channel where the event details will be sent
        const staffChannel = interaction.guild.channels.cache.find(channel => channel.name === 'heeler-house-word-cloud');

        // Send the embed to the staff channel
        await staffChannel.send({ content: `<@${interaction.user.id}>-${prompt}` });
    },
};
