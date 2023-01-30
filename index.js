console.log("Init!");
const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
var http = require('http');
const { MessageActionRow, MessageButton } = require('discord.js');
http.createServer(function(req, res) {
  res.write("I'm alive?");
  res.end();
}).listen(8080);
// Require the necessary discord.js classes
const {
  Client,
  Intents,
  Collection
} = require('discord.js');

// Create a new client instance
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
});
console.log("started!");
// Loading commands from the commands folder
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

const TOKEN = process.env.TOKEN;

// Edit your TEST_GUILD_ID here in the env file for development
const TEST_GUILD_ID = undefined;

// Creating a collection for commands in client
client.commands = new Collection();

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
  client.commands.set(command.data.name, command);
}

// When the client is ready, run this code (only once)
client.once('ready', () => {

  console.log('Ready!');
  // Registering the commands in the client
  const CLIENT_ID = client.user.id;
  const rest = new REST({
    version: '9'
  }).setToken(TOKEN);
  (async () => {
    try {
      if (!TEST_GUILD_ID) {

        await rest.put(
          Routes.applicationCommands(CLIENT_ID), {
            body: commands
          },
        );
        console.log('Successfully registered application commands globally');


        client.user.setActivity('with Daddy Robot!', { type: 'PLAYING' });

        const defaultChannel = client.channels.cache.get('1012812013795295233');
        setInterval(function() {
          defaultChannel.send("Disboard Bump Reminder! Remember to \`/bump\`!") //send it to whatever channel the bot has permissions to send on
        }, 120 * 60 * 1000);

      } else {
        await rest.put(
          Routes.applicationGuildCommands(CLIENT_ID, TEST_GUILD_ID), {
            body: commands
          },
        );
        console.log('Successfully registered application commands for development guild');

      }
    } catch (error) {
      if (error) console.error(error);
    }
  })();
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand())
    return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);

  } catch (error) {
    if (error) console.error(error);
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
  }
});

client.on('messageCreate', message => {
  console.log(message.content);

  if (message.content.toLowerCase().includes('bilby, hello')) {
    message.channel.send("Hi! How are you?");
  }
  else if (message.content.toLowerCase().includes('bilby, how are you')) {
    message.channel.send("I'm great! You?");
  }
  else if (message.content.toLowerCase().includes('bilby, hi')) {
    message.channel.send("I'm great! You?");
  }
  else if (message.content.toLowerCase().includes('bilby, help')) {
    message.channel.send("All commands are slash commands now! Type `/` to see what commands you can use!");
  } else if (message.content.toLowerCase().includes('bilby,')) {
    message.channel.send("You no longer need to call me to run a command! Just type `/` to see what commands you can use!");
  }
});



// Login to Discord with your client's token
client.login(TOKEN);
