const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageSelectMenu, MessageButton } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, getVoiceConnection, entersState, StreamType } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const { getIndex, setIndex } = require('../utilities.js');
const logger = require('../logger.js');

const directoryPath = path.join(__dirname, '../Album');
const files = fs.readdirSync(directoryPath);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('"Bluey the Album" music player!')
    .addSubcommand(subcommand =>
		subcommand
			.setName('play')
			.setDescription('Starts the album!'))
	  .addSubcommand(subcommand =>
		subcommand
			.setName('skip')
			.setDescription('Skips the current song!'))
    .addSubcommand(subcommand =>
        subcommand
            .setName('stop')
            .setDescription('Stops the album!')),
  async execute(interaction) {
    if (interaction.member.voice.channelId != '1017264556172640277' && interaction.member.voice.channelId != '1087252823445606461' && interaction.member.voice.channelId != '961064255921197156' && interaction.member.voice.channelId != '961495071478386698') {
      await interaction.reply('You must be in a general VC to use this command!');
      return;
    }
    if (interaction.options.getSubcommand() === 'play') {
      const checkingConnection = getVoiceConnection(interaction.guildId);
      if (checkingConnection.state.subscription != null){
        await interaction.reply('I\'m already playing something!');
        return;
      }
      const connection = joinVoiceChannel({
        channelId: interaction.member.voice.channelId,
        guildId: interaction.guildId, 
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });
      const player = createAudioPlayer(); 
      connection.subscribe(player);
      setIndex(0);
      currentIndex = getIndex();
      // play the first song
      player.play(createAudioResource(directoryPath + '/' + files[currentIndex], {
        inputType: StreamType.Arbitrary,
      }));
      // play the next song when the current one ends, restarting the album when the last song is finished
      player.on(AudioPlayerStatus.Idle, () => {
        if (currentIndex < files.length - 1) { 
          setIndex(currentIndex + 1);
        } else {
          setIndex(0);
        }
        currentIndex = getIndex();
        player.play(createAudioResource(directoryPath + '/' + files[currentIndex], {
          inputType: StreamType.Arbitrary,
        }));
        interaction.channel.send(`Now playing: ${files[currentIndex].slice(0, -4)}`);
      });

      // say the name of the song (should be the file name without the extension)
      await interaction.reply(`Now playing: ${files[currentIndex].slice(0, -4)}`);
    } else if (interaction.options.getSubcommand() === 'skip') {

      const connection = getVoiceConnection(interaction.guildId);
      if (connection.state.subscription == null){
        await interaction.reply('I\'m not playing anything!');
        return;
      }
      const player = connection.state.subscription.player; 
      if (currentIndex < files.length - 1) {
        setIndex(currentIndex + 1);
      } else {
        setIndex(0); 
      }
      currentIndex = getIndex();
      console.log(currentIndex) 
      player.play(createAudioResource(directoryPath + '/' + files[currentIndex], {
        inputType: StreamType.Arbitrary,
      }));
      await interaction.reply(`Now playing: ${files[currentIndex].slice(0, -4)}`);
    } else if (interaction.options.getSubcommand() === 'stop') {
      // stops the player and disconnects from the voice channel
      const connection = getVoiceConnection(interaction.guildId);
      if (connection.state.subscription == null){ 
        await interaction.reply('I\'m not playing anything!');
        return; 
      }
      const player = connection.state.subscription.player;
      player.stop();
      connection.destroy();
      await interaction.reply('Stopping "Bluey the Album"!');

      const vChannel = interaction.client.channels.cache.get('1031750969203114035');
      const newConnection = joinVoiceChannel({
        channelId: vChannel.id, 
        guildId: vChannel.guild.id,
        adapterCreator: vChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: true
      });
      console.log('Joined voice channel');
    }
  }
};