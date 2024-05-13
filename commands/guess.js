const { SlashCommandBuilder } = require('@discordjs/builders');
const { MongoClient } = require('mongodb');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guess')
        .setDescription('Can you guess the Bluey episode title just from it\'s description?')
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Can you guess the Bluey episode title just from it\'s description?'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('multiplayer')
                .setDescription('Play a live multipayer guessing game with your friends!'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaders')
                .setDescription('View the top scorers for the Bluey episode guessing game!')),
    async execute(interaction) {

        // connect to the database
        const uri = process.env.MONGODB_URI;
        const client = new MongoClient(uri);
        await client.connect();

        // create or get the leaderboard collection
        const leaderboard = client.db('guessLeaders').collection('leaders');

        // function to save a score to the leaderboard
        async function saveScore(user, score) {
            const existingScore = await leaderboard.findOne({ user });
            if (!existingScore || score > existingScore.score) {
                await leaderboard.updateOne({ user }, { $set: { score } }, { upsert: true });
            }
        }
        async function getTopLeaderboard() {
            const cursor = await leaderboard.find().sort({ score: -1 }).limit(10);
            const leaderboardArray = await cursor.toArray();
            return leaderboardArray;
        }

        // read the text file
        //const text = fs.readFileSync(path.join('../src/episodeDesc.txt'), 'utf-8');
        const text = fs.readFileSync(path.join('./episodeDesc.txt'), 'utf-8');

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

        // shuffle function
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

        if (interaction.options.getSubcommand() === 'leaders') {
            const topLeaderboard = await getTopLeaderboard();
            const leaderboardEmbed = new EmbedBuilder()
                .setColor(9356018)
                .setTitle('Guesser Leaderboard!')
            var desc = "";
            for (let i = 0; i < topLeaderboard.length; i++) {
                const player = topLeaderboard[i];
                // ${player.user} is in the format <@id>. change it to id
                const id = player.user.slice(2, -1);
                try {
                    const user = await interaction.guild.members.fetch(id);
                    console.log(user)
                    desc += `${i + 1}. ${user.nickname || user.user.globalName || user.user.username}: ${player.score} Episodes\n`;
                } catch (err) {
                    desc += `${i + 1}. Unknown : ${player.score} Episodes\n`;
                }
            }
            leaderboardEmbed.setDescription(desc);
            interaction.reply({ embeds: [leaderboardEmbed] });
        } else if (interaction.options.getSubcommand() === 'multiplayer') {
            let scores = {};
            let currNum = 0;
            let timer = 12500;
            let currentEpisode;

            // start the game loop
            shuffle(episodes);

            // builds welcome message
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('join')
                        .setLabel('Join Game')
                        .setDisabled(false)
                        .setStyle(ButtonStyle.Success),
                )
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('leave')
                        .setLabel('Leave Game')
                        .setDisabled(false)
                        .setStyle(ButtonStyle.Danger),
                )
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('start')
                        .setLabel('Begin!')
                        .setDisabled(false)
                        .setStyle(ButtonStyle.Primary),
                );
            var users = ["<@" + interaction.user.id + "> (Host)"];
            var userID = [[interaction.user.id, 0]];
            var onlyID = [interaction.user.id];
            // message
            const message = await interaction.reply({ content: 'Welcome to the game! I will give you an episode description, and you reply with the episode title. This is the multiplayer version, be the first to answer and beat your friends!\n**Current Players:** ' + users.join(", "), components: [row], fetchReply: true });
            const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 600000 });
            collector.on('collect', async i => {
                if (i.customId === 'join') {
                    if (!onlyID.includes(i.user.id)) {
                        users.push("<@" + i.user.id + ">")
                        userID.push([i.user.id, 0])
                        onlyID.push(i.user.id)
                        await i.update({ content: 'Welcome to the game! I will give you an episode description, and you reply with the episode title. This is the multiplayer version, be the first to answer and beat your friends!\n**Current Players:** ' + users.join(", "), components: [row] })
                    } else {
                        await i.reply({ content: `You have already joined the game!`, ephemeral: true });
                    }
                } else if (i.customId === 'leave') {
                    var location = onlyID.indexOf(i.user.id)
                    if (location != -1) {
                        if (i.user.id != interaction.user.id) {
                            userID.splice(location, 1)
                            onlyID.splice(location, 1)
                            users.splice(location, 1)
                            await i.update({ content: 'Welcome to the game! I will give you an episode description, and you reply with the episode title. This is the multiplayer version, be the first to answer and beat your friends!\n**Current Players:** ' + users.join(", "), components: [row] })
                        } else {
                            await i.reply({ content: `The host cannot leave!`, ephemeral: true });
                        }
                    } else {
                        await i.reply({ content: `You have not joined the game!`, ephemeral: true })
                    }
                } else if (i.customId === 'start') {
                    if (i.user.id == interaction.user.id) {
                        row.components[0].setDisabled(true);
                        row.components[1].setDisabled(true);
                        row.components[2].setDisabled(true);
                        await i.update({ content: 'Welcome to the game! I will give you an episode description, and you reply with the episode title. This is the multiplayer version, be the first to answer and beat your friends!\n**Current Players:** ' + users.join(", "), components: [row] })
                        await interaction.channel.send("Starting Game! To end the game, type `endgame` as the host.");

                        var currNum = 0;
                        var timer = 12500;
                        var currentEpisode;

                        // start the game loop
                        shuffle(episodes);
                        askQuestion(interaction);

                        async function askQuestion(interaction) {
                            // if there are no remaining questions, end the game
                            if (currNum === 20) {
                                await endGame(interaction, userID);
                                return;
                            }

                            // select the next episode and decrement the remainingLives counter
                            currentEpisode = episodes.pop();
                            currNum++;

                            // send the episode description as a question
                            await interaction.channel.send(`Question ${currNum}: ${currentEpisode.description}`);

                            // create a filter to only listen to the user's next message in the same channel
                            const multiFilter = (message) => onlyID.includes(message.author.id) && message.channel.id === interaction.channel.id;
                            var correct = false;
                            const answerMessage = interaction.channel.createMessageCollector({ filter: multiFilter, time: timer });
                            answerMessage.on('collect', m => {
                                const answer = m.content;
                                const id = m.author.id;
                                // if the user's answer matches the episode name, increment the score
                                if (answer.toLowerCase() === currentEpisode.name.toLowerCase()) {
                                    interaction.channel.send('Correct! <@' + id + '> receives 1 point!');
                                    var location = userID.findIndex(inner => inner.indexOf(id) >= 0);
                                    userID[location][1] += 1
                                    timer -= 100
                                    // ask the next question after a short delay to avoid flooding the channel
                                    correct = true;
                                    answerMessage.stop()
                                    setTimeout(() => {
                                        askQuestion(interaction);
                                    }, 500);
                                } else if (answer.toLowerCase() === 'endgame' && id == interaction.user.id) {
                                    correct = true;
                                    answerMessage.stop()
                                    endGame(interaction, userID);
                                }
                            })
                            answerMessage.on('end', collected => {
                                if (!correct) {
                                    interaction.channel.send(`Time's up! The answer is ${currentEpisode.name}. No one gains a point!`);
                                    setTimeout(() => {
                                        askQuestion(interaction);
                                    }, 500);
                                }
                            });
                        }
                        async function endGame(interaction, scores) {
                            const leaderboardEmbed = new EmbedBuilder()
                                .setColor(9356018)
                                .setTitle('Multiplayer Guesser Results!')
                            var desc = "";

                            scores.sort((a, b) => b[1] - a[1]);
                            interaction.channel.send(`Game over! The winner is: <@` + scores[0][0] + '>!');

                            for (let i = 0; i < scores.length; i++) {
                                const player = scores[i];
                                desc += `${i + 1}. <@${player[0]}>: ${player[1]} Episodes\n`;
                            }
                            leaderboardEmbed.setDescription(desc);
                            interaction.channel.send({ embeds: [leaderboardEmbed] });
                        }
                    } else {
                        await i.reply({ content: `Only the host can start the game!`, ephemeral: true });
                    }
                }
            });
            collector.on('end', collected => {
                row.components[0].setDisabled(true);
                row.components[1].setDisabled(true);
                row.components[2].setDisabled(true);
                interaction.editReply({ content: 'Welcome to the game! I will give you an episode description, and you reply with the episode title. This is the multiplayer version, be the first to answer and beat your friends!\n**Current Players:** ' + users.join(", "), components: [row] })
            });
        } else {
            // initialize the game state
            let score = 0;
            let remainingLives = 3;
            let currNum = 0;
            let timer = 12500;
            let currentEpisode;

            // start the game loop
            shuffle(episodes);

            // send a welcome message to the user
            await interaction.reply('Welcome to the game! I will give you an episode description, and you reply with the episode title! You have three lives, how much episodes can you name?');

            // ask the first question
            askQuestion(interaction);

            async function askQuestion(interaction) {
                // if there are no remaining questions, end the game
                if (remainingLives === 0) {
                    await endGame(interaction, score);
                    return;
                }

                // select the next episode and decrement the remainingLives counter
                currentEpisode = episodes.pop();
                currNum++;

                // send the episode description as a question
                await interaction.channel.send(`Question ${currNum}: ${currentEpisode.description}`);

                // create a filter to only listen to the user's next message in the same channel
                const filter = (message) => message.author.id === interaction.user.id && message.channel.id === interaction.channel.id;

                // wait for the user's answer
                try {
                    const answerMessage = await interaction.channel.awaitMessages({ filter, max: 1, time: timer, errors: ['time'] });
                    const answer = answerMessage.first().content;

                    // if the user's answer matches the episode name, increment the score
                    if (answer.toLowerCase() === currentEpisode.name.toLowerCase()) {
                        score++;
                        await interaction.channel.send('Correct!');
                        timer -= 100;
                        // ask the next question after a short delay to avoid flooding the channel
                        setTimeout(() => {
                            askQuestion(interaction);
                        }, 500);
                    } else {
                        // if the user's answer is incorrect and no hint has been given yet, ask for more information
                        const hintOption = await interaction.channel.send('Incorrect! Would you like to ask for a hint or exit the game? (h/e). Otherwise, guess again below!');
                        const hintMessage = await interaction.channel.awaitMessages({ filter, max: 1, time: timer, errors: ['time'] });
                        const option = hintMessage.first().content.toLowerCase();

                        if (option === 'e') {
                            await endGame(interaction, score);
                            return;
                        } else if (option === 'h') {
                            await interaction.channel.send(`Season ${currentEpisode.season}, Episode ${currentEpisode.episode}`);
                            const retryMessage = await interaction.channel.awaitMessages({ filter, max: 1, time: timer, errors: ['time'] });
                            const retryAnswer = retryMessage.first().content;

                            if (retryAnswer.toLowerCase() === currentEpisode.name.toLowerCase()) {
                                score += 0.5;
                                await interaction.channel.send('Correct! (With Hint)');
                                timer -= 100;
                                // ask the next question after a short delay to avoid flooding the channel
                                setTimeout(() => {
                                    askQuestion(interaction);
                                }, 500);
                            } else {
                                // reveal the answer and move on to the next question
                                remainingLives--;
                                await interaction.channel.send(`Incorrect! The answer is "${currentEpisode.name}". You have ${remainingLives} lives remaining.`);
                                // ask the next question after a short delay to avoid flooding the channel
                                setTimeout(() => {
                                    askQuestion(interaction);
                                }, 500);
                            }
                        } else {
                            if (option.toLowerCase() === currentEpisode.name.toLowerCase()) {
                                score += 0.5;
                                await interaction.channel.send('Correct! (Second Guess)');
                                timer -= 100;
                                // ask the next question after a short delay to avoid flooding the channel
                                setTimeout(() => {
                                    askQuestion(interaction);
                                }, 500);
                            } else {
                                // reveal the answer and move on to the next question
                                remainingLives--;
                                await interaction.channel.send(`Incorrect! The answer is "${currentEpisode.name}". You have ${remainingLives} lives remaining.`);
                                // ask the next question after a short delay to avoid flooding the channel
                                setTimeout(() => {
                                    askQuestion(interaction);
                                }, 500);
                            }
                        }
                    }
                } catch (err) {
                    // reveal the answer and move on to the next question
                    remainingLives--;
                    await interaction.channel.send(`Time's up! The answer is ${currentEpisode.name}. You have ${remainingLives} lives remaining.`);
                    setTimeout(() => {
                        askQuestion(interaction);
                    }, 500);
                }
            }
            async function endGame(interaction, score) {
                interaction.channel.send(`Game over! Your score is ${score} episodes guessed.`);
                saveScore('<@' + interaction.user.id + '>', score);
                const topLeaderboard = await getTopLeaderboard();
                const leaderboardEmbed = new EmbedBuilder()
                    .setColor(9356018)
                    .setTitle('Guesser Leaderboard!')
                var desc = "";
                for (let i = 0; i < topLeaderboard.length; i++) {
                    const player = topLeaderboard[i];
                    // ${player.user} is in the format <@id>. change it to id
                    const id = player.user.slice(2, -1);
                    try {
                        const user = await interaction.guild.members.fetch(id);
                        console.log(user)
                        desc += `${i + 1}. ${user.nickname || user.user.globalName || user.user.username}: ${player.score} Episodes\n`;
                    } catch (err) {
                        desc += `${i + 1}. Unknown : ${player.score} Episodes\n`;
                    }
                }
                leaderboardEmbed.setDescription(desc);
                interaction.channel.send({ embeds: [leaderboardEmbed] });
            }
        }

        await client.close();
    }
};
