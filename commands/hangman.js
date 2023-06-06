const { SlashCommandBuilder } = require('@discordjs/builders');
const { randomInt } = require('crypto');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const letters = ["🇦", "🇧", "🇨", "🇩", "🇪", "🇫", "🇬", "🇭", "🇮", "🇯", "🇰", "🇱", "🇲"];
const letters2 = ["🇳", "🇴", "🇵", "🇶", "🇷", "🇸", "🇹", "🇺", "🇻", "🇼", "🇽", "🇾", "🇿"];
const alpha = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m"];
const alpha2 = ["n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]
const stages = [
    `\`\`\`
/---|
|
|
|
|
\`\`\``,
    `\`\`\`
/---|
|   o
|
|
|
\`\`\``,
    `\`\`\`
/---|
|   o
|   |
| 
|
\`\`\``,
    `\`\`\`
/---|
|   o
|  /|
|
|
\`\`\``,
    `\`\`\`
/---|
|   o
|  /|\\
|
|
\`\`\``,
    `\`\`\`
/---|
|   o
|  /|\\
|  /
|
\`\`\``,
    `\`\`\`
/---|
|   o
|  /|\\
|  / \\
|
\`\`\``
];

const words = ["jalen", "jalen", "rusty", "wendy", "alfie", "fairy", "quest", "bones", "dance", "beach", "barky", "shaun", "sheep", "lucky", "dunny", "shops", "leaf", "hotel", "jocks", "frisky", "creek", "pizza", "books", "indy", "spies", "gnomes", "winnie", "stripe", "bandit", "park", "doctor", "uppy", "beans", "spicy", "bins", "quiet", "madge", "trains", "movie", "jack", "magpie", "chloe", "shield", "whale", "janet", "school", "fluffy", "bluey", "army", "sleep", "apple", "squish", "fido", "santa", "fruit", "burger", "curry", "drive", "heart", "crabs", "lychee", "freeze", "monkey", "granny", "cafe", "hippo", "nomads", "swings", "lava", "squash", "heeler", "shame", "judo", "chest", "winton", "canoe", "floppy", "rita", "bunny", "salad", "pool", "robot", "fancy", "hide", "butler", "budgie", "race", "bumpy", "cake", "coco", "chimp", "taxi", "bilby", "nana", "early", "boats", "floss", "gecko", "letter", "chill", "salon", "dump", "stump", "wagon", "muffin", "keepy", "games", "ninja", "socks", "pony", "nomad", "minute", "chilli", "pickle", "jungle", "island", "magic", "tooth", "doodad", "gnome", "peanut", "camper", "romeo", "wand", "claw", "circus", "bingo", "walrus", "market", "dragon", "polly", "puppy", "trixie", "queen", "sticky", "honey", "nurse", "hockey", "bucks", "easter", "heavy"]; // Add more words to the word bank
function ra(ary) {
    return ary[Math.floor(Math.random() * ary.length)];
};

function generateMessage(phrase, guesses) {
    let s = "";
    for (let i = 0; i < phrase.length; i++) {
        if (phrase[i] === ' ') {
            s += " ";
        } else {
            let c = phrase[i];
            if (guesses.indexOf(c) === -1) {
                c = "\\_";
            }
            s += "__" + c + "__ ";
        }
    }

    s += "\n\nGuesses: " + guesses.join(", ");

    return s;
}

function nextLetter(message, index, letterNum) {
    message.react(letterNum[index]).then(() => {
        index++;
        if (index < letterNum.length) {
            nextLetter(message, index, letterNum);
        }
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hangman')
        .setDescription('Play hangman with Bluey themed words!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Play hangman with Bluey themed words!'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('multiplayer')
                .setDescription('Play hangman with Bluey themed words! Everyone can play!')),
    async execute(interaction) {
        const randomWord = ra(words); // Select a random word from the word bank
        const guessedLetters = [];
        let attempts = 0;

        if (interaction.options.getSubcommand() === 'play') {
            await interaction.reply({
                content: 'Starting a Bluey themed hangman game! The game master is <@' + interaction.user.id + '>. The game will only read the game master\'s reactions.',
            });

            const hangmanMessage = await interaction.channel.send(stages[0]);

            const gameMessage = await interaction.channel.send(generateMessage(randomWord, []));
            nextLetter(gameMessage, 0, letters);
            const gameMessage2 = await interaction.channel.send("** **")
            nextLetter(gameMessage2, 0, letters2);


            const letterFilter = (reaction, user) => reaction.message.id === gameMessage.id && (letters).includes(reaction.emoji.name) && user.id === interaction.user.id;
            const letterCollector = gameMessage.createReactionCollector({ filter: letterFilter, time: 600000 });

            const letterFilter2 = (reaction, user) => reaction.message.id === gameMessage2.id && (letters2).includes(reaction.emoji.name) && user.id === interaction.user.id;
            const letterCollector2 = gameMessage2.createReactionCollector({ filter: letterFilter2, time: 600000 });

            var finished = false;
            letterCollector.on('collect', (reaction, user) => {
                const emoji = reaction.emoji.name;
                const letter = alpha[letters.indexOf(emoji)];
                if (!guessedLetters.includes(letter)) {
                    guessedLetters.push(letter);

                    if (!randomWord.includes(letter)) {
                        attempts++;
                        if (attempts >= stages.length) {
                            finished = true;
                            hangmanMessage.edit(stages[attempts - 1] + 'Game Over! You lost.\nThe word was: ' + randomWord);
                            letterCollector2.stop();
                            letterCollector.stop();
                        } else {
                            hangmanMessage.edit(stages[attempts]);
                        }
                    }

                    const updatedMessage = generateMessage(randomWord, guessedLetters);
                    gameMessage.edit(updatedMessage);

                    if (!updatedMessage.includes("__\\_")) {
                        finished = true;
                        hangmanMessage.edit(stages[attempts] + 'Congratulations! You won!');
                        letterCollector2.stop();
                        letterCollector.stop();
                    }
                }
            });
            letterCollector.on('end', () => {
                letterCollector2.stop();
                if (!finished) {
                    hangmanMessage.edit(stages[attempts] + 'Game Over! Time ran out.\nThe word was: ' + randomWord);
                }
            });
            letterCollector2.on('collect', (reaction, user) => {
                const emoji = reaction.emoji.name;
                const letter = alpha2[letters2.indexOf(emoji)];
                if (!guessedLetters.includes(letter)) {
                    guessedLetters.push(letter);

                    if (!randomWord.includes(letter)) {
                        attempts++;
                        if (attempts >= stages.length) {
                            finished = true;
                            hangmanMessage.edit(stages[attempts - 1] + 'Game Over! You lost.\nThe word was: ' + randomWord);
                            letterCollector.stop();
                            letterCollector2.stop();
                        } else {
                            hangmanMessage.edit(stages[attempts]);
                        }
                    }

                    const updatedMessage = generateMessage(randomWord, guessedLetters);
                    gameMessage.edit(updatedMessage);

                    if (!updatedMessage.includes("__\\_")) {
                        finished = true;
                        hangmanMessage.edit(stages[attempts] + 'Congratulations! You won!');
                        letterCollector.stop();
                        letterCollector2.stop();
                    }
                }
            });
        } else {
            await interaction.reply({
                content: 'Starting a Bluey themed hangman game! The bot will read all reactions. Winstreaks will not be reset.',
            });

            const hangmanMessage = await interaction.channel.send(stages[0]);

            const gameMessage = await interaction.channel.send(generateMessage(randomWord, []));
            nextLetter(gameMessage, 0, letters);
            const gameMessage2 = await interaction.channel.send("** **")
            nextLetter(gameMessage2, 0, letters2);


            const letterFilter = (reaction, user) => reaction.message.id === gameMessage.id && (letters).includes(reaction.emoji.name) && user.id !== "775186735185264641";
            const letterCollector = gameMessage.createReactionCollector({ filter: letterFilter, time: 600000 });

            const letterFilter2 = (reaction, user) => reaction.message.id === gameMessage2.id && (letters2).includes(reaction.emoji.name) && user.id !== "775186735185264641";
            const letterCollector2 = gameMessage2.createReactionCollector({ filter: letterFilter2, time: 600000 });

            var finished = false;
            letterCollector.on('collect', (reaction, user) => {
                const emoji = reaction.emoji.name;
                const letter = alpha[letters.indexOf(emoji)];
                if (!guessedLetters.includes(letter)) {
                    guessedLetters.push(letter);

                    if (!randomWord.includes(letter)) {
                        attempts++;
                        if (attempts >= stages.length) {
                            finished = true;
                            hangmanMessage.edit(stages[attempts - 1] + 'Game Over! You lost.\nThe word was: ' + randomWord);
                            letterCollector2.stop();
                            letterCollector.stop();
                        } else {
                            hangmanMessage.edit(stages[attempts]);
                        }
                    }

                    const updatedMessage = generateMessage(randomWord, guessedLetters);
                    gameMessage.edit(updatedMessage);

                    if (!updatedMessage.includes("__\\_")) {
                        finished = true;
                        hangmanMessage.edit(stages[attempts] + 'Congratulations! You won!');
                        letterCollector2.stop();
                        letterCollector.stop();
                    }
                }
            });
            letterCollector.on('end', () => {
                letterCollector2.stop();
                if (!finished) {
                    hangmanMessage.edit(stages[attempts] + 'Game Over! Time ran out.\nThe word was: ' + randomWord);
                }
            });
            letterCollector2.on('collect', (reaction, user) => {
                const emoji = reaction.emoji.name;
                const letter = alpha2[letters2.indexOf(emoji)];
                if (!guessedLetters.includes(letter)) {
                    guessedLetters.push(letter);

                    if (!randomWord.includes(letter)) {
                        attempts++;
                        if (attempts >= stages.length) {
                            finished = true;
                            hangmanMessage.edit(stages[attempts - 1] + 'Game Over! You lost.\nThe word was: ' + randomWord);
                            letterCollector.stop();
                            letterCollector2.stop();
                        } else {
                            hangmanMessage.edit(stages[attempts]);
                        }
                    }

                    const updatedMessage = generateMessage(randomWord, guessedLetters);
                    gameMessage.edit(updatedMessage);

                    if (!updatedMessage.includes("__\\_")) {
                        finished = true;
                        hangmanMessage.edit(stages[attempts] + 'Congratulations! You won!');
                        letterCollector.stop();
                        letterCollector2.stop();
                    }
                }
            });
        }
    },
};