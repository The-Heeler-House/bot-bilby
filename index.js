const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
var http = require('http');
var dayjs = require('dayjs-with-plugins')

http.createServer(function (req, res) {
  res.write("I'm alive");
  res.end();
}).listen(8080);

// Require the necessary discord.js classes
const {
  Client,
  Intents,
  Collection,
  GatewayIntentBits,
  ActivityType,
} = require('discord.js');

// Create a new client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions]
});

// Loading commands from the commands folder
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

const TOKEN = process.env['TOKEN'];

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

        client.user.setPresence({
          activities: [{ name: `a rugby game!`, type: ActivityType.Competing }],
          status: 'dnd',
        });

        const defaultChannel = client.channels.cache.get('1012812013795295233');
        setInterval(function () {
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
  if (!interaction.isChatInputCommand()) {
    console.log("other called");
    return;
  }
  const command = client.commands.get(interaction.commandName);
  try {
    await command.execute(interaction);
  } catch (error) {
    if (error) console.error(error);
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
  }
});

client.on('messageCreate', async message => {
  console.log(message.content);
  if (message.mentions.roles.has("960044331572547654")) {
    const staffChatChannel = await client.channels.fetch("1079596899335680000");

    // Send the message link to the #staff-chat channel
    const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
    staffChatChannel.send(`Moderator ping detected!\n${messageLink}`);
  }
  if (message.content.toLowerCase().includes('bilby, hello')) {
    message.channel.send("Hi! How are you?");
  } else if (message.content.toLowerCase().includes('bilby, play mlp guess')) {
    ohDear(message)
  } else if (message.content.toLowerCase().includes('bilby, say ')) {
    const hehe = client.channels.cache.get('962936076404686859');
    hehe.send(message.content.substring(10));
  } else if (message.content.toLowerCase().includes('bilby, hide')) {
    client.user.setStatus('invisible');
  } else if (message.content.toLowerCase().includes('bilby, unhide')) {
    client.user.setStatus('online');
  }
});

async function ohDear(message) {
  const text = fs.readFileSync(('../src/episodeDescMLP.txt'), 'utf-8');

  // define a regular expression to match each episode
  const regex = /^S(\d+) E(\d+) · (.+)$([\s\S]+?)^$/gm;

  // create an array to store the episode information
  const episodes = [];

  // iterate over each match of the regular expression
  let match;
  while ((match = regex.exec(text))) {
    const season = match[1];
    const episode = match[2];
    const name = match[3];
    const description = match[4].trim();
    episodes.push({ season, episode, name, description });
  }

  // initialize the game state
  let score = 0;
  let remainingLives = 3;
  let currNum = 0;
  let timer = 12500;
  let currentEpisode;

  // start the game loop
  shuffle(episodes);

  // send a welcome message to the user
  await message.channel.send('Welcome to the game! I will give you an episode description, and you reply with the episode title! You have three lives, how much episodes can you name?');

  // ask the first question
  askQuestion(message);

  async function askQuestion(message) {
    // if there are no remaining questions, end the game
    if (remainingLives === 0) {
      await endGame(message, score);
      return;
    }

    // select the next episode and decrement the remainingLives counter
    currentEpisode = episodes.pop();
    currNum++;

    // send the episode description as a question
    await message.channel.send(`Question ${currNum}: ${currentEpisode.description}`);

    // create a filter to only listen to the user's next message in the same channel
    const filter = (message1) => message1.author.id === message.author.id && message1.channel.id === message.channel.id;

    // wait for the user's answer
    try {
      const answerMessage = await message.channel.awaitMessages({ filter, max: 1, time: timer, errors: ['time'] });
      const answer = answerMessage.first().content;

      // if the user's answer matches the episode name, increment the score
      if (answer.toLowerCase() === currentEpisode.name.toLowerCase()) {
        score++;
        await message.channel.send('Correct!');
        timer -= 100;
        // ask the next question after a short delay to avoid flooding the channel
        setTimeout(() => {
          askQuestion(message);
        }, 500);
      } else {
        // if the user's answer is incorrect and no hint has been given yet, ask for more information
        const hintOption = await message.channel.send('Incorrect! Would you like to ask for the season number, episode number, or both (s/e/b)? Type any other letter to exit the game.');
        const hintMessage = await message.channel.awaitMessages({ filter, max: 1, time: timer, errors: ['time'] });
        const option = hintMessage.first().content.toLowerCase();

        if (option === 's') {
          await message.channel.send(`Season ${currentEpisode.season}`);
          const retryMessage = await message.channel.awaitMessages({ filter, max: 1, time: timer, errors: ['time'] });
          const retryAnswer = retryMessage.first().content;

          if (retryAnswer.toLowerCase() === currentEpisode.name.toLowerCase()) {
            score += 0.5;
            await message.channel.send('Correct! (With Hint)');
            timer -= 100;
            // ask the next question after a short delay to avoid flooding the channel
            setTimeout(() => {
              askQuestion(message);
            }, 500);
          } else {
            // reveal the answer and move on to the next question
            remainingLives--;
            await message.channel.send(`Incorrect! The answer is "${currentEpisode.name}". You have ${remainingLives} lives remaining.`);
            // ask the next question after a short delay to avoid flooding the channel
            setTimeout(() => {
              askQuestion(message);
            }, 500);
          }
        } else if (option === 'e') {
          await message.channel.send(`Episode ${currentEpisode.episode}`);
          const retryMessage = await message.channel.awaitMessages({ filter, max: 1, time: timer, errors: ['time'] });
          const retryAnswer = retryMessage.first().content;

          if (retryAnswer.toLowerCase() === currentEpisode.name.toLowerCase()) {
            score += 0.5;
            await message.channel.send('Correct! (With Hint)');
            timer -= 100;
            // ask the next question after a short delay to avoid flooding the channel
            setTimeout(() => {
              askQuestion(message);
            }, 500);
          } else {
            // reveal the answer and move on to the next question
            remainingLives--;
            await message.channel.send(`Incorrect! The answer is "${currentEpisode.name}". You have ${remainingLives} lives remaining.`);
            // ask the next question after a short delay to avoid flooding the channel
            setTimeout(() => {
              askQuestion(message);
            }, 500);
          }
        } else if (option === 'b') {
          await message.channel.send(`Season ${currentEpisode.season}, Episode ${currentEpisode.episode}`);
          const retryMessage = await message.channel.awaitMessages({ filter, max: 1, time: timer, errors: ['time'] });
          const retryAnswer = retryMessage.first().content;

          if (retryAnswer.toLowerCase() === currentEpisode.name.toLowerCase()) {
            score += 0.5;
            await message.channel.send('Correct! (With Hint)');
            timer -= 100;
            // ask the next question after a short delay to avoid flooding the channel
            setTimeout(() => {
              askQuestion(message);
            }, 500);
          } else {
            // reveal the answer and move on to the next question
            remainingLives--;
            await message.channel.send(`Incorrect! The answer is "${currentEpisode.name}". You have ${remainingLives} lives remaining.`);
            // ask the next question after a short delay to avoid flooding the channel
            setTimeout(() => {
              askQuestion(message);
            }, 500);
          }
        } else {
          await endGame(message, score);
          return;
        }
      }
    } catch (err) {
      // reveal the answer and move on to the next question
      remainingLives--;
      await message.channel.send(`Time's up! The answer is ${currentEpisode.name}. You have ${remainingLives} lives remaining.`);
      askQuestion(message);
    }
  }
  async function endGame(message, score) {
    message.channel.send(`Game over! Your score is ${score} episodes guessed.`);
  }

  function shuffle(array) {
    let currentIndex = array.length,
      randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {

      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]
      ];
    }
    return array;
  }
}

// Login to Discord with your client's token
client.login(TOKEN);