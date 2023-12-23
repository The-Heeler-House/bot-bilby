const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
var http = require('http');
var nodemailer = require('nodemailer');
const logger = require('./logger.js');

http.createServer(function (req, res) {
  res.write("I'm alive");
  res.end();
}).listen(8080);

// Require the necessary discord.js classes
const {
  Client,
  Collection,
  GatewayIntentBits,
  ActivityType,
} = require('discord.js');
const {
  joinVoiceChannel,
} = require('@discordjs/voice');
const muteroulette = require('./commands/muteroulette.js');

// Create a new client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMessageTyping, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMembers]
});

// Loading commands from the commands folder
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

const TOKEN = process.env['TOKEN'];

const HEELER_HOUSE_SERVER = undefined;

// Creating a collection for commands in client
client.commands = new Collection();

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
  client.commands.set(command.data.name, command);
}

const trackedMessages = new Map();

var joinGate = true;

// When the client is ready, run this code (only once)
client.once('ready', () => {

  logger.command('Ready!');
  global.devChannel = client.channels.cache.get("966921162804301824")
  // Registering the commands in the client
  const CLIENT_ID = client.user.id;
  const rest = new REST({
    version: '9'
  }).setToken(TOKEN);
  (async () => {
    try {
      // Registering the commands in the server
      await rest.put(
        Routes.applicationCommands(CLIENT_ID), {
        body: commands
      },
      );
      logger.command('Successfully registered application commands globally');

      // Set the bot's status
      client.user.setPresence({
        activities: [{ name: `a rugby game!`, type: ActivityType.Competing }],
        status: 'dnd',
      });
      logger.command('Successfully set bot status');

      // const vChannel = client.channels.cache.get('1031750969203114035');
      // joinVoiceChannel({
      //   channelId: vChannel.id,
      //   guildId: vChannel.guild.id,
      //   adapterCreator: vChannel.guild.voiceAdapterCreator,
      //   selfDeaf: false,
      //   selfMute: true
      // });
      // logger.command('Joined voice channel');

      // Bump reminder
      const defaultChannel = client.channels.cache.get('1012812013795295233');
      setInterval(function () {
        defaultChannel.send("Disboard Bump Reminder! Remember to \`/bump\`!") //send it to whatever channel the bot has permissions to send on
        logger.bilby('Bump reminder sent');
      }, 120 * 60 * 1000);
    } catch (error) {
      if (error) logger.error(error);
    }
  })();
});

// Interaction handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) {
    logger.command(`Non-command interaction called`);
    return;
  }
  const command = client.commands.get(interaction.commandName);
  try {
    logger.command(`Command ${interaction.commandName} called`);
    await command.execute(interaction);
  } catch (error) {
    if (error) logger.error(error);
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
  }
});

// Message handler
client.on('messageCreate', async message => {
  if (message.content === "") {
    logger.message(`(${message.author.username}) ATTACHMENT`);
  } else {
    logger.message(`(${message.author.username}) ${message.content}`);
  }
  if (message.content.toLowerCase() == ('bilby, hello')) {
    message.channel.send("Hi! How are you?");
  } else if (message.content.toLowerCase() == ('bilby, play mlp guess')) {
    ohDear(message)
  } else if (message.content.toLowerCase().includes('bilby, say ')) {
    const hehe = client.channels.cache.get('962936076404686859');
    hehe.send(message.content.substring(10));
  } else if (message.content.toLowerCase() == ('bilby, type')) {
    const hehe = client.channels.cache.get('962936076404686859');
    count = 100;
    for (let i = 0; i < count; i++) {
      hehe.sendTyping();
      if (i < count - 1) {
        await sleep(7000);
      }
    }
    async function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
  } else if (message.content.toLowerCase() == ('bilby, hide')) {
    client.user.setStatus('invisible');
  } else if (message.content.toLowerCase() == ('bilby, unhide')) {
    client.user.setStatus('online');
  } else if (message.content.toLowerCase() == ('bilby, unicorse')) {
    try {
      await client.user.setUsername('Evil Unicorse');
      await client.user.setAvatar('https://media.discordapp.net/attachments/1078179472680956035/1116969936468844544/EvilUnicorse.png?width=930&height=930');
      message.channel.send(`Set avatar and username to 'Evil Unicorse'`);
    } catch (error) {
      logger.error(error);
      if (error) {
        message.channel.send(`Error setting username and avatar for 'Evil Unicorse. Try again later.'`);
      }
    }
  } else if (message.content.toLowerCase() == ('bilby, bilby')) {
    try {
      await client.user.setUsername('Bot Bilby');
      await client.user.setAvatar('https://media.discordapp.net/attachments/966921162804301824/1116957197717491712/ffdc2bcc0289671061d73f94e497e498.png?width=512&height=512');
      message.channel.send(`Set avatar and username to 'Bot Bilby'`);
    } catch (error) {
      logger.error(error);
      if (error) {
        message.channel.send(`Error setting username and avatar for 'Bot Bilby. Try again later.'`);
      }
    }
  } else if (message.content.toLowerCase() == ('bilby, peppa')) {
    try {
      await client.user.setUsername('Peppa Pig');
      await client.user.setAvatar('https://media.discordapp.net/attachments/966921162804301824/1116957290478706698/unnamed.jpg?width=930&height=930');
      message.channel.send(`Set avatar and username to 'Peppa Pig'`);
    } catch (error) {
      logger.error(error);
      if (error) {
        message.channel.send(`Error setting username and avatar for 'Peppa Pig. Try again later.'`);
      }
    }
  } else if (message.content.toLowerCase() == ('bilby, devstats')) {
    message.channel.send(`For Jalen: ${trackedMessages.size} (Bot Dev Purposes)`);
  } else if (message.content.toLowerCase() == ('bilby, script')) {
    script()
  } else if (message.content.toLowerCase() == ('bilby, togglegate')) {
    if (joinGate) {
      joinGate = false;
      message.channel.send(`Join gate toggled off`);
    } else {
      joinGate = true;
      message.channel.send(`Join gate toggled on`);
    }
  } else if (message.content.toLowerCase() == ('bilby, muteroulette')) {
    muteroulette.disabledTime = 0;
  } else if (message.content.toLowerCase() == ('highr, sleep')) {
    // get current time in Britain
    var d = new Date();
    var n = d.getUTCHours();
    var m = d.getUTCMinutes();

    if (m < 10) {
      m = "0" + m;
    }

    var ampm = n >= 12 ? 'PM' : 'AM';
    if (n === 0) {
      n = 12; // Convert 0 to 12 AM
    } else if (n > 12) {
      n -= 12; // Convert to 12-hour format
    }
    // if it's between 11pm and 6am
    if (n >= 11 || n <= 6) {
      message.channel.send("Highr go to bed smh it's currently " + n + ":" + m + " " + ampm + " in Britain");
    } else {
      message.channel.send("Ok you get to stay up a bit longer. It's currently " + n + ":" + m + " " + ampm + " in Britain");
    }
  } else if (message.content.toLowerCase().includes('bilby, verify ')) {
    const emailAddress = message.content.substring(14);
    const fiveDigitVerificationCode = Math.floor(10000 + Math.random() * 90000);
    const spacedVerificationCode = fiveDigitVerificationCode.toString().split('').join(' ');

    if (emailAddress.includes('@')) {
      message.channel.send(`Verifying ${emailAddress}...`);
      const password = process.env['EMAIL_PASSWORD'];
      var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'heelerhouseofficial@gmail.com',
          pass: password
        }
      });
      var mailOptions = {
        from: '\"The Heeler House\" <heelerhouseofficial@gmail.com>',
        to: emailAddress,
        subject: 'Heeler House Verification Code',
        text: `
      This is a message from The Heeler House Staff team.

      <${spacedVerificationCode}> is your verification code. Do not share this code with anyone but the staff team.

      A staff member will never DM you asking for this code, only share it in your verification ticket.

      If you did not request this code, you can safely disregard this email.
    `,
        html: `
    <style>
      .verification-code {
        font-size: 24px; /* Adjust the font size as needed */
        font-weight: bold; /* Make the digits bold */
      }
    </style>
    <p>This is a message from The Heeler House Staff team.</p>
    <p>&lt;<span class="verification-code">${spacedVerificationCode}</span>&gt; is your verification code. Do not share this code with anyone but the staff team.</p>
    <p>A staff member will never DM you asking for this code, only share it in your verification ticket.</p>
    <p>If you did not request this code, you can safely disregard this email.</p>
  `
      };
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          message.channel.send(`Error sending verification email. Try again later.`);
          devChannel.send(`\`\`\`${error}\`\`\``);
        } else {
          message.channel.send(`Verification email sent to ${emailAddress}.`);
          verifyChannel = client.channels.cache.get('1148063416079097959');
          verifyChannel.send(`The code sent to ${emailAddress} is <**${spacedVerificationCode}**>.`);
        }
      });
    }
    else {
      message.channel.send(`Invalid email address.`);
    }
  }
});

async function script() {
}

// Function to shuffle an array randomly
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// check all new users, and kick them if the account age is less then 5 days
client.on('guildMemberAdd', async member => {
  if (!joinGate) {
    return;
  }
  const accountAge = Date.now() - member.user.createdTimestamp;
  const fiveDays = 432000000;
  if (accountAge < fiveDays) {
    member.send(`Welcome to The Heeler House! Unfortunately, your account is too new to join the server. Please try again in a few days. If you believe this is a mistake, please contact a staff member.`);
    member.kick('Account age is less than 5 days');
  }
});

client.on('messageCreate', async message => {
  if (message.mentions.roles.has("960044331572547654") || message.mentions.roles.has("960044331572547654")) {
    const staffChatChannel = await client.channels.fetch("1079596899335680000");
    // Send the message link to the #staff-chat channel
    const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
    staffChatChannel.send(`Moderator ping detected!\n${messageLink}`);
  }
});

// Message link handler
client.on('messageCreate', async message => {
  // Check if the message has any message links
  const messageLinks = message.content.match(/https?:\/\/discord\.com\/channels\/\d+\/\d+\/\d+/g);

  if (messageLinks) {
    for (const link of messageLinks) {
      // Extract channel ID and message ID from the link
      const [, guildId, channelId, messageId] = link.match(/https?:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);

      const channel = await client.channels.fetch(channelId);
      if (!channel) continue; // Skip if the channel is not available
      if (message.author.bot) continue; // Skip if the message author is a bot
      if (message.channel.id != '1079596899335680000') continue; // Skip if the channel is not #staff

      try {
        const linkedMessage = await channel.messages.fetch(messageId);

        // Store the message information for tracking
        const trackedMessage = {
          originalMessage: message,
          originalLink: link,
          guildId,
          channelId,
          messageId,
          content: linkedMessage.content,
          author: linkedMessage.author.tag,
          timestamp: Date.now() // Add timestamp to track when the message was linked
        };

        logger.command("New linked message: " + trackedMessage.content);
        const newChannel = await client.channels.fetch("966921162804301824")
        newChannel.send(`New linked message added.`);
        // Add the tracked message to the map
        trackedMessages.set(trackedMessage.messageId, trackedMessage);
      } catch (error) {
        logger.error(error);
      }
    }
  }
});
client.on('messageDelete', async deletedMessage => {
  for (const [messageId, trackedMessage] of trackedMessages) {
    const currentTime = Date.now();
    const timeElapsed = currentTime - trackedMessage.timestamp;
    const expirationTime = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds

    if (timeElapsed >= expirationTime) {
      // Remove the expired tracked message from the map
      const check = trackedMessages.delete(messageId);
      if (check) {
        logger.command(`Tracked message (${messageId}) has expired and was removed from the map.`);
      }
    } else if (messageId === deletedMessage.id) {
      // Notify the channel about the deletion
      const channel = await client.channels.fetch("961201095038873630")
      const newMessage = await channel.awaitMessages({ max: 1, time: 30000, errors: ['time'] })
      messageLink = `https://discord.com/channels/${channel.guildId}/${channel.id}/${newMessage.first().id}`;

      const notification = `The linked message by <@${deletedMessage.author.id}> was deleted. Deleted Message: ${messageLink}.`;
      finalMessage = await trackedMessage.originalMessage.reply(notification);
      finalMessage.suppressEmbeds(true)

      // Remove the deleted tracked message from the map
      check = trackedMessages.delete(messageId);
      if (check) {
        logger.command(`Tracked message (${deletedMessage.id}) was deleted and was removed from the map.`);
      }
    }
  }
});

// Login to Discord with your client's token
client.login(TOKEN);

async function ohDear(message) {
  const text = fs.readFileSync(('./episodeDescMLP.txt'), 'utf-8');

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