// Import the necessary modules
const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  EmbedBuilder,
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
    const uri = process.env.MONGO_URI;
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

      const getTextTime = (time) => {
        if (time === 1) {
          return "1 minute";
        }
        if (time < 60) {
          return `${time} minutes`;
        }
        if (time === 60) {
          return "1 hour";
        }
        if (time % 60 === 0 && time < 1440) {
          return `${time / 60} hours`;
        }
        if (time === 1440) {
          return "1 day";
        }
        if (time % 1440 === 0 && time < 10080) {
          return `${time / 1440} days`;
        }
        if (time === 10080) {
          return "1 week";
        }
      };

      // MONGO HELPER FUNCTIONS
      // update the user's recent time
      async function updateTime() {
        await users.updateOne(
          { user: interaction.member.id },
          { $set: { lastTime: currentTime } }
        );
      }
      // remove powerup function
      async function removePowerUp(powerUp) {
        const updatedPowerUps = powerUps.filter(p => p !== powerUp);
        await users.updateOne(
          { user: interaction.member.id },
          { $set: { powerUps: updatedPowerUps } }
        );
      }
      // add powerup
      async function addPowerUp(powerUp) {
        const updatedPowerUps = [...powerUps];
        if (!updatedPowerUps.includes(powerUp)) {
          updatedPowerUps.push(powerUp);
        }
        await users.updateOne(
          { user: interaction.member.id },
          {
            $set: {
              powerUps: updatedPowerUps,
            },
          }
        );
      }
      // avoided mute
      async function avoidedMute() {
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
      }
      // muted
      async function muted() {
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
      }

      // POWERUP FUNCTIONS
      // sheild
      async function shield(time) {
        const shieldMessage = [
          `You landed on a ${getTextTime(
            time
          )} mute, but you had a \`Shield\` powerup, so you were protected!`,
        ];
        await interaction.reply({
          content: `You landed on ${randomNumber}. ${
            shieldMessage[Math.floor(Math.random() * shieldMessage.length)]
          }`,
        });
        await avoidedMute();
        await removePowerUp("Shield");
      }
      // double trouble
      async function doubleTrouble(time) {
        if (powerUps.include("Shield")) {
          await shield(time * 2);
          return;
        }
        const doubleMessage = [
          `You landed on a ${getTextTime(
            time
          )} mute, but you had a \`Double Trouble\` powerup, so your mute time was doubled!`,
        ];
        await interaction.reply({
          content: `You landed on ${randomNumber}. ${
            doubleMessage[Math.floor(Math.random() * doubleMessage.length)]
          }`,
        });
        await interaction.member
          .timeout(time * 2 * 60000)
          .catch(async (error) => {
            await interaction.followUp({
              content: `I was unable to mute you! Are you an admin?`,
              ephemeral: true,
            });
          });
        await muted();
        await removePowerUp("Double Trouble");
      }
      // raise the stakes
      async function raiseTheStakes(time) {
        const raiseRandomNumber = Math.floor(Math.random() * 2) + 1;
        if (raiseRandomNumber === 1) {
          if (powerUps.includes("Shield")) {
            await shield(time * 2);
            return;
          }
          const muteRaiseMessage = [
            `You landed on a ${getTextTime(
              time
            )} mute, but you had a \`Raise the Stakes\` powerup, so your mute time was doubled!`,
          ];
          await interaction.reply({
            content: `You landed on ${randomNumber}. ${
              muteRaiseMessage[
                Math.floor(Math.random() * muteRaiseMessage.length)
              ]
            }`,
          });
          await interaction.member
            .timeout(time * 2 * 60000)
            .catch(async (error) => {
              await interaction.followUp({
                content: `I was unable to mute you! Are you an admin?`,
                ephemeral: true,
              });
            });
          await muted();
          await removePowerUp("Raise the Stakes");
        } else {
          const noMuteMessage = [
            `Without the \`Raise the Stakes\` powerup, this would have been a ${getTextTime(
              time
            )} mute!`,
          ];
          await interaction.reply({
            content: `You landed on ${randomNumber}. ${
              noMuteMessage[Math.floor(Math.random() * noMuteMessage.length)]
            }`,
          });
          await avoidedMute();
          await removePowerUp("Raise the Stakes");
        }
      }

      // check if the user ran the command within the last 10 seconds
      if (currentTime - lastTime < 10000) {
        await interaction.reply({
          content: `You must wait ${Math.round(
            (10000 - (currentTime - lastTime)) / 1000
          )} seconds before using this command again!`,
          ephemeral: true,
        });
        await client.close();
        return;
      }

      // if disabled time under 10 mintues
      if (currentTime - disabledTime < 600000) {
        await interaction.reply({
          content: "This command is disabled for 10 minutes!",
        });
        await client.close();
        return;
      }

      await updateTime();

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
          await muted();
          await removePowerUp("Fifty-Fifty");
          await client.close();
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
          await avoidedMute();
          await removePowerUp("Fifty-Fifty");
          await client.close();
          return;
        }
      }

      // get a random number between 1 and 100
      //const randomNumber = Math.floor(Math.random() * 100) + 1;
      const randomNumber = 15;

      logger.bilby(randomNumber);

      // 1-5: mute for 10 minutes
      if (randomNumber <= 5) {
        // checks if the user has a double trouble powerup
        if (powerUps.includes("Double Trouble")) {
          await doubleTrouble(10);
          await client.close();
          return;
        }

        // checks if the user has a raise the stakes powerup
        if (powerUps.includes("Raise the Stakes")) {
          await raiseTheStakes(10);
          await client.close();
          return;
        }

        // checks if the user has a shield powerup
        if (powerUps.includes("Shield")) {
          await shield(10);
          await client.close();
          return;
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
        await muted();
        await client.close();
        return;
      }

      // 6-10: mute for 30 minutes
      if (randomNumber <= 10) {
        // checks if the user has a double trouble powerup
        if (powerUps.includes("Double Trouble")) {
          await doubleTrouble(30);
          await client.close();
          return;
        }

        // checks if the user has a raise the stakes powerup
        if (powerUps.includes("Raise the Stakes")) {
          await raiseTheStakes(30);
          await client.close();
          return;
        }

        // checks if the user has a shield powerup
        if (powerUps.includes("Shield")) {
          await shield(30);
          await client.close();
          return;
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
        await muted();
        await client.close();
        return;
      }

      // 11-15: mute for 1 hour
      if (randomNumber <= 15) {
        // checks if the user has a double trouble powerup
        if (powerUps.includes("Double Trouble")) {
          await doubleTrouble(60);
          await client.close();
          return;
        }

        // checks if the user has a raise the stakes powerup
        if (powerUps.includes("Raise the Stakes")) {
          await raiseTheStakes(60);
          await client.close();
          return;
        }

        // checks if the user has a shield powerup
        if (powerUps.includes("Shield")) {
          await shield(60);
          await client.close();
          return;
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
        await muted();
        await client.close();
        return;
      }

      // 16-20: mute for 3 hours
      if (randomNumber <= 20) {
        // checks if the user has a double trouble powerup
        if (powerUps.includes("Double Trouble")) {
          await doubleTrouble(180);
          await client.close();
          return;
        }

        // checks if the user has a raise the stakes powerup
        if (powerUps.includes("Raise the Stakes")) {
          await raiseTheStakes(180);
          await client.close();
          return;
        }

        // checks if the user has a shield powerup
        if (powerUps.includes("Shield")) {
          await shield(180);
          await client.close();
          return;
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
        await muted();
        await client.close();
        return;
      }

      // 21: get another random number from 1-10, if it's 1-9, mute for 1 day, if it's 10, mute for 1 week
      if (randomNumber === 21) {
        const randomNumber2 = Math.floor(Math.random() * 10) + 1;
        if (randomNumber2 <= 9) {
          // checks if the user has a double trouble powerup
          if (powerUps.includes("Double Trouble")) {
            await doubleTrouble(1440);
            await client.close();
            return;
          }

          // checks if the user has a raise the stakes powerup
          if (powerUps.includes("Raise the Stakes")) {
            await raiseTheStakes(1440);
            await client.close();
            return;
          }

          // checks if the user has a shield powerup
          if (powerUps.includes("Shield")) {
            await shield(1440);
            await client.close();
            return;
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
          await muted();
          await client.close();
          return;
        } else {
          // checks if the user has a double trouble powerup
          if (powerUps.includes("Double Trouble")) {
            await doubleTrouble(604800);
            await client.close();
            return;
          }

          // checks if the user has a raise the stakes powerup
          if (powerUps.includes("Raise the Stakes")) {
            await raiseTheStakes(604800);
            await client.close();
            return;
          }

          // checks if the user has a shield powerup
          if (powerUps.includes("Shield")) {
            await shield(604800);
            await client.close();
            return;
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
          await muted();
          await client.close();
          return;
        }
      }

      // if they have a raise the stakes powerup, remove it
      if (powerUps.includes("Raise the Stakes")) {
        await removePowerUp("Raise the Stakes");
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
        await avoidedMute();
        await addPowerUp("Shield");
        await client.close();
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
        await avoidedMute();
        await addPowerUp("Double Trouble");
        await client.close();
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
        await avoidedMute();
        await addPowerUp("Raise the Stakes");
        await client.close();
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
        await avoidedMute();
        await addPowerUp("Fifty-Fifty");
        await client.close();
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
        await client.close();
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
        await avoidedMute();
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
          await client.close();
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
          await client.close();
          return;
        }

        const giftedUser = await users.findOne({ user: user });
        if (giftedUser == null) {
          await interaction.channel.send(
            "That user has not run the mute roulette yet! Gift wasted."
          );
          await client.close();
          return;
        }
        if (giftedUser.user === interaction.member.id) {
          await interaction.channel.send(
            "You cannot gift yourself! Gift wasted."
          );
          await client.close();
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
          await client.close();
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
          await client.close();
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
        await client.close();
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
        "Bilby is best mod!",
      ];
      await interaction.reply({
        content: `You landed on ${randomNumber}. ${
          normalMessage[Math.floor(Math.random() * normalMessage.length)]
        }`,
      });
      await avoidedMute();
    } else if (interaction.options.getSubcommand() === "stats") {
      var specifiedUser =
        interaction.options.getMentionable("person") || interaction.member;
      const user = await users.findOne({ user: specifiedUser.id });

      if (user == null) {
        await interaction.reply({
          content: "You have not run the mute roulette yet!",
          ephemeral: true,
        });
        await client.close();
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
        .addFields({
          name: "Powerups",
          value: powerUps.join("\n") || "None",
        })
        .setColor("#FF0000");

      await interaction.reply({ embeds: [embed] });
    } else if (interaction.options.getSubcommand() === "leaders") {
      // find the top user for each category
      const topMutes = await users
        .find({ numAllTotal: { $gte: 5 } })
        .sort({ numMutesTotal: -1 })
        .limit(5)
        .toArray();
      const topAll = await users
        .find({ numAllTotal: { $gte: 5 } })
        .sort({ numAllTotal: -1 })
        .limit(5)
        .toArray();
      const topStreak = await users
        .find({ numAllTotal: { $gte: 5 } })
        .sort({ numMaxStreak: -1 })
        .limit(5)
        .toArray();
      const lowestPercentage = await users
        .find({ mutePercentage: { $gt: 0 }, numAllTotal: { $gte: 50 } })
        .sort({ mutePercentage: 1 })
        .limit(5)
        .toArray();
      const highestPercentage = await users
        .find({ mutePercentage: { $lt: 100 }, numAllTotal: { $gte: 50 } })
        .sort({ mutePercentage: -1 })
        .limit(5)
        .toArray();

      // get the top user's data
      var description = "";

      for (var i = 0; i < topMutes.length; i++) {
        try {
          const topMutesData = topMutes[i].numMutesTotal;
          const topMutesUser = await interaction.guild.members.fetch(
            topMutes[i].user
          );
          description += `Highest Number of Mutes: **${
            topMutesUser.nickname ||
            topMutesUser.user.displayName ||
            topMutesUser.user.username
          }** - **${topMutesData} mutes**\n`;
        } catch (error) {
          continue;
        }
        break;
      }
      for (var i = 0; i < topAll.length; i++) {
        try {
          const topAllData = topAll[i].numAllTotal;
          const topAllUser = await interaction.guild.members.fetch(topAll[i].user);
          description += `Highest Number of Rolls: **${
            topAllUser.nickname ||
            topAllUser.user.displayName ||
            topAllUser.user.username
          }** - **${topAllData} rolls**\n`;
        } catch (error) {
          continue;
        }
        break;
      }
      for (var i = 0; i < topStreak.length; i++) {
        try {
          const topStreakData = topStreak[i].numMaxStreak;
          const topStreakUser = await interaction.guild.members.fetch(
            topStreak[i].user
          );
          description += `Highest Unmuted Streak: **${
            topStreakUser.nickname ||
            topStreakUser.user.displayName ||
            topStreakUser.user.username
          }** - **${topStreakData} rolls**\n`;
        } catch (error) {
          continue;
        }
        break;
      }
      for (var i = 0; i < lowestPercentage.length; i++) {
        try {
          const lowestPercentageData = lowestPercentage[i].mutePercentage;
          const lowestPercentageUser = await interaction.guild.members.fetch(
            lowestPercentage[i].user
          );
          description += `Lowest Mute Percentage: **${
            lowestPercentageUser.nickname ||
            lowestPercentageUser.user.displayName ||
            lowestPercentageUser.user.username
          }** - **${lowestPercentageData}%**\n`;
        } catch (error) {
          continue;
        }
        break;
      }
      for (var i = 0; i < highestPercentage.length; i++) {
        try {
          const highestPercentageData = highestPercentage[i].mutePercentage;
          const highestPercentageUser = await interaction.guild.members.fetch(
            highestPercentage[i].user
          );
          description += `Highest Mute Percentage: **${
            highestPercentageUser.nickname ||
            highestPercentageUser.user.displayName ||
            highestPercentageUser.user.username
          }** - **${highestPercentageData}%**\n`;
        } catch (error) {
          continue;
        }
        break;
      }

      // create the embed
      const embed = new EmbedBuilder()
        .setTitle("Mute Roulette Leaderboard")
        .setDescription(description)
        .setColor("#FF0000");

      // send the embed
      await interaction.reply({ embeds: [embed] });
    }

    await client.close();
    return;
  },
};
