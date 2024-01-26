// Import the necessary modules
const { SlashCommandBuilder } = require("@discordjs/builders");
const { exec } = require("child_process");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const { MongoClient } = require("mongodb");
const logger = require("../logger.js");

var disabledTime = 0;
module.exports = {
  data: new SlashCommandBuilder()
    .setName("muteroulette")
    .setDescription("Try your luck at the mute roulette!")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("play")
        .setDescription("Roll the dice and chance fate!")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("stats")
        .setDescription("View your mute roulette stats!")
        .addMentionableOption((option) =>
          option
            .setName("person")
            .setDescription(
              "The person who's stats you want to check. OPTIONAL."
            )
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("leaders")
        .setDescription("View the mute roulette leaderboard!")
    ),
  async execute(interaction) {
    // connect to the database
    const uri =
      "mongodb+srv://heelerhouse:2007Lj76727191@cluster0.7ynqt27.mongodb.net/?retryWrites=true&w=majority";
    const client = new MongoClient(uri);
    await client.connect();
    logger.bilby("Connected to database!");

    const users = client.db("muteroulette").collection("users");

    if (interaction.options.getSubcommand() === "play") {
      var user = await users.findOne({ user: interaction.member.id });
      // each entry has format { id: string, numMutesTotal: number, numAllTotal: number, numStreak: number, numMaxStreak: number, lastTime: string }
      if (user == null) {
        await users.insertOne({
          user: interaction.member.id,
          numMutesTotal: 0,
          numAllTotal: 0,
          numStreak: 0,
          numMaxStreak: 0,
          lastTime: "",
          powerUps: [],
          mutePercentage: 0,
        });
        user = await users.findOne({ user: interaction.member.id });
      }

      // get the user's data
      const numMutesTotal = user.numMutesTotal;
      const numAllTotal = user.numAllTotal;
      const numStreak = user.numStreak;
      const numMaxStreak = user.numMaxStreak;
      const lastTime = user.lastTime;
      const powerUps = user.powerUps;

      // get the current time
      const currentTime = new Date();

      // remove powerup function
      function removePowerUp(powerUp) {
        var powerUpToChange = powerUps;
        let index = powerUpToChange.indexOf(powerUp);
        console.log(index)
        if (index > -1) {
            powerUpToChange.splice(index, 1);
        }
        return powerUpToChange;
      }

      // check if the user ran the command within the last 10 seconds
      if (currentTime - lastTime < 10000) {
        await interaction.reply({
          content: `You must wait ${Math.round(
            (10000 - (currentTime - lastTime)) / 1000
          )} seconds before using this command again!`,
          ephemeral: true,
        });
        return;
      }

      // if disabled time under 10 mintues
      if (currentTime - disabledTime < 600000) {
        await interaction.reply({
          content: "This command is disabled for 10 minutes!",
        });
        return;
      }

      // update the user's data
      await users.updateOne(
        { user: interaction.member.id },
        { $set: { lastTime: currentTime } }
      );

      // checks if the user has a 50/50 powerup
      if (powerUps.includes("Fifty-Fifty")) {
        const randomNumber = Math.floor(Math.random() * 2) + 1;
        if (randomNumber === 1) {
          const fiftyFiftyMessage = [
            "Because of your `Fifty-Fifty` powerup, you landed on heads! You have been muted for 1 hour!",
          ];
          await interaction.reply({
            content: `${
              fiftyFiftyMessage[
                Math.floor(Math.random() * fiftyFiftyMessage.length)
              ]
            }`,
          });
          await interaction.member.timeout(3600000).catch(async (error) => {
            await interaction.followUp({
              content: `I was unable to mute you! Are you an admin?`,
              ephemeral: true,
            });
          });
          await users.updateOne(
            { user: interaction.member.id },
            {
              $set: {
                numMutesTotal: numMutesTotal + 1,
                numAllTotal: numAllTotal + 1,
                numStreak: 0,
                numMaxStreak: Math.max(numMaxStreak, 0),
                mutePercentage: Math.round(
                  ((numMutesTotal + 1) / (numAllTotal + 1)) * 100
                ),
                powerUps: removePowerUp("Fifty-Fifty"),
              },
            }
          );
          return;
        } else {
          const fiftyFiftyMessage = [
            "Because of your `Fifty-Fifty` powerup, you landed on tails! You got off easy.",
          ];
          await interaction.reply({
            content: `${
              fiftyFiftyMessage[
                Math.floor(Math.random() * fiftyFiftyMessage.length)
              ]
            }`,
          });
          await users.updateOne(
            { user: interaction.member.id },
            {
              $set: {
                numAllTotal: numAllTotal + 1,
                numStreak: numStreak + 1,
                numMaxStreak: Math.max(numMaxStreak, numStreak + 1),
                mutePercentage: Math.round(
                  (numMutesTotal / (numAllTotal + 1)) * 100
                ),
                powerUps: removePowerUp("Fifty-Fifty"),
              },
            }
          );
          return;
        }
      }

      // get a random number between 1 and 100
      const randomNumber = Math.floor(Math.random() * 100) + 1;

      logger.bilby(randomNumber);

      // 1-5: mute for 10 minutes
      if (randomNumber <= 5) {
        // checks if the user has a shield powerup
        if (powerUps.includes("Shield")) {
          const shieldMessage = [
            "You landed on a 10 minutes mute, but you had a `Shield` powerup, so you were protected!",
          ];
          await interaction.reply({
            content: `You landed on ${randomNumber}. ${
              shieldMessage[Math.floor(Math.random() * shieldMessage.length)]
            }`,
          });
          await users.updateOne(
            { user: interaction.member.id },
            {
              $set: {
                numAllTotal: numAllTotal + 1,
                numStreak: numStreak + 1,
                numMaxStreak: Math.max(numMaxStreak, numStreak + 1),
                mutePercentage: Math.round(
                  (numMutesTotal / (numAllTotal + 1)) * 100
                ),
                powerUps: removePowerUp("Shield"),
              },
            }
          );
          return;
        }

        // checks if the user has a double trouble powerup
        if (powerUps.includes("Double Trouble")) {
          const doubleMessage = [
            "You landed on a 10 minute mute, but you had a `Double Trouble` powerup, so your mute time was doubled!",
          ];
          await interaction.reply({
            content: `You landed on ${randomNumber}. ${
              doubleMessage[Math.floor(Math.random() * doubleMessage.length)]
            }`,
          });
          await interaction.member.timeout(1200000).catch(async (error) => {
            await interaction.followUp({
              content: `I was unable to mute you! Are you an admin?`,
              ephemeral: true,
            });
          });
          await users.updateOne(
            { user: interaction.member.id },
            {
              $set: {
                numMutesTotal: numMutesTotal + 1,
                numAllTotal: numAllTotal + 1,
                numStreak: 0,
                numMaxStreak: Math.max(numMaxStreak, 0),
                mutePercentage: Math.round(
                  ((numMutesTotal + 1) / (numAllTotal + 1)) * 100
                ),
                powerUps: removePowerUp("Double Trouble"),
              },
            }
          );
          return;
        }

        // checks if the user has a raise the stakes powerup
        if (powerUps.includes("Raise the Stakes")) {
          const randomNumber2 = Math.floor(Math.random() * 2) + 1;
          if (randomNumber2 === 1) {
            const muteRaiseMessage = [
              "You landed on a 10 minute mute, but you had a `Raise the Stakes` powerup, so your mute time was doubled!",
            ];
            await interaction.reply({
              content: `You landed on ${randomNumber}. ${
                muteRaiseMessage[
                  Math.floor(Math.random() * muteRaiseMessage.length)
                ]
              }`,
            });
            await interaction.member.timeout(1200000).catch(async (error) => {
              await interaction.followUp({
                content: `I was unable to mute you! Are you an admin?`,
                ephemeral: true,
              });
            });
            await users.updateOne(
              { user: interaction.member.id },
              {
                $set: {
                  numMutesTotal: numMutesTotal + 1,
                  numAllTotal: numAllTotal + 1,
                  numStreak: 0,
                  numMaxStreak: Math.max(numMaxStreak, 0),
                  mutePercentage: Math.round(
                    ((numMutesTotal + 1) / (numAllTotal + 1)) * 100
                  ),
                  powerUps: removePowerUp("Raise the Stakes"),
                },
              }
            );
            return;
          } else {
            const noMuteMessage = [
              "Without the `Raise the Stakes` powerup, this would have been a 10 minute mute!",
            ];
            await interaction.reply({
              content: `You landed on ${randomNumber}. ${
                noMuteMessage[Math.floor(Math.random() * noMuteMessage.length)]
              }`,
            });
            await users.updateOne(
              { user: interaction.member.id },
              {
                $set: {
                  numAllTotal: numAllTotal + 1,
                  numStreak: numStreak + 1,
                  numMaxStreak: Math.max(numMaxStreak, numStreak + 1),
                  mutePercentage: Math.round(
                    (numMutesTotal / (numAllTotal + 1)) * 100
                  ),
                  powerUps: removePowerUp("Raise the Stakes"),
                },
              }
            );
            return;
          }
        }

        const tenMinuteMuteMessage = [
          "Missed out on the worser punishments lmao.",
          "You got lucky this time.",
          "Not too bad.",
          "You got off easy.",
        ];
        await interaction.reply({
          content: `You landed on ${randomNumber}. You have been muted for 10 minutes! ${
            tenMinuteMuteMessage[
              Math.floor(Math.random() * tenMinuteMuteMessage.length)
            ]
          }`,
        });
        await interaction.member.timeout(600000).catch(async (error) => {
          await interaction.followUp({
            content: `I was unable to mute you! Are you an admin?`,
            ephemeral: true,
          });
        });
        await users.updateOne(
          { user: interaction.member.id },
          {
            $set: {
              numMutesTotal: numMutesTotal + 1,
              numAllTotal: numAllTotal + 1,
              numStreak: 0,
              numMaxStreak: Math.max(numMaxStreak, 0),
              mutePercentage: Math.round(
                ((numMutesTotal + 1) / (numAllTotal + 1)) * 100
              ),
            },
          }
        );
        return;
      }

      // 6-10: mute for 30 minutes
      if (randomNumber <= 10) {
        // checks if the user has a shield powerup
        if (powerUps.includes("Shield")) {
          const shieldMessage = [
            "You landed on a 30 minute mute, but you had a `Shield` powerup, so you were protected!",
          ];
          await interaction.reply({
            content: `You landed on ${randomNumber}. ${
              shieldMessage[Math.floor(Math.random() * shieldMessage.length)]
            }`,
          });
          await users.updateOne(
            { user: interaction.member.id },
            {
              $set: {
                numAllTotal: numAllTotal + 1,
                numStreak: numStreak + 1,
                numMaxStreak: Math.max(numMaxStreak, numStreak + 1),
                mutePercentage: Math.round(
                  (numMutesTotal / (numAllTotal + 1)) * 100
                ),
                powerUps: removePowerUp("Shield"),
              },
            }
          );
          return;
        }

        // checks if the user has a double trouble powerup
        if (powerUps.includes("Double Trouble")) {
          const doubleMessage = [
            "You landed on a 30 minute mute, but you had a `Double Trouble` powerup, so your mute time was doubled!",
          ];
          await interaction.reply({
            content: `You landed on ${randomNumber}. ${
              doubleMessage[Math.floor(Math.random() * doubleMessage.length)]
            }`,
          });
          await interaction.member.timeout(3600000).catch(async (error) => {
            await interaction.followUp({
              content: `I was unable to mute you! Are you an admin?`,
              ephemeral: true,
            });
          });
          await users.updateOne(
            { user: interaction.member.id },
            {
              $set: {
                numMutesTotal: numMutesTotal + 1,
                numAllTotal: numAllTotal + 1,
                numStreak: 0,
                numMaxStreak: Math.max(numMaxStreak, 0),
                powerUps: removePowerUp("Double Trouble"),
                mutePercentage: Math.round(
                  ((numMutesTotal + 1) / (numAllTotal + 1)) * 100
                ),
              },
            }
          );
          return;
        }

        // checks if the user has a raise the stakes powerup
        if (powerUps.includes("Raise the Stakes")) {
          const randomNumber2 = Math.floor(Math.random() * 2) + 1;
          if (randomNumber2 === 1) {
            const muteRaiseMessage = [
              "You landed on a 30 minute mute, but you had a `Raise the Stakes` powerup, so your mute time was doubled!",
            ];
            await interaction.reply({
              content: `You landed on ${randomNumber}. ${
                muteRaiseMessage[
                  Math.floor(Math.random() * muteRaiseMessage.length)
                ]
              }`,
            });
            await interaction.member.timeout(3600000).catch(async (error) => {
              await interaction.followUp({
                content: `I was unable to mute you! Are you an admin?`,
                ephemeral: true,
              });
            });
            await users.updateOne(
              { user: interaction.member.id },
              {
                $set: {
                  numMutesTotal: numMutesTotal + 1,
                  numAllTotal: numAllTotal + 1,
                  numStreak: 0,
                  numMaxStreak: Math.max(numMaxStreak, 0),
                  mutePercentage: Math.round(
                    ((numMutesTotal + 1) / (numAllTotal + 1)) * 100
                  ),
                  powerUps: removePowerUp("Raise the Stakes"),
                },
              }
            );
            return;
          } else {
            const noMuteMessage = [
              "Without the `Raise the Stakes` powerup, this would have been a 30 minute mute!",
            ];
            await interaction.reply({
              content: `You landed on ${randomNumber}. ${
                noMuteMessage[Math.floor(Math.random() * noMuteMessage.length)]
              }`,
            });
            await users.updateOne(
              { user: interaction.member.id },
              {
                $set: {
                  numAllTotal: numAllTotal + 1,
                  numStreak: numStreak + 1,
                  numMaxStreak: Math.max(numMaxStreak, numStreak + 1),
                  mutePercentage: Math.round(
                    (numMutesTotal / (numAllTotal + 1)) * 100
                  ),
                  powerUps: removePowerUp("Raise the Stakes"),
                },
              }
            );
            return;
          }
        }

        const thirtyMinuteMuteMessage = [
          "Lmaoooo.",
          "Nooob.",
          "U can watch 4 entire episodes of Bluey in that time.",
          "Tsk Tsk Tsk.",
        ];
        await interaction.reply({
          content: `You landed on ${randomNumber}. You have been muted for 30 minutes! ${
            thirtyMinuteMuteMessage[
              Math.floor(Math.random() * thirtyMinuteMuteMessage.length)
            ]
          }`,
        });
        await interaction.member.timeout(1800000).catch(async (error) => {
          await interaction.followUp({
            content: `I was unable to mute you! Are you an admin?`,
            ephemeral: true,
          });
        });
        await users.updateOne(
          { user: interaction.member.id },
          {
            $set: {
              numMutesTotal: numMutesTotal + 1,
              numAllTotal: numAllTotal + 1,
              numStreak: 0,
              numMaxStreak: Math.max(numMaxStreak, 0),
              mutePercentage: Math.round(
                ((numMutesTotal + 1) / (numAllTotal + 1)) * 100
              ),
            },
          }
        );
        return;
      }

      // 11-15: mute for 1 hour
      if (randomNumber <= 15) {
        // checks if the user has a shield powerup
        if (powerUps.includes("Shield")) {
          const shieldMessage = [
            "You landed on a 1 hour mute, but you had a `Shield` powerup, so you were protected!",
          ];
          await interaction.reply({
            content: `You landed on ${randomNumber}. ${
              shieldMessage[Math.floor(Math.random() * shieldMessage.length)]
            }`,
          });
          await users.updateOne(
            { user: interaction.member.id },
            {
              $set: {
                numAllTotal: numAllTotal + 1,
                numStreak: numStreak + 1,
                numMaxStreak: Math.max(numMaxStreak, numStreak + 1),
                mutePercentage: Math.round(
                  (numMutesTotal / (numAllTotal + 1)) * 100
                ),
                powerUps: removePowerUp("Shield"),
              },
            }
          );
          return;
        }

        // checks if the user has a double trouble powerup
        if (powerUps.includes("Double Trouble")) {
          const doubleMessage = [
            "You landed on a 1 hour mute, but you had a `Double Trouble` powerup, so your mute time was doubled!",
          ];
          await interaction.reply({
            content: `You landed on ${randomNumber}. ${
              doubleMessage[Math.floor(Math.random() * doubleMessage.length)]
            }`,
          });
          await interaction.member.timeout(7200000).catch(async (error) => {
            await interaction.followUp({
              content: `I was unable to mute you! Are you an admin?`,
              ephemeral: true,
            });
          });
          await users.updateOne(
            { user: interaction.member.id },
            {
              $set: {
                numMutesTotal: numMutesTotal + 1,
                numAllTotal: numAllTotal + 1,
                numStreak: 0,
                numMaxStreak: Math.max(numMaxStreak, 0),
                mutePercentage: Math.round(
                  ((numMutesTotal + 1) / (numAllTotal + 1)) * 100
                ),
                powerUps: removePowerUp("Double Trouble"),
              },
            }
          );
          return;
        }

        // checks if the user has a raise the stakes powerup
        if (powerUps.includes("Raise the Stakes")) {
          const randomNumber2 = Math.floor(Math.random() * 2) + 1;
          if (randomNumber2 === 1) {
            const muteRaiseMessage = [
              "You landed on a 1 hour mute, but you had a `Raise the Stakes` powerup, so your mute time was doubled!",
            ];
            await interaction.reply({
              content: `You landed on ${randomNumber}. ${
                muteRaiseMessage[
                  Math.floor(Math.random() * muteRaiseMessage.length)
                ]
              }`,
            });
            await interaction.member.timeout(7200000).catch(async (error) => {
              await interaction.followUp({
                content: `I was unable to mute you! Are you an admin?`,
                ephemeral: true,
              });
            });
            await users.updateOne(
              { user: interaction.member.id },
              {
                $set: {
                  numMutesTotal: numMutesTotal + 1,
                  numAllTotal: numAllTotal + 1,
                  numStreak: 0,
                  numMaxStreak: Math.max(numMaxStreak, 0),
                  mutePercentage: Math.round(
                    ((numMutesTotal + 1) / (numAllTotal + 1)) * 100
                  ),
                  powerUps: removePowerUp("Raise the Stakes"),
                },
              }
            );
            return;
          } else {
            const noMuteMessage = [
              "Without the `Raise the Stakes` powerup, this would have been a 1 hour mute!",
            ];
            await interaction.reply({
              content: `You landed on ${randomNumber}. ${
                noMuteMessage[Math.floor(Math.random() * noMuteMessage.length)]
              }`,
            });
            await users.updateOne(
              { user: interaction.member.id },
              {
                $set: {
                  numAllTotal: numAllTotal + 1,
                  numStreak: numStreak + 1,
                  numMaxStreak: Math.max(numMaxStreak, numStreak + 1),
                  mutePercentage: Math.round(
                    (numMutesTotal / (numAllTotal + 1)) * 100
                  ),
                  powerUps: removePowerUp("Raise the Stakes"),
                },
              }
            );
            return;
          }
        }

        const oneHourMuteMessage = [
          "Lmaoooo.",
          "Nooob.",
          "Better luck next time.",
          "Bro is NOT lucky.",
        ];
        await interaction.reply({
          content: `You landed on ${randomNumber}. You have been muted for 1 hour! ${
            oneHourMuteMessage[
              Math.floor(Math.random() * oneHourMuteMessage.length)
            ]
          }`,
        });
        await interaction.member.timeout(3600000).catch(async (error) => {
          await interaction.followUp({
            content: `I was unable to mute you! Are you an admin?`,
            ephemeral: true,
          });
        });
        await users.updateOne(
          { user: interaction.member.id },
          {
            $set: {
              numMutesTotal: numMutesTotal + 1,
              numAllTotal: numAllTotal + 1,
              numStreak: 0,
              numMaxStreak: Math.max(numMaxStreak, 0),
              mutePercentage: Math.round(
                ((numMutesTotal + 1) / (numAllTotal + 1)) * 100
              ),
            },
          }
        );
        return;
      }

      // 16-20: mute for 3 hours
      if (randomNumber <= 20) {
        // checks if the user has a shield powerup
        if (powerUps.includes("Shield")) {
          const shieldMessage = [
            "You landed on a 3 hour mute, but you had a `Shield` powerup, so you were protected!",
          ];
          await interaction.reply({
            content: `You landed on ${randomNumber}. ${
              shieldMessage[Math.floor(Math.random() * shieldMessage.length)]
            }`,
          });
          await users.updateOne(
            { user: interaction.member.id },
            {
              $set: {
                numAllTotal: numAllTotal + 1,
                numStreak: numStreak + 1,
                numMaxStreak: Math.max(numMaxStreak, numStreak + 1),
                mutePercentage: Math.round(
                  (numMutesTotal / (numAllTotal + 1)) * 100
                ),
                powerUps: removePowerUp("Shield"),
              },
            }
          );
          return;
        }

        // checks if the user has a double trouble powerup
        if (powerUps.includes("Double Trouble")) {
          const doubleMessage = [
            "You landed on a 3 hour mute, but you had a `Double Trouble` powerup, so your mute time was doubled!",
          ];
          await interaction.reply({
            content: `You landed on ${randomNumber}. ${
              doubleMessage[Math.floor(Math.random() * doubleMessage.length)]
            }`,
          });
          await interaction.member.timeout(21600000).catch(async (error) => {
            await interaction.followUp({
              content: `I was unable to mute you! Are you an admin?`,
              ephemeral: true,
            });
          });
          await users.updateOne(
            { user: interaction.member.id },
            {
              $set: {
                numMutesTotal: numMutesTotal + 1,
                numAllTotal: numAllTotal + 1,
                numStreak: 0,
                numMaxStreak: Math.max(numMaxStreak, 0),
                mutePercentage: Math.round(
                  ((numMutesTotal + 1) / (numAllTotal + 1)) * 100
                ),
                powerUps: removePowerUp("Double Trouble"),
              },
            }
          );
          return;
        }

        // checks if the user has a raise the stakes powerup
        if (powerUps.includes("Raise the Stakes")) {
          const randomNumber2 = Math.floor(Math.random() * 2) + 1;
          if (randomNumber2 === 1) {
            const muteRaiseMessage = [
              "You landed on a 3 hour mute, but you had a `Raise the Stakes` powerup, so your mute time was doubled!",
            ];
            await interaction.reply({
              content: `You landed on ${randomNumber}. ${
                muteRaiseMessage[
                  Math.floor(Math.random() * muteRaiseMessage.length)
                ]
              }`,
            });
            await interaction.member.timeout(21600000).catch(async (error) => {
              await interaction.followUp({
                content: `I was unable to mute you! Are you an admin?`,
                ephemeral: true,
              });
            });
            await users.updateOne(
              { user: interaction.member.id },
              {
                $set: {
                  numMutesTotal: numMutesTotal + 1,
                  numAllTotal: numAllTotal + 1,
                  numStreak: 0,
                  numMaxStreak: Math.max(numMaxStreak, 0),
                  mutePercentage: Math.round(
                    ((numMutesTotal + 1) / (numAllTotal + 1)) * 100
                  ),
                  powerUps: removePowerUp("Raise the Stakes"),
                },
              }
            );
            return;
          } else {
            const noMuteMessage = [
              "Without the `Raise the Stakes` powerup, this would have been a 3 hour mute!",
            ];
            await interaction.reply({
              content: `You landed on ${randomNumber}. ${
                noMuteMessage[Math.floor(Math.random() * noMuteMessage.length)]
              }`,
            });
            await users.updateOne(
              { user: interaction.member.id },
              {
                $set: {
                  numAllTotal: numAllTotal + 1,
                  numStreak: numStreak + 1,
                  numMaxStreak: Math.max(numMaxStreak, numStreak + 1),
                  mutePercentage: Math.round(
                    (numMutesTotal / (numAllTotal + 1)) * 100
                  ),
                  powerUps: removePowerUp("Raise the Stakes"),
                },
              }
            );
            return;
          }
        }

        const threeHourMuteMessage = [
          "Congrats! Your Heeler House addiction is (hopefully) cured!",
          "That's enough time to touch grass or get productive stuff done!",
          "Whomp whomp.",
        ];
        await interaction.reply({
          content: `You landed on ${randomNumber}. You have been muted for 3 hours! ${
            threeHourMuteMessage[
              Math.floor(Math.random() * threeHourMuteMessage.length)
            ]
          }`,
        });
        await interaction.member.timeout(10800000).catch(async (error) => {
          await interaction.followUp({
            content: `I was unable to mute you! Are you an admin?`,
            ephemeral: true,
          });
        });
        await users.updateOne(
          { user: interaction.member.id },
          {
            $set: {
              numMutesTotal: numMutesTotal + 1,
              numAllTotal: numAllTotal + 1,
              numStreak: 0,
              numMaxStreak: Math.max(numMaxStreak, 0),
              mutePercentage: Math.round(
                ((numMutesTotal + 1) / (numAllTotal + 1)) * 100
              ),
            },
          }
        );
        return;
      }

      // 21: get another random number from 1-10, if it's 1-9, mute for 1 day, if it's 10, mute for 1 week
      if (randomNumber === 21) {
        const randomNumber2 = Math.floor(Math.random() * 10) + 1;
        if (randomNumber2 <= 9) {
          // checks if the user has a shield powerup
          if (powerUps.includes("Shield")) {
            const shieldMessage = [
              "You landed on a 1 day mute, but you had a `Shield` powerup, so you were protected!",
            ];
            await interaction.reply({
              content: `You landed on ${randomNumber}. ${
                shieldMessage[Math.floor(Math.random() * shieldMessage.length)]
              }`,
            });
            await users.updateOne(
              { user: interaction.member.id },
              {
                $set: {
                  numAllTotal: numAllTotal + 1,
                  numStreak: numStreak + 1,
                  numMaxStreak: Math.max(numMaxStreak, numStreak + 1),
                  mutePercentage: Math.round(
                    (numMutesTotal / (numAllTotal + 1)) * 100
                  ),
                  powerUps: removePowerUp("Shield"),
                },
              }
            );
            return;
          }

          // checks if the user has a double trouble powerup
          if (powerUps.includes("Double Trouble")) {
            const doubleMessage = [
              "You landed on a 1 day mute, but you had a `Double Trouble` powerup, so your mute time was doubled!",
            ];
            await interaction.reply({
              content: `You landed on ${randomNumber}. ${
                doubleMessage[Math.floor(Math.random() * doubleMessage.length)]
              }`,
            });
            await interaction.member.timeout(172800000).catch(async (error) => {
              await interaction.followUp({
                content: `I was unable to mute you! Are you an admin?`,
                ephemeral: true,
              });
            });
            await users.updateOne(
              { user: interaction.member.id },
              {
                $set: {
                  numMutesTotal: numMutesTotal + 1,
                  numAllTotal: numAllTotal + 1,
                  numStreak: 0,
                  numMaxStreak: Math.max(numMaxStreak, 0),
                  mutePercentage: Math.round(
                    ((numMutesTotal + 1) / (numAllTotal + 1)) * 100
                  ),
                  powerUps: removePowerUp("Double Trouble"),
                },
              }
            );
            return;
          }

          // checks if the user has a raise the stakes powerup
          if (powerUps.includes("Raise the Stakes")) {
            const randomNumber3 = Math.floor(Math.random() * 2) + 1;
            if (randomNumber3 === 1) {
              const muteRaiseMessage = [
                "You landed on a 1 day mute, but you had a `Raise the Stakes` powerup, so your mute time was doubled!",
              ];
              await interaction.reply({
                content: `You landed on ${randomNumber}. ${
                  muteRaiseMessage[
                    Math.floor(Math.random() * muteRaiseMessage.length)
                  ]
                }`,
              });
              await interaction.member
                .timeout(172800000)
                .catch(async (error) => {
                  await interaction.followUp({
                    content: `I was unable to mute you! Are you an admin?`,
                    ephemeral: true,
                  });
                });
              await users.updateOne(
                { user: interaction.member.id },
                {
                  $set: {
                    numMutesTotal: numMutesTotal + 1,
                    numAllTotal: numAllTotal + 1,
                    numStreak: 0,
                    numMaxStreak: Math.max(numMaxStreak, 0),
                    mutePercentage: Math.round(
                      ((numMutesTotal + 1) / (numAllTotal + 1)) * 100
                    ),
                    powerUps: removePowerUp("Raise the Stakes"),
                  },
                }
              );
              return;
            } else {
              const noMuteMessage = [
                "Without the `Raise the Stakes` powerup, this would have been a 1 day mute!",
              ];
              await interaction.reply({
                content: `You landed on ${randomNumber}. ${
                  noMuteMessage[
                    Math.floor(Math.random() * noMuteMessage.length)
                  ]
                }`,
              });
              await users.updateOne(
                { user: interaction.member.id },
                {
                  $set: {
                    numAllTotal: numAllTotal + 1,
                    numStreak: numStreak + 1,
                    numMaxStreak: Math.max(numMaxStreak, numStreak + 1),
                    mutePercentage: Math.round(
                      (numMutesTotal / (numAllTotal + 1)) * 100
                    ),
                    powerUps: removePowerUp("Raise the Stakes"),
                  },
                }
              );
              return;
            }
          }

          const oneDayMuteMessage = [
            "Oof.",
            "An entire day? Sheeeesh.",
            "Whomp whomp.",
          ];
          await interaction.reply({
            content: `You landed on ${randomNumber}. You have been muted for 1 day! ${
              oneDayMuteMessage[
                Math.floor(Math.random() * oneDayMuteMessage.length)
              ]
            }`,
          });
          await interaction.member.timeout(86400000).catch(async (error) => {
            await interaction.followUp({
              content: `I was unable to mute you! Are you an admin?`,
              ephemeral: true,
            });
          });
          await users.updateOne(
            { user: interaction.member.id },
            {
              $set: {
                numMutesTotal: numMutesTotal + 1,
                numAllTotal: numAllTotal + 1,
                numStreak: 0,
                numMaxStreak: Math.max(numMaxStreak, 0),
                mutePercentage: Math.round(
                  ((numMutesTotal + 1) / (numAllTotal + 1)) * 100
                ),
              },
            }
          );
          return;
        } else {
          // checks if the user has a shield powerup
          if (powerUps.includes("Shield")) {
            const shieldMessage = [
              "You landed on a 1 week mute, but you had a `Shield` powerup, so you were protected!",
            ];
            await interaction.reply({
              content: `You landed on ${randomNumber}. ${
                shieldMessage[Math.floor(Math.random() * shieldMessage.length)]
              }`,
            });
            await users.updateOne(
              { user: interaction.member.id },
              {
                $set: {
                  numAllTotal: numAllTotal + 1,
                  numAllTotal: numAllTotal + 1,
                  numStreak: numStreak + 1,
                  numMaxStreak: Math.max(numMaxStreak, numStreak + 1),
                  mutePercentage: Math.round(
                    (numMutesTotal / (numAllTotal + 1)) * 100
                  ),
                  powerUps: removePowerUp("Shield"),
                },
              }
            );
            return;
          }

          // checks if the user has a double trouble powerup
          if (powerUps.includes("Double Trouble")) {
            const doubleMessage = [
              "You landed on a 1 week mute, but you had a `Double Trouble` powerup, so your mute time was doubled!",
            ];
            await interaction.reply({
              content: `You landed on ${randomNumber}. ${
                doubleMessage[Math.floor(Math.random() * doubleMessage.length)]
              }`,
            });
            await interaction.member.timeout(604800000).catch(async (error) => {
              await interaction.followUp({
                content: `I was unable to mute you! Are you an admin?`,
                ephemeral: true,
              });
            });
            await users.updateOne(
              { user: interaction.member.id },
              {
                $set: {
                  numMutesTotal: numMutesTotal + 1,
                  numAllTotal: numAllTotal + 1,
                  numAllTotal: numAllTotal + 1,
                  numStreak: 0,
                  numMaxStreak: Math.max(numMaxStreak, 0),
                  mutePercentage: Math.round(
                    ((numMutesTotal + 1) / (numAllTotal + 1)) * 100
                  ),
                  powerUps: removePowerUp("Double Trouble"),
                },
              }
            );
            return;
          }

          // checks if the user has a raise the stakes powerup
          if (powerUps.includes("Raise the Stakes")) {
            const randomNumber3 = Math.floor(Math.random() * 2) + 1;
            if (randomNumber3 === 1) {
              const muteRaiseMessage = [
                "You landed on a 1 week mute, but you had a `Raise the Stakes` powerup, so your mute time was doubled!",
              ];
              await interaction.reply({
                content: `You landed on ${randomNumber}. ${
                  muteRaiseMessage[
                    Math.floor(Math.random() * muteRaiseMessage.length)
                  ]
                }`,
              });
              await interaction.member
                .timeout(604800000)
                .catch(async (error) => {
                  await interaction.followUp({
                    content: `I was unable to mute you! Are you an admin?`,
                    ephemeral: true,
                  });
                });
              await users.updateOne(
                { user: interaction.member.id },
                {
                  $set: {
                    numMutesTotal: numMutesTotal + 1,
                    numAllTotal: numAllTotal + 1,
                    numAllTotal: numAllTotal + 1,
                    numStreak: 0,
                    numMaxStreak: Math.max(numMaxStreak, 0),
                    mutePercentage: Math.round(
                      ((numMutesTotal + 1) / (numAllTotal + 1)) * 100
                    ),
                    powerUps: removePowerUp("Raise the Stakes"),
                  },
                }
              );
              return;
            } else {
              const noMuteMessage = [
                "Without the `Raise the Stakes` powerup, this would have been a 1 week mute!",
              ];
              await interaction.reply({
                content: `You landed on ${randomNumber}. ${
                  noMuteMessage[
                    Math.floor(Math.random() * noMuteMessage.length)
                  ]
                }`,
              });
              await users.updateOne(
                { user: interaction.member.id },
                {
                  $set: {
                    numAllTotal: numAllTotal + 1,
                    numAllTotal: numAllTotal + 1,
                    numStreak: numStreak + 1,
                    numMaxStreak: Math.max(numMaxStreak, numStreak + 1),
                    mutePercentage: Math.round(
                      (numMutesTotal / (numAllTotal + 1)) * 100
                    ),
                    powerUps: removePowerUp("Raise the Stakes"),
                  },
                }
              );
              return;
            }
          }

          const oneWeekMuteMessage = [
            "Do you understand how small the chances of this is? There is exactly a .1% chance of this happening, and it happened to you. It's actually insane how this happened, I'm genuinely in shock. You should go buy a lottery ticket. Whackadoo!",
          ];
          await interaction.reply({
            content: `You landed on ${randomNumber}. You have been muted for 1 week! ${
              oneWeekMuteMessage[
                Math.floor(Math.random() * oneWeekMuteMessage.length)
              ]
            }`,
          });
          await interaction.member.timeout(604800000).catch(async (error) => {
            await interaction.followUp({
              content: `I was unable to mute you! Are you an admin?`,
              ephemeral: true,
            });
          });
          await users.updateOne(
            { user: interaction.member.id },
            {
              $set: {
                numMutesTotal: numMutesTotal + 1,
                numAllTotal: numAllTotal + 1,
                numStreak: 0,
                numMaxStreak: Math.max(numMaxStreak, 0),
                mutePercentage: Math.round(
                  ((numMutesTotal + 1) / (numAllTotal + 1)) * 100
                ),
              },
            }
          );
          return;
        }
      }

      // if they have a raise the stakes powerup, remove it
      if (powerUps.includes("Raise the Stakes")) {
        await users.updateOne(
          { user: interaction.member.id },
          {
            $set: {
              powerUps: removePowerUp("Raise the Stakes"),
            },
          }
        );
      }

      // 22-26: Get a shield powerup
      if (randomNumber <= 26) {
        const shieldMessage = [
          "You get a `Shield` powerup! This will be automatically used to protect yourself from your next mute.",
        ];
        await interaction.reply({
          content: `You landed on ${randomNumber}. ${
            shieldMessage[Math.floor(Math.random() * shieldMessage.length)]
          }`,
        });
        await users.updateOne(
          { user: interaction.member.id },
          {
            $set: {
              numAllTotal: numAllTotal + 1,
              numAllTotal: numAllTotal + 1,
              numStreak: numStreak + 1,
              numMaxStreak: Math.max(numMaxStreak, numStreak + 1),
              powerUps: [...powerUps, "Shield"],
              mutePercentage: Math.round(
                (numMutesTotal / (numAllTotal + 1)) * 100
              ),
            },
          }
        );
        return;
      }

      // 27-30: Get a double trouble powerup
      if (randomNumber <= 30) {
        const doubleMessage = [
          "You get a `Double Trouble` powerup! This will automatically be used to double your next mute time.",
        ];
        await interaction.reply({
          content: `You landed on ${randomNumber}. ${
            doubleMessage[Math.floor(Math.random() * doubleMessage.length)]
          }`,
        });
        await users.updateOne(
          { user: interaction.member.id },
          {
            $set: {
              numAllTotal: numAllTotal + 1,
              numStreak: numStreak + 1,
              numMaxStreak: Math.max(numMaxStreak, numStreak + 1),
              powerUps: [...powerUps, "Double Trouble"],
              mutePercentage: Math.round(
                (numMutesTotal / (numAllTotal + 1)) * 100
              ),
            },
          }
        );
        return;
      }

      // 31-35: Get a raise the stakes powerup
      if (randomNumber <= 35) {
        const raiseMessage = [
          "You get a `Raise the Stakes` powerup! This will automatically be used on your next roll to halve all potential mute chances, but double all potential mute times.",
        ];
        await interaction.reply({
          content: `You landed on ${randomNumber}. ${
            raiseMessage[Math.floor(Math.random() * raiseMessage.length)]
          }`,
        });
        await users.updateOne(
          { user: interaction.member.id },
          {
            $set: {
              numAllTotal: numAllTotal + 1,
              numStreak: numStreak + 1,
              numMaxStreak: Math.max(numMaxStreak, numStreak + 1),
              powerUps: [...powerUps, "Raise the Stakes"],
              mutePercentage: Math.round(
                (numMutesTotal / (numAllTotal + 1)) * 100
              ),
            },
          }
        );
        return;
      }

      // 36-40: Get a 50/50 powerup
      if (randomNumber <= 40) {
        const fiftyMessage = [
          "You get a `Fifty-Fifty` powerup! This will automatically be used on your next roll to make it a 50/50 chance of getting muted. Good luck!",
        ];
        await interaction.reply({
          content: `You landed on ${randomNumber}. ${
            fiftyMessage[Math.floor(Math.random() * fiftyMessage.length)]
          }`,
        });
        await users.updateOne(
          { user: interaction.member.id },
          {
            $set: {
              numAllTotal: numAllTotal + 1,
              numStreak: numStreak + 1,
              numMaxStreak: Math.max(numMaxStreak, numStreak + 1),
              powerUps: [...powerUps, "Fifty-Fifty"],
              mutePercentage: Math.round(
                (numMutesTotal / (numAllTotal + 1)) * 100
              ),
            },
          }
        );
        return;
      }

      // 41-45: Disable Muteroulette for everyone for 10 minutes
      if (randomNumber <= 45) {
        const tripleMessage = [
          "You have disabled mute roulette for everyone for 10 minutes! Enjoy the peace and quiet.",
        ];
        await interaction.reply({
          content: `You landed on ${randomNumber}. ${
            tripleMessage[Math.floor(Math.random() * tripleMessage.length)]
          }`,
        });
        disabledTime = new Date();
        return;
      }

      // 46-50: Gift a friend
      if (randomNumber <= 50) {
        const giftMessage = [
          "You get to gift a friend a powerup! Who do you want to gift?",
        ];
        // prompt user for a user to gift
        await interaction.reply({
          content: `You landed on ${randomNumber}. ${
            giftMessage[Math.floor(Math.random() * giftMessage.length)]
          }`,
        });
        await users.updateOne(
          { user: interaction.member.id },
          {
            $set: {
              numAllTotal: numAllTotal + 1,
              numStreak: numStreak + 1,
              numMaxStreak: Math.max(numMaxStreak, numStreak + 1),
              mutePercentage: Math.round(
                (numMutesTotal / (numAllTotal + 1)) * 100
              ),
            },
          }
        );
        const filter = (m) => m.author.id === interaction.user.id;
        const selectedUserMessages = await interaction.channel.awaitMessages({
          filter,
          max: 1,
          time: 120000,
        });
        if (selectedUserMessages.size === 0) {
          await interaction.channel.send(
            "You did not select a user! Gift wasted."
          );
          return;
        }
        const user = selectedUserMessages
          .first()
          .content.split(" ")[0]
          .slice(2, -1);

        var discordUser = null;
        try {
          discordUser = await interaction.guild.members.fetch(user);
        } catch (error) {
          await interaction.channel.send(
            "You must mention a user! Gift wasted."
          );
          return;
        }

        const giftedUser = await users.findOne({ user: user });
        if (giftedUser == null) {
          await interaction.channel.send(
            "That user has not run the mute roulette yet! Gift wasted."
          );
          return;
        }
        if (giftedUser.user === interaction.member.id) {
          await interaction.channel.send(
            "You cannot gift yourself! Gift wasted."
          );
          return;
        }
        await interaction.channel.send(
          `You have selected ${
            discordUser.nickname ||
            discordUser.user.globalName ||
            discordUser.user.username
          }! What powerup do you want to gift them? You can choose from \`Shield\`, \`Double Trouble\`, \`Raise the Stakes\`, and \`Fifty-Fifty\`.`
        );
        const powerupMessages = await interaction.channel.awaitMessages({
          filter,
          max: 1,
          time: 120000,
        });
        if (powerupMessages.size === 0) {
          await interaction.channel.send(
            "You did not select a powerup! Gift wasted."
          );
          return;
        }
        var powerup = powerupMessages.first().content.toLowerCase();
        if (
          powerup !== "shield" &&
          powerup !== "double trouble" &&
          powerup !== "raise the stakes" &&
          powerup !== "fifty-fifty"
        ) {
          await interaction.channel.send(
            "You must choose a valid powerup! Gift wasted."
          );
          return;
        }
        if (powerup.toLowerCase() === "shield") {
          powerup = "Shield";
        } else if (powerup.toLowerCase() === "double trouble") {
          powerup = "Double Trouble";
        } else if (powerup.toLowerCase() === "raise the stakes") {
          powerup = "Raise the Stakes";
        } else if (powerup.toLowerCase() === "fifty-fifty") {
          powerup = "Fifty-Fifty";
        }
        await interaction.channel.send(
          `You have selected ${powerup}! Powerup gifted!`
        );
        await users.updateOne(
          { user: user },
          { $set: { powerUps: [...giftedUser.powerUps, powerup] } }
        );
        await users.updateOne(
          { user: interaction.member.id },
          {
            $set: {
              numAllTotal: numAllTotal + 1,
              numStreak: numStreak + 1,
              numMaxStreak: Math.max(numMaxStreak, numStreak + 1),
              mutePercentage: Math.round(
                (numMutesTotal / (numAllTotal + 1)) * 100
              ),
            },
          }
        );

        return;
      }
      logger.bilby("normal roll");
      const normalMessage = [
        "Normal roll!",
        "Nothing happened!",
        "You're safe... for now.",
        "You got lucky this time.",
        "You should roll me again.",
        "Yawn. That was boring.",
        "No punishment this time!",
        "Jalen is best mod!",
      ];
      await interaction.reply({
        content: `You landed on ${randomNumber}. ${
          normalMessage[Math.floor(Math.random() * normalMessage.length)]
        }`,
      });
      await users.updateOne(
        { user: interaction.member.id },
        {
          $set: {
            numAllTotal: numAllTotal + 1,
            numStreak: numStreak + 1,
            numMaxStreak: Math.max(numMaxStreak, numStreak + 1),
            mutePercentage: Math.round(
              (numMutesTotal / (numAllTotal + 1)) * 100
            ),
          },
        }
      );
    } else if (interaction.options.getSubcommand() === "stats") {
      var specifiedUser =
        interaction.options.getMentionable("person") || interaction.member;
      const user = await users.findOne({ user: specifiedUser.id });

      if (user == null) {
        await interaction.reply({
          content: "You have not run the mute roulette yet!",
          ephemeral: true,
        });
        return;
      }
      const numMutesTotal = user.numMutesTotal;
      const numAllTotal = user.numAllTotal;
      const numStreak = user.numStreak;
      const numMaxStreak = user.numMaxStreak;
      const powerUps = user.powerUps;
      const mutePercentage = user.mutePercentage;

      const embed = new EmbedBuilder()
        .setTitle(`Mute Roulette Stats`)
        .setDescription(
          `<@${specifiedUser.id}>\nTotal Mutes: **${numMutesTotal}**\nTotal Rolls: **${numAllTotal}**\nCurrent Streak: **${numStreak}**\nMax Streak: **${numMaxStreak}**\nMute Percentage: **${mutePercentage}%**`
        )
        .addFields({ name: "Powerups", value: powerUps.join("\n") || "None" })
        .setColor("#FF0000");

      await interaction.reply({ embeds: [embed] });
    } else if (interaction.options.getSubcommand() === "leaders") {
      // find the top user for each category
      const topMutes = await users
        .find({ numAllTotal: { $gte: 5 } })
        .sort({ numMutesTotal: -1 })
        .limit(1)
        .toArray();
      const topAll = await users
        .find({ numAllTotal: { $gte: 5 } })
        .sort({ numAllTotal: -1 })
        .limit(1)
        .toArray();
      const topStreak = await users
        .find({ numAllTotal: { $gte: 5 } })
        .sort({ numMaxStreak: -1 })
        .limit(1)
        .toArray();
      const lowestPercentage = await users
        .find({ numAllTotal: { $gte: 5 } })
        .sort({ mutePercentage: 1 })
        .limit(1)
        .toArray();
      const highestPercentage = await users
        .find({ numAllTotal: { $gte: 5 } })
        .sort({ mutePercentage: -1 })
        .limit(1)
        .toArray();

      // get the top user's data
      const topMutesData = topMutes[0].numMutesTotal;
      const topAllData = topAll[0].numAllTotal;
      const topStreakData = topStreak[0].numMaxStreak;
      const lowestPercentageData = lowestPercentage[0].mutePercentage;
      const highestPercentageData = highestPercentage[0].mutePercentage;

      var description = "";

      try {
        const topMutesUser = await interaction.guild.members.fetch(
          topMutes[0].user
        );
        description += `Highest Number of Mutes: **${
          topMutesUser.nickname ||
          topMutesUser.user.displayName ||
          topMutesUser.user.username
        }** - **${topMutesData} mutes**\n`;
      } catch (error) {
        description += `Highest Number of Mutes: **Unknown** - **${topMutesData} mutes**\n`;
      }
      try {
        const topAllUser = await interaction.guild.members.fetch(
          topAll[0].user
        );
        description += `Highest Number of Rolls: **${
          topAllUser.nickname ||
          topAllUser.user.displayName ||
          topAllUser.user.username
        }** - **${topAllData} rolls**\n`;
      } catch (error) {
        description += `Highest Number of Rolls: **Unknown** - **${topAllData} rolls**\n`;
      }
      try {
        const topStreakUser = await interaction.guild.members.fetch(
          topStreak[0].user
        );
        description += `Highest Unmuted Streak: **${
          topStreakUser.nickname ||
          topStreakUser.user.displayName ||
          topStreakUser.user.username
        }** - **${topStreakData} rolls**\n`;
      } catch (error) {
        description += `Highest Unmuted Streak: **Unknown** - **${topStreakData} rolls**\n`;
      }
      try {
        const lowestPercentageUser = await interaction.guild.members.fetch(
          lowestPercentage[0].user
        );
        description += `Lowest Mute Percentage: **${
          lowestPercentageUser.nickname ||
          lowestPercentageUser.user.displayName ||
          lowestPercentageUser.user.username
        }** - **${lowestPercentageData}%**\n`;
      } catch (error) {
        description += `Lowest Mute Percentage: **Unknown** - **${lowestPercentageData}%**\n`;
      }
      try {
        const highestPercentageUser = await interaction.guild.members.fetch(
          highestPercentage[0].user
        );
        description += `Highest Mute Percentage: **${
          highestPercentageUser.nickname ||
          highestPercentageUser.user.displayName ||
          highestPercentageUser.user.username
        }** - **${highestPercentageData}%**\n`;
      } catch (error) {
        description += `Highest Mute Percentage: **Unknown** - **${highestPercentageData}%**\n`;
      }

      // create the embed
      const embed = new EmbedBuilder()
        .setTitle("Mute Roulette Leaderboard")
        .setDescription(description)
        .setColor("#FF0000");

      // send the embed
      await interaction.reply({ embeds: [embed] });
    }
  },
};
