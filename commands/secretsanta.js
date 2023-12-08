// Import the necessary modules
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('secretsanta')
        .setDescription('Register for the Secret Santa event')
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('Your prompt for the Secret Santa event')
                .setRequired(true)
        ),
    async execute(interaction) {
        // Get the prompt from the user's input
        const prompt = interaction.options.getString('prompt');

        // Send a success message to the user via DM
        await interaction.reply({ content: `You are now registered for the Secret Santa event with the prompt: ${prompt}`, ephemeral: true });
        await interaction.channel.send({ content: `Thank you for registering for the Secret Santa event! For other members, if you want to register, use the \`/secretsanta\` command.`});
        // Get the staff channel where the event details will be sent
        const staffChannel = interaction.guild.channels.cache.find(channel => channel.name === 'secretsanta-list');

        // Send the embed to the staff channel
        await staffChannel.send({ content: `<@${interaction.user.id}>: ${prompt}` });
    },
};
