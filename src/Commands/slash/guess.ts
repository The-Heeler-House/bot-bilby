import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    EmbedBuilder,
    Interaction,
    Message,
    SlashCommandBuilder,
} from "discord.js";
import { Services } from "../../Services";
import SlashCommand from "../SlashCommand";
import * as fs from 'fs';
import * as path from 'path';

type Episode = {
    season: string,
    episode: string,
    name: string,
    description: string
}

export default class GuessCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("guess")
        .setDescription(
            "Can you guess the Bluey episode title just from its description?"
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("play")
                .setDescription(
                    "Can you guess the Bluey episode title just from its description?"
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("multiplayer")
                .setDescription(
                    "Play a live multiplayer guessing game with your friends!"
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("leaders")
                .setDescription(
                    "View the top scorers for the Bluey episode guessing game!"
                )
        ) as SlashCommandBuilder;

    async execute(
        interaction: ChatInputCommandInteraction,
        services: Services
    ) {
        const leaderboard = services.database.collections.guess;

        // function to save a score to the leaderboard
        async function saveScore(user: string, score: number) {
            const existingScore = await leaderboard.findOne({ user });
            if (!existingScore || score > existingScore.score) {
                await leaderboard.updateOne({ user }, { $set: { score } }, { upsert: true });
            }
        }

        async function getTopLeaderboard() {
            const cursor = leaderboard.find().sort({ score: -1 }).limit(20);
            const leaderboardArray = await cursor.toArray();
            return leaderboardArray;
        }

        // read the text file
        //const text = fs.readFileSync(path.join('../src/episodeDesc.txt'), 'utf-8');
        const text = fs.readFileSync(path.join('src/Assets/guess-data/episodeDesc.txt'), 'utf-8');
        const episodeEntry = text.split(/\r?\n^\r?\n/gm)

        // define a regular expression to match each episode
        const regex = /^S(\d+) E(\d+) · (.+)$\r?\n^(.*)$/m;

        // create an array to store the episode information
        const episodes: Episode[] = [];

        // iterate over each match of the regular expression
        for (const i of episodeEntry) {
            let match = regex.exec(i)
            const season = match[1];
            const episode = match[2];
            const name = match[3];
            const description = match[4].trim();
            episodes.push({ season, episode, name, description });
        }

        // shuffle function
        function shuffle(array: Episode[]) {
            let currentIndex = array.length,
                randomIndex: number;

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
                .setColor(0x72bfed)
                .setTitle('Guesser Leaderboard!')
                .setTimestamp()
                .setFooter({ text: "Bot Bilby" })
            var desc = "";
            var skipped = 0;
            for (let i = 0; i < 10 + skipped; i++) {
                const player = topLeaderboard[i];
                // ${player.user} is in the format <@id>. change it to id
                const id = player.user.slice(2, -1);
                try {
                    const user = await interaction.guild.members.fetch(id);
                    desc += `${i + 1}. \`${user.displayName}\`: **${player.score} Episodes**\n`;
                } catch (err) {
                    skipped++;
                }
            }
            leaderboardEmbed.setDescription(desc);
            interaction.reply({ embeds: [leaderboardEmbed] });
        } else if (interaction.options.getSubcommand() === 'multiplayer') {
            // start the game loop
            shuffle(episodes);

            // builds welcome message
            const row = new ActionRowBuilder<ButtonBuilder>()
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
            var userID: [string, number][] = [[interaction.user.id, 0]];
            var onlyID = [interaction.user.id];

            //? the string will get concatenated, it will not get break line unless specifically required
            const MULTIPLAYER_BEGIN_STR =
                "Welcome to the game! " +
                "I will give you an episode description, and you reply with the episode title. " +
                "This is the multiplayer version, be the first to answer and beat your friends!\n" +
                "**Current Players:** $players"

            // message
            const message = await interaction.reply({
                content: MULTIPLAYER_BEGIN_STR.replace("$players", users.join(", ")),
                components: [row],
                fetchReply: true
            });
            const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 600000 });
            collector.on('collect', async i => {
                switch (i.customId) {
                    case "join":
                        if (!onlyID.includes(i.user.id)) {
                            users.push("<@" + i.user.id + ">")
                            userID.push([i.user.id, 0])
                            onlyID.push(i.user.id)
                            await i.update({
                                content: MULTIPLAYER_BEGIN_STR.replace("$players", users.join(", ")),
                                components: [row]
                            })
                        } else {
                            await i.reply({ content: `You have already joined the game!`, ephemeral: true });
                        }
                        break
                    case "leave":
                        var location = onlyID.indexOf(i.user.id)
                        if (location != -1) {
                            if (i.user.id != interaction.user.id) {
                                userID.splice(location, 1)
                                onlyID.splice(location, 1)
                                users.splice(location, 1)
                                await i.update({
                                    content: MULTIPLAYER_BEGIN_STR.replace("$players", users.join(", ")),
                                    components: [row]
                                })
                            } else {
                                await i.reply({ content: `The host cannot leave!`, ephemeral: true });
                            }
                        } else {
                            await i.reply({ content: `You have not joined the game!`, ephemeral: true })
                        }
                        break
                    case "start":
                        if (i.user.id == interaction.user.id) {
                            row.components[0].setDisabled(true);
                            row.components[1].setDisabled(true);
                            row.components[2].setDisabled(true);
                            await i.update({
                                content: MULTIPLAYER_BEGIN_STR.replace("$players", users.join(", ")),
                                components: [row]
                            })
                            await interaction.channel.send("Starting Game! To end the game, type `endgame` as the host.");

                            var currNum = 0;
                            var timer = 12500;
                            var currentEpisode: Episode;

                            // start the game loop
                            shuffle(episodes);
                            askQuestion(interaction);

                            async function askQuestion(interaction: ChatInputCommandInteraction) {
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
                                const multiFilter = (message: Message<boolean>) =>
                                    onlyID.includes(message.author.id) &&
                                    message.channel.id === interaction.channel.id;

                                var correct = false;
                                const answerMessage = interaction.channel.createMessageCollector({ filter: multiFilter, time: timer });
                                answerMessage.on('collect', m => {
                                    const answer = m.content;
                                    const id = m.author.id;
                                    // if the user's answer matches the episode name, increment the score
                                    if (answer.toLowerCase() === currentEpisode.name.toLowerCase()) {

                                        interaction.channel.send('Correct! <@' + id + '> receives 1 point!');
                                        var location = userID.findIndex(inner => inner.indexOf(id) >= 0);
                                        userID[location][1] = Number(userID[location][1]) + 1
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
                                answerMessage.on('end', _ => {
                                    if (!correct) {
                                        interaction.channel.send(`Time's up! The answer is ${currentEpisode.name}. No one gains a point!`);
                                        setTimeout(() => {
                                            askQuestion(interaction);
                                        }, 500);
                                    }
                                });
                            }
                            async function endGame(interaction: ChatInputCommandInteraction, scores: [string, number][]) {
                                const leaderboardEmbed = new EmbedBuilder()
                                    .setColor(0x72bfed)
                                    .setTitle('Multiplayer Guesser Results!')
                                    .setTimestamp()
                                    .setFooter({ text: "Bot Bilby" })
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
                        break
                }
            });
            collector.on('end', _ => {
                row.components[0].setDisabled(true);
                row.components[1].setDisabled(true);
                row.components[2].setDisabled(true);
                interaction.editReply({ content: MULTIPLAYER_BEGIN_STR.replace("$players", users.join(", ")), components: [row] })
            });
        } else {
            // initialize the game state
            let score = 0;
            let remainingLives = 3;
            let currNum = 0;
            let timer = 12500;
            let currentEpisode: Episode;

            // start the game loop
            shuffle(episodes);

            // send a welcome message to the user
            await interaction.reply('Welcome to the game! I will give you an episode description, and you reply with the episode title! You have three lives, how much episodes can you name?');

            // ask the first question
            askQuestion(interaction);

            async function askQuestion(interaction: ChatInputCommandInteraction) {
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
                const filter = (message: Message) => message.author.id === interaction.user.id && message.channel.id === interaction.channel.id;

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
                        await interaction.channel.send(
                            'Incorrect! Would you like to ask for a hint or exit the game? (h/e). Otherwise, guess again below!'
                        );
                        const hintMessage = await interaction.channel.awaitMessages({ filter, max: 1, time: timer, errors: ['time'] });
                        const option = hintMessage.first().content.toLowerCase();

                        if (option === 'e') {
                            await endGame(interaction, score);
                            return;
                        }
                        var userAnswer = option //? when the user answer, the first arg will be the answer
                        var useHint = false
                        if (option === 'h') {
                            await interaction.channel.send(`Season ${currentEpisode.season}, Episode ${currentEpisode.episode}`);
                            const retryMessage = await interaction.channel.awaitMessages({ filter, max: 1, time: timer, errors: ['time'] });
                            userAnswer = retryMessage.first().content.toLowerCase();
                            useHint = true
                        }

                            if (userAnswer.toLowerCase() === currentEpisode.name.toLowerCase()) {
                                score += 0.5;
                                await interaction.channel.send(`Correct! ${useHint ? "(With Hint)" : "(Second Guess)"}`);
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
                } catch (err) {
                    // reveal the answer and move on to the next question
                    remainingLives--;
                    await interaction.channel.send(`Time's up! The answer is ${currentEpisode.name}. You have ${remainingLives} lives remaining.`);
                    setTimeout(() => {
                        askQuestion(interaction);
                    }, 500);
                }
            }
            async function endGame(interaction: Interaction, score: number) {
                interaction.channel.send(`Game over! Your score is ${score} episodes guessed.`);
                saveScore('<@' + interaction.user.id + '>', score);
                const topLeaderboard = await getTopLeaderboard();
                const leaderboardEmbed = new EmbedBuilder()
                    .setColor(0x72bfed)
                    .setTitle('Guesser Leaderboard!')
                    .setTimestamp()
                    .setFooter({ text: "Bot Bilby" })
                var desc = "";
                for (let i = 0; i < topLeaderboard.length; i++) {
                    const player = topLeaderboard[i];
                    // ${player.user} is in the format <@id>. change it to id
                    const id = player.user.slice(2, -1);
                    try {
                        const user = await interaction.guild.members.fetch(id);
                        desc += `${i + 1}. ${user.displayName}: ${player.score} Episodes\n`;
                    } catch (err) {
                        desc += `${i + 1}. Unknown : ${player.score} Episodes\n`;
                    }
                }
                leaderboardEmbed.setDescription(desc);
                interaction.channel.send({ embeds: [leaderboardEmbed] });
            }
        }
    }
}
