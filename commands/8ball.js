const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
module.exports = {
	data: new SlashCommandBuilder()
		.setName('8ball')
		.setDescription('Shake the magic 8-ball!'),
	async execute(interaction) {
    var path = '../../eightball/' + Math.floor(Math.random() * 20 + 1) + '.png'
    const message = await interaction.reply({files: [path] });
	},
};