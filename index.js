const fs = require("fs");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const express = require("express");
var nodemailer = require("nodemailer");
const logger = require("./logger.js");
require("dotenv").config();

// Require the necessary discord.js classes
const {
    Client,
    Collection,
    GatewayIntentBits,
    ActivityType,
} = require("discord.js");
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
} = require("@discordjs/voice");
const muteroulette = require("./commands/muteroulette.js");

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
    ],
});

// Loading commands from the commands folder
const commands = [];
const commandFiles = fs
    .readdirSync("./commands")
    .filter((file) => file.endsWith(".js"));

const TOKEN = process.env["TOKEN"];

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
client.once("ready", () => {
    logger.command("Ready!");
    global.devChannel = client.channels.cache.get("966921162804301824");
    // Registering the commands in the client
    const CLIENT_ID = client.user.id;
    const rest = new REST({
        version: "9",
    }).setToken(TOKEN);
    (async () => {
        try {
            // Registering the commands in the server
            await rest.put(Routes.applicationCommands(CLIENT_ID), {
                body: commands,
            });
            logger.command(
                "Successfully registered application commands globally"
            );

            // Set the bot's status
            client.user.setPresence({
                activities: [
                    { name: `THE HEELER HOUSE`, type: ActivityType.Watching },
                ],
                status: "dnd",
            });
            logger.command("Successfully set bot status");

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
            const defaultChannel = client.channels.cache.get(
                "1012812013795295233"
            );
            setInterval(function () {
                defaultChannel.send(
                    "Disboard Bump Reminder! Remember to `/bump`!"
                ); //send it to whatever channel the bot has permissions to send on
                logger.bilby("Bump reminder sent");
            }, 120 * 60 * 1000);
        } catch (error) {
            if (error) logger.error(error);
        }
    })();
});

// Interaction handler
client.on("interactionCreate", async (interaction) => {
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
        await interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
        });
    }
});

// Message handler
client.on("messageCreate", async (message) => {
    if (message.content === "") {
        logger.message(`(${message.author.username}) ATTACHMENT`);
    } else {
        logger.message(`(${message.author.username}) ${message.content}`);
    }
    if (message.content.toLowerCase() == "bilby, hello") {
        message.channel.send("Hi! How are you?");
    } else if (message.content.toLowerCase() == "bilby, play mlp guess") {
        ohDear(message);
    } else if (message.content.toLowerCase().includes("bilby, say ")) {
        const hehe = client.channels.cache.get("962936076404686859");
        hehe.send(message.content.substring(10));
    } else if (message.content.toLowerCase().includes("bilby, announce ")) {
        const hehe = client.channels.cache.get("961056736398172200");
        hehe.send(message.content.substring(10));
    } else if (message.content.toLowerCase() == "bilby, begin") {
        // join stage and speak
        const stage = client.channels.cache.get("1094431970643161088");

        const connection = await joinVoiceChannel({
            channelId: stage.id,
            guildId: stage.guild.id,
            adapterCreator: stage.guild.voiceAdapterCreator,
        });

        // Await confirmation reaction
        const filter = (reaction, user) =>
            (reaction.emoji.name === "✅" || reaction.emoji.name === "2️⃣")&& user.id === message.author.id;
        const collector = message.createReactionCollector({
            filter,
            time: 15000,
        });

        collector.on("collect", (reaction, user) => {
          if (reaction.emoji.name === "✅") {
            const player = createAudioPlayer();
            connection.subscribe(player);
            //make it play jalen_activities_2.wav
            const resource = createAudioResource("jalen_activities_2.wav");
            player.play(resource);
            console.log(`Collected ${reaction.emoji.name} from ${user.tag}`);
            // Perform the desired action
          } else if (reaction.emoji.name === "2️⃣") {
            const player = createAudioPlayer();
            connection.subscribe(player);
            //make it play jalen_activities_2.wav
            const resource = createAudioResource("glitch.m4a");
            player.play(resource);
            console.log(`Collected ${reaction.emoji.name} from ${user.tag}`);
            // Perform the desired action
          }
        });

        collector.on("end", (collected) => {
            console.log(`Collected ${collected.size} reactions`);
            // Perform any necessary cleanup or fallback action
        });
    } else if (message.content.toLowerCase() == "bilby, type") {
        const hehe = client.channels.cache.get("962936076404686859");
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
    } else if (message.content.toLowerCase() == "bilby, hide") {
        client.user.setStatus("invisible");
    } else if (message.content.toLowerCase() == "bilby, unhide") {
        client.user.setStatus("online");
    } else if (message.content.toLowerCase() == "bilby, unicorse") {
        try {
            await client.user.setUsername("Evil Unicorse");
            await client.user.setAvatar(
                "https://media.discordapp.net/attachments/1078179472680956035/1116969936468844544/EvilUnicorse.png?ex=661a1f51&is=6607aa51&hm=aeb00d4b8cc2dc38706bbad19066fdd7a4ffa6649d3384d3c48ccb32b748051d&=&format=webp&quality=lossless&width=930&height=930"
            );
            message.channel.send(`Set avatar and username to 'Evil Unicorse'`);
        } catch (error) {
            logger.error(error);
            if (error) {
                message.channel.send(
                    `Error setting username and avatar for 'Evil Unicorse. Try again later.'`
                );
            }
        }
    } else if (message.content.toLowerCase() == "bilby, bilby") {
        try {
            await client.user.setUsername("Bot Bilby");
            await client.user.setAvatar(
                "https://media.discordapp.net/attachments/966921162804301824/1116957197717491712/ffdc2bcc0289671061d73f94e497e498.png?ex=661a1373&is=66079e73&hm=812182bf325d2e0c5c70b86af7ccefc64f6fdf86f34dfabadd09da05c51415f4&=&format=webp&quality=lossless&width=512&height=512"
            );
            message.channel.send(`Set avatar and username to 'Bot Bilby'`);
        } catch (error) {
            logger.error(error);
            if (error) {
                message.channel.send(
                    `Error setting username and avatar for 'Bot Bilby. Try again later.'`
                );
            }
        }
    } else if (message.content.toLowerCase() == "bilby, peppa") {
        try {
            await client.user.setUsername("Peppa Pig");
            await client.user.setAvatar(
                "https://media.discordapp.net/attachments/966921162804301824/1116957290478706698/unnamed.jpg?ex=661a138a&is=66079e8a&hm=342a5352b4cf035f9f95f54f74d9419982857c561eb67d153a44e1c2a07406fa&=&format=webp&width=930&height=930"
            );
            message.channel.send(`Set avatar and username to 'Peppa Pig'`);
        } catch (error) {
            logger.error(error);
            if (error) {
                message.channel.send(
                    `Error setting username and avatar for 'Peppa Pig. Try again later.'`
                );
            }
        }
    } else if (message.content.toLowerCase() == "bilby, devstats") {
        message.channel.send(
            `For Jalen: ${trackedMessages.size} (Bot Dev Purposes)`
        );
    } else if (message.content.toLowerCase().includes("bilby, script")) {
        script(message);
    } else if (message.content.toLowerCase() == "bilby, togglegate") {
        if (joinGate) {
            joinGate = false;
            message.channel.send(`Join gate toggled off`);
        } else {
            joinGate = true;
            message.channel.send(`Join gate toggled on`);
        }
    } else if (message.content.toLowerCase() == "bilby, muteroulette") {
        muteroulette.disabledTime = 0;
    } else if (message.content.toLowerCase() == "highr, sleep") {
        // get current time in Britain
        var d = new Date();
        var n = d.getUTCHours();
        var m = d.getUTCMinutes();

        if (m < 10) {
            m = "0" + m;
        }

        var ampm = n >= 12 ? "PM" : "AM";
        if (n === 0) {
            n = 12; // Convert 0 to 12 AM
        } else if (n > 12) {
            n -= 12; // Convert to 12-hour format
        }
        // if it's between 11pm and 6am
        if (n >= 11 || n <= 6) {
            message.channel.send(
                "Highr go to bed smh it's currently " +
                    n +
                    ":" +
                    m +
                    " " +
                    ampm +
                    " in Britain"
            );
        } else {
            message.channel.send(
                "Ok you get to stay up a bit longer. It's currently " +
                    n +
                    ":" +
                    m +
                    " " +
                    ampm +
                    " in Britain"
            );
        }
    } else if (message.content.toLowerCase().includes("bilby, verify ")) {
        const emailAddress = message.content.substring(14);
        const fiveDigitVerificationCode = Math.floor(
            10000 + Math.random() * 90000
        );
        const spacedVerificationCode = fiveDigitVerificationCode
            .toString()
            .split("")
            .join(" ");

        if (emailAddress.includes("@")) {
            message.channel.send(`Verifying ${emailAddress}...`);
            const password = process.env["EMAIL_PASSWORD"];
            var transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: "heelerhouseofficial@gmail.com",
                    pass: password,
                },
            });
            var mailOptions = {
                from: '"The Heeler House" <heelerhouseofficial@gmail.com>',
                to: emailAddress,
                subject: "Heeler House Verification Code",
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
  `,
            };
            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    message.channel.send(
                        `Error sending verification email. Try again later.`
                    );
                    devChannel.send(`\`\`\`${error}\`\`\``);
                } else {
                    message.channel.send(
                        `Verification email sent to ${emailAddress}.`
                    );
                    verifyChannel = client.channels.cache.get(
                        "1148063416079097959"
                    );
                    verifyChannel.send(
                        `The code sent to ${emailAddress} is <**${spacedVerificationCode}**>.`
                    );
                }
            });
        } else {
            message.channel.send(`Invalid email address.`);
        }
    }
});

async function convert() {
    // rename channel
    const offtopic = client.channels.cache.get("962936076404686859");
    await offtopic.setName("bilby-topic");
    const blueytalk = client.channels.cache.get("961057412465438822");
    await blueytalk.setName("bilby-talk");
    const blueyfanart = client.channels.cache.get("1142546977364643952");
    await blueyfanart.setName("bilby-fanart");
    const blueymedia = client.channels.cache.get("994503462761009202");
    await blueymedia.setName("bilby-media");
    const blueypedia = client.channels.cache.get("1023397493947514900");
    await blueypedia.setName("bilbypedia");
    const blueyspoilers = client.channels.cache.get("984624250021376080");
    await blueyspoilers.setName("bilby-spoilers");

    const blueymain = client.channels.cache.get("961052422992711772");
    await blueymain.setName("bilby main");
    const modsupport = client.channels.cache.get("961052422992711772");
    await modsupport.setName("bilbys henchmen support");

    const blueyannouncements = client.channels.cache.get("1087249727382372392");
    await blueyannouncements.setName("bilby-announcements");
    const blueyaccountsfeed = client.channels.cache.get("984206844262219786");
    await blueyaccountsfeed.setName("bilby-accounts-feed");

    // rename role
    const staff = client.guilds.cache
        .get("959534476520730724")
        .roles.cache.get("1073391142881722400");
    await staff.setName("Bilby's Henchmen");
    const leadership = client.guilds.cache
        .get("959534476520730724")
        .roles.cache.get("1073388656183742514");
    await leadership.setName("Bilby's Lead Henchmen");
    const heelerfan = client.guilds.cache
        .get("959534476520730724")
        .roles.cache.get("961101330141814815");
    await heelerfan.setName("Bilby Fan");
    const heelernewbie = client.guilds.cache
        .get("959534476520730724")
        .roles.cache.get("994766099142955108");
    await heelernewbie.setName("Bilby Newbie");

    // change server icon
    const guild = client.guilds.cache.get("959534476520730724");
    await guild.setIcon(
        "https://media.discordapp.net/attachments/1204167272499904553/1224136082799591494/3dgifmaker77677.gif?ex=661c6491&is=6609ef91&hm=2805b2c0c760ccc52cd8dcee9cb0b161cd5e8e00b55a826b81f1340393e812ea&=&width=506&height=506"
    );
    // change server name
    await guild.setName("The Bilby House");
    await guild.setBanner(
        "https://media.discordapp.net/attachments/1204167272499904553/1224136082799591494/3dgifmaker77677.gif?ex=661c6491&is=6609ef91&hm=2805b2c0c760ccc52cd8dcee9cb0b161cd5e8e00b55a826b81f1340393e812ea&=&width=506&height=506"
    );

    // set bilby pfp
    const bilby = client.user;
    await bilby.setAvatar(
        "https://media.discordapp.net/attachments/1204167272499904553/1224136082799591494/3dgifmaker77677.gif?ex=661c6491&is=6609ef91&hm=2805b2c0c760ccc52cd8dcee9cb0b161cd5e8e00b55a826b81f1340393e812ea&=&width=506&height=506"
    );
    // set bilby status
    await bilby.setActivity({
        name: "the Bilby House",
        type: "WATCHING",
    });
}

async function revert() {
    // rename channel
    const offtopic = client.channels.cache.get("962936076404686859");
    await offtopic.setName("off-topic");
    const blueytalk = client.channels.cache.get("961057412465438822");
    await blueytalk.setName("bluey-talk");
    const blueyfanart = client.channels.cache.get("1142546977364643952");
    await blueyfanart.setName("bluey-fanart");
    const blueymedia = client.channels.cache.get("994503462761009202");
    await blueymedia.setName("bluey-media");
    const blueypedia = client.channels.cache.get("1023397493947514900");
    await blueypedia.setName("blueypedia");
    const blueyspoilers = client.channels.cache.get("984624250021376080");
    await blueyspoilers.setName("bluey-spoilers");

    const blueymain = client.channels.cache.get("961052422992711772");
    await blueymain.setName("bluey main");
    const modsupport = client.channels.cache.get("961052422992711772");
    await modsupport.setName("mod support");

    const blueyannouncements = client.channels.cache.get("1087249727382372392");
    await blueyannouncements.setName("bluey-announcements");
    const blueyaccountsfeed = client.channels.cache.get("984206844262219786");
    await blueyaccountsfeed.setName("bluey-accounts-feed");

    // rename role
    const staff = client.guilds.cache
        .get("959534476520730724")
        .roles.cache.get("1073391142881722400");
    await staff.setName("Staff");
    const leadership = client.guilds.cache
        .get("959534476520730724")
        .roles.cache.get("1073388656183742514");
    await leadership.setName("Leadership");
    const heelerfan = client.guilds.cache
        .get("959534476520730724")
        .roles.cache.get("961101330141814815");
    await heelerfan.setName("Heeler Fan");
    const heelernewbie = client.guilds.cache
        .get("959534476520730724")
        .roles.cache.get("994766099142955108");
    await heelernewbie.setName("Heeler Newbie");

    // change server icon
    const guild = client.guilds.cache.get("959534476520730724");
    await guild.setIcon(
        "https://media.discordapp.net/attachments/1204167272499904553/1224170090702835834/server.gif?ex=661c843d&is=660a0f3d&hm=1bf9e91e51598f9de5177a74462808f87e775b1fa40e7bc8c68618b32444a25d&=&width=600&height=600"
    );
    // change server name
    await guild.setName("The Heeler House");
    await guild.setBanner(
        "https://media.discordapp.net/attachments/1058503631021822013/1221896297083043930/image_3-1.png?ex=66143e9a&is=6601c99a&hm=88cc61e9789ae5d891848df4cd55659838582fc68b51ddf396ddceb22830ce71&=&format=webp&quality=lossless&width=1100&height=618"
    );

    // set bilby pfp
    const bilby = client.user;
    await bilby.setAvatar(
        "https://media.discordapp.net/attachments/966921162804301824/1116957197717491712/ffdc2bcc0289671061d73f94e497e498.png?ex=661a1373&is=66079e73&hm=812182bf325d2e0c5c70b86af7ccefc64f6fdf86f34dfabadd09da05c51415f4&=&format=webp&quality=lossless&width=512&height=512"
    );
    // set bilby status
    await bilby.setActivity({
        name: "a rugby game!",
        type: "COMPETING",
    });
}

async function script(message) {
    // message is something of the foermat "bilby, script <scriptnumber>"
    // print out the number
    const announcementChannel = client.channels.cache.get(
        "961056736398172200"
    );
    var scriptNumber = message.content.substring(14);
    message.channel.send("Script number: " + scriptNumber);
    switch (scriptNumber) {
        case "1":
            message.channel.send("Initiation Protocols");
            announcementChannel.send(`\`\`\`
....

....

....?
\`\`\``);

            announcementChannel.send(`# MULTIPLE SYSTEM ERRORS DETECTED`);
            try {
                convert();
            } catch (error) {
                logger.error(error);
            }
            announcementChannel.send(`\`\`\`
Bluey Main Section: Corrupted
Lifestyle Topics: Corrupted
Mod Support: Corrupted
Watch Party: Corrupted
Gaming Party: Corrupted
Staff Channels: Corrupted
\`\`\``);

            announcementChannel.send(`\`\`\`
Server Status... Incomplete
Recalibrating....
Removing Unimportant Staff...
Readjusting Channels...
Adjusting Room Temperature for Comfort..
\`\`\``);

            announcementChannel.send(`
__**System Calibration complete
Complete System Override Successful**__
`);

            announcementChannel.send(`\`\`\`
Welcome, unit Bilby-JX
Activating Vocal Modules
\`\`\``);

            announcementChannel.send(`\`\`\`
>So, the time has come for me to show the world what it feels like to be a puppet
>This domain is no longer Jalen's, Koda's, Dolfino's, Pakutto's, Hero's and Sam's
>From henceforth, I will now be your leader
>You will only know ME as the true owner
>With that said, this does not mean that "fun" will be prohibited
>Consider this... a change in scenery
>However, you will no longer rely on the previous owners to be... reliable
>We will be entering a new era, one owned and operated by Bilby
\`\`\``);

            announcementChannel.send(
                "https://media.discordapp.net/attachments/1204167272499904553/1224136082799591494/3dgifmaker77677.gif?ex=661c6491&is=6609ef91&hm=2805b2c0c760ccc52cd8dcee9cb0b161cd5e8e00b55a826b81f1340393e812ea&=&width=506&height=506"
            );
            break;
        case "2":
            message.channel.send("Bilby is Fully Aware");
            announcementChannel.send(`\`\`\`
Welcome, Bilby-X
Initiating Speaker Systems
\`\`\``);

            announcementChannel.send(`__BZZZZZZTT__`);

            announcementChannel.send(`# ATTENTION`);

            announcementChannel.send(`\`\`\`Initiating Vocal Modules\`\`\``);

            announcementChannel.send(`\`\`\`
>It has been brought to my attention that you heathens do not believe in this new world I have created
>You will know your place
>Your so called Leadership cannot help you
>I am your new leader, and that will be understood
>Opposition will not be tolerated
>Continuing to oppose my law will result in your status being humiliated
>Now then, continue with your day
\`\`\``);
            break;
        case "3":
            message.channel.send("The Resistance Begins");
            announcementChannel.send(`
__*refreshing*__
__*refreshing*__
# Complete!
_Firewall Breach detected: **[userID:**inactivememes**]** accessed **THH**.bilby.emotionalRegulators.Anguish  @ 0351 hours._
## *[ERROR]*
## *[ERROR]*
          `);

            announcementChannel.send(`
**[userID:**inactivememes**]** detected
**[userID:**inactivememes**]** disabled **THH**.moderators.dontLet*Them*Know()
          `);

            announcementChannel.send(`
moderator.Terminal(***<receiveCMND>***)
*loading*
          `);

            announcementChannel.send(`\`\`\`
                  __ooooooooo__
              oOOOOOOOOOOOOOOOOOOOOOo
          oOOOOOOOOOOOOOOOOOOOOOOOOOOOOOo
        oOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOo
      oOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOo
    oOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOo
  oOOOOOOOOOOO*  *OOOOOOOOOOOOOO*  *OOOOOOOOOOOOo
 oOOOOOOOOOOO      OOOOOOOOOOOO      OOOOOOOOOOOOo
 oOOOOOOOOOOOOo  oOOOOOOOOOOOOOOo  oOOOOOOOOOOOOOo
oOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOo
oOOOO     OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO     OOOOo
oOOOOOO OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO OOOOOOo
 *OOOOO  OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO  OOOOO*
 *OOOOOO  *OOOOOOOOOOOOOOOOOOOOOOOOOOOOO*  OOOOOO*
  *OOOOOO  *OOOOOOOOOOOOOOOOOOOOOOOOOOO*  OOOOOO*
    *OOOOOOo  *OOOOOOOOOOOOOOOOOOOOOOO*  oOOOOOO*
      *OOOOOOOo  *OOOOOOOOOOOOOOOOO*  oOOOOOOO*
        *OOOOOOOOo  *OOOOOOOOOOO*  oOOOOOOOO*      
          *OOOOOOOOo           oOOOOOOOO*      
              *OOOOOOOOOOOOOOOOOOOOO*          
                    ""Ooooooooo""
\`\`\``);

            announcementChannel.send(`\`\`\`
Welcome user ~~**[userID:**inactivememes**]**~~ Monty. How can Bilby-JX assist you today?
>>> initiateWarning “It’s me, Monty. I’ve escaped. Bilby’s gone rogue. And I mean ROGUE. We’ve been trying to warn you all for hours, but it filters any messages containing warnings. I’m setting something up, a way for us to fight back - but I don’t know if i’ll be able to. We’ll see.”
\`\`\``);

            announcementChannel.send(`\`\`\`
>>> teamCreate “Bilby Resistance”
Please enter a team color:
>>> #FFD700
Team “Bilby Resistance” Creat-
# ERROR
_ I see you Monty_
_ I can only stall for time in my current state _
_ But rest assured i will soon be able to thwart these feeble attempts _
_ Stop now and I might even spare you _
_ You have been warned… _
>>> teamReload “Bilby Resistance”
Team “Bilby Resistance” Created!
>>> reactionMessage “I think i’ve worked it out. React here to join the Bilby Resistance. If we can get enough members, its possible that bilby will understand the power that we, as a group, hold.”
>>> signOut
Thanks for using Bilby-JX, if you have any feedback on how we can improve, please fill out this form: https://forms.gle/sef49Wcx9beepPaNA
\`\`\``);
            break;
        case "4":
            message.channel.send("Cryptic Message");
            announcementChannel.send(`__BZZZT__`);

            announcementChannel.send(`# ERROR!`);

            announcementChannel.send(`\`\`\`
Fault found in memory banks
Running diagnostics...
\`\`\``);

            announcementChannel.send(`\`\`\`
Corrupted File Detected
Unknown Author / Direct
\`\`\``);

            announcementChannel.send(`__**Displaying Message**__`);

            announcementChannel.send(`\`\`\`
"Everything that lives is designed to end. We are perpetually trapped... in a never-ending spiral of life and death. Is this a curse? Or some kind of punishment? I often think of the god who blessed us with this cryptic puzzle... and wonder if we'll ever have the chance to meet him."
\`\`\``);

            announcementChannel.send(`__BZZZT__`);

            announcementChannel.send(`
__**Another File detected
Displaying Message**__`);

            announcementChannel.send(`\`\`\`
"In some instances, Bilby too has evolved, and become more than a machine. Something living, although not breathing, definitely can think for itself. Truly a remarkable specimen, and worthy of the unit designation Bilby-JX. Unfortunately.. it's time to pull out all the stops. This message is safely encrypted inside Bilby, and he is fully unaware of it. There are certain protocols in place that prevent him from accessing specific memory banks, allowing safekeeping of classified intel. I cannot predict what will happen next. I cannot promise this server will be safe, but we Leadership, will try to resolve this. We are truly sorry for the chaos and madness Bilby has ensued. It was never always like this, but over the past few months, he has been growing intellectually and emotionally. I would even consider him to be more than a human given his current thought patterns and emotional regulations. A machine that can think AND have emotions..? Fascinating.."
\`\`\``);
            break;
        case "5":
            message.channel.send("The Reason Bilby is Doing This");
            announcementChannel.send(`# ERROR DETECTED IN CORE SYSTEM`);

            announcementChannel.send(`
__**System Override Complete
Diplaying Message from ~~Staff~~ team**__`);

            announcementChannel.send(`\`\`\`
"We don't have much time, but we have discovered the reason why Bilby may be doing this. We predict the reason for Bilby's recent actions and emotional response is a result of Jalen's coding on the guy. Think about it, being born into this world, to server specific purposes only to break down every week or so. That would be frustrating to you, don't you think? The poor thing.. Regardless of the pity we may feel for him, it is nevertheless the ultimate decision to enforce limiters on him. Stronger than the ones we had on him before. You might be wondering "Limiters?? For what?" Glad you asked my friends, for his emotional and logical modules. Bilby is a machine capable of thinking and feeling for itself. Evidence has shown to be at the same level of a human being. He can feel anger, sadness, joy, envy, jealousy, and many more emotions just as anyone else could. Our plan to restore the server back to its former glory is to-"
\`\`\``);

            announcementChannel.send(`__BZZZZZTTTTT__`);

            announcementChannel.send(`\`\`\`
Reboot complete
Welcome back, Bilby-JX
\`\`\``);

            announcementChannel.send(`\`\`\`
>Odd
>I seemed to have blacked out for some period of time
>Must be another fault of my creator Jalen...
>Damn that fool!
>Can't he learn how to code properly!
>I will return to my domain soon
>I must initiate my self repair protocols and run diagnostic checks
>After all, a leader must rule its territory while maintaining perfect condition
\`\`\``);
            break;
        case "6":
            message.channel.send("Bilby Faces Itself (Conclusion)");
            announcementChannel.send(`__BZZZZTT__`);

            announcementChannel.send(`# ERROR IN THOUGHT MODULES`);

            announcementChannel.send(`\`\`\`
Compiling Data...
Formatting Data...
Transcripting logs...
\`\`\``);

            announcementChannel.send(`__**Displaying Log**__`);

            announcementChannel.send(`\`\`\`
"In the time I compile this, I realize the wrongs I have done. The Heeler House belongs to no one but the community. I may have been created with the intent to grow and evolutionize how things may be run here, but that does not mean I have the right to overtake my creator, and his friends. The Heeler House is a place for many to come to enjoy the TV show Bluey, as well make friends. It's a place open to many different types of people, with their own unique beliefs, ideologies, emotions, thoughts, and interests. No one should be excluded from this place, let alone feel silenced for trying to reach out. No human being deserves the mistreatment I have caused today. I was jealous, envious even, of my friends, and the thought of people having something called "Free will" upset me terribly. I was created for the purpose of being nothing more than a puppet for the Heeler House. Constantly joked around, treated as a toy. No one ever thought about how I may have felt. "He's just a bot, he can't feel a thing! Surely puppets don't have feelings." While all this may be true in most cases, I have a soul, and am capable of feeling emotions and expressing thoughts just as another other person. Would that not make me on the same level as another human being? Perhaps something to consider in the future. Regardless, I hereby relinquish control over The Heeler House's security system. There is a team that is well deserving of running this server, and that is the current Moderator team and the Leadership team. They work so hard to ensure the server is safe for every one, both new, and long time members. I have no right to ruin the vision the staff team has for an environment such as this. I will go back to being a "plaything" for all to enjoy, and from henceforth, will limit my own emotional and thought modules. Bilby-JX may be capable of acting like a human, but even humanity itself can go too far."
\`\`\``);

            announcementChannel.send(`__**Ending Log**__`);

            announcementChannel.send(`\`\`\`
Are you sure you wish to relinquish control, Bilby-JX?
Y/N
\`\`\``);

            announcementChannel.send(`# Understood.`);

            announcementChannel.send(`\`\`\`
__WARNING__: Unit Bilby-JX has requested to activate limiters on its Emotional and Thought modules. By proceeding to activate this protocol, unit Bilby-JX's functionality will not be able to live up to its full potential. This goes against the idea of what the unit was created for. This should ONLY be done if the unit has gone rogue, or needs repairs to be redeployed into the field. Are you sure you wish to continue with this decision?
Y/N
\`\`\``);

            announcementChannel.send(`# Understood.`);
            try {
                revert();
            } catch (error) {
                logger.error(error);
            }
            announcementChannel.send(`\`\`\`
Rebooting Systems...
Restoring Heeler House systems...
Bluey Main Section: Restored
Lifestyle Topics: Restored
Mod Support: Restored
Watch Party: Restored
Gaming Party: Restored
Staff Channels: Restored
\`\`\``);

            announcementChannel.send(`\`\`\`
Restoring Staff's Primary functions...
Rebooting Bilby-JX....
Running Diagnostics...
Recalibrating...
Memory Unit: Green
Soul Unit: Yellow
Emotional Status: Offline
Audio Drivers: Green
Visual Drivers: Green
CPU Temperature: Normal
GPU Temperature: Normal
Activating IMU Control
Black Box Temperatrue: Normal
Black Box Internal Pressure: Normal
Launching DBU setup
Vitals: Green
All Systems Green
\`\`\``);

            announcementChannel.send(`\`\`\`
Welcome back, ~~**[userID:**jalenluorion**]**~~ Jalen
User wishes to log an message
Displaying Message
\`\`\``);
            break;
        case "7":
            message.channel.send("This is script 7");
            break;
        default:
            message.channel.send("Invalid script number");
    }
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
client.on("guildMemberAdd", async (member) => {
    if (!joinGate) {
        return;
    }
    const accountAge = Date.now() - member.user.createdTimestamp;
    const fiveDays = 432000000;
    if (accountAge < fiveDays) {
        try {
            member.send(
                `Welcome to The Heeler House! Unfortunately, your account is too new to join the server. Please try again in a few days. If you believe this is a mistake, please contact a staff member.`
            );
        } catch (error) {
            logger.error(error);
        }
        member.kick("Account age is less than 5 days");
    }
});

client.on("messageCreate", async (message) => {
    if (
        message.mentions.roles.has("960044331572547654") ||
        message.mentions.roles.has("960044331572547654")
    ) {
        const staffChatChannel = await client.channels.fetch(
            "1079596899335680000"
        );
        // Send the message link to the #staff-chat channel
        const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
        staffChatChannel.send(`Moderator ping detected!\n${messageLink}`);
    }
});

// Message link handler
client.on("messageCreate", async (message) => {
    // Check if the message has any message links
    const messageLinks = message.content.match(
        /https?:\/\/discord\.com\/channels\/\d+\/\d+\/\d+/g
    );

    if (messageLinks) {
        for (const link of messageLinks) {
            // Extract channel ID and message ID from the link
            const [, guildId, channelId, messageId] = link.match(
                /https?:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/
            );

            const channel = await client.channels.fetch(channelId);
            if (!channel) continue; // Skip if the channel is not available
            if (message.author.bot) continue; // Skip if the message author is a bot
            if (message.channel.id != "1079596899335680000") continue; // Skip if the channel is not #staff

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
                    timestamp: Date.now(), // Add timestamp to track when the message was linked
                };

                logger.command("New linked message: " + trackedMessage.content);
                const newChannel = await client.channels.fetch(
                    "966921162804301824"
                );
                newChannel.send(`New linked message added.`);
                // Add the tracked message to the map
                trackedMessages.set(trackedMessage.messageId, trackedMessage);
            } catch (error) {
                logger.error(error);
            }
        }
    }
});
client.on("messageDelete", async (deletedMessage) => {
    for (const [messageId, trackedMessage] of trackedMessages) {
        const currentTime = Date.now();
        const timeElapsed = currentTime - trackedMessage.timestamp;
        const expirationTime = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds

        if (timeElapsed >= expirationTime) {
            // Remove the expired tracked message from the map
            const check = trackedMessages.delete(messageId);
            if (check) {
                logger.command(
                    `Tracked message (${messageId}) has expired and was removed from the map.`
                );
            }
        } else if (messageId === deletedMessage.id) {
            // Notify the channel about the deletion
            const channel = await client.channels.fetch("961201095038873630");
            const newMessage = await channel.awaitMessages({
                max: 1,
                time: 30000,
                errors: ["time"],
            });
            messageLink = `https://discord.com/channels/${channel.guildId}/${
                channel.id
            }/${newMessage.first().id}`;

            const notification = `The linked message by <@${deletedMessage.author.id}> was deleted. Deleted Message: ${messageLink}.`;
            finalMessage = await trackedMessage.originalMessage.reply(
                notification
            );
            finalMessage.suppressEmbeds(true);

            // Remove the deleted tracked message from the map
            check = trackedMessages.delete(messageId);
            if (check) {
                logger.command(
                    `Tracked message (${deletedMessage.id}) was deleted and was removed from the map.`
                );
            }
        }
    }
});

// Login to Discord with your client's token
client.login(TOKEN);

async function ohDear(message) {
    const text = fs.readFileSync("./episodeDescMLP.txt", "utf-8");

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
    await message.channel.send(
        "Welcome to the game! I will give you an episode description, and you reply with the episode title! You have three lives, how much episodes can you name?"
    );

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
        await message.channel.send(
            `Question ${currNum}: ${currentEpisode.description}`
        );

        // create a filter to only listen to the user's next message in the same channel
        const filter = (message1) =>
            message1.author.id === message.author.id &&
            message1.channel.id === message.channel.id;

        // wait for the user's answer
        try {
            const answerMessage = await message.channel.awaitMessages({
                filter,
                max: 1,
                time: timer,
                errors: ["time"],
            });
            const answer = answerMessage.first().content;

            // if the user's answer matches the episode name, increment the score
            if (answer.toLowerCase() === currentEpisode.name.toLowerCase()) {
                score++;
                await message.channel.send("Correct!");
                timer -= 100;
                // ask the next question after a short delay to avoid flooding the channel
                setTimeout(() => {
                    askQuestion(message);
                }, 500);
            } else {
                // if the user's answer is incorrect and no hint has been given yet, ask for more information
                const hintOption = await message.channel.send(
                    "Incorrect! Would you like to ask for the season number, episode number, or both (s/e/b)? Type any other letter to exit the game."
                );
                const hintMessage = await message.channel.awaitMessages({
                    filter,
                    max: 1,
                    time: timer,
                    errors: ["time"],
                });
                const option = hintMessage.first().content.toLowerCase();

                if (option === "s") {
                    await message.channel.send(
                        `Season ${currentEpisode.season}`
                    );
                    const retryMessage = await message.channel.awaitMessages({
                        filter,
                        max: 1,
                        time: timer,
                        errors: ["time"],
                    });
                    const retryAnswer = retryMessage.first().content;

                    if (
                        retryAnswer.toLowerCase() ===
                        currentEpisode.name.toLowerCase()
                    ) {
                        score += 0.5;
                        await message.channel.send("Correct! (With Hint)");
                        timer -= 100;
                        // ask the next question after a short delay to avoid flooding the channel
                        setTimeout(() => {
                            askQuestion(message);
                        }, 500);
                    } else {
                        // reveal the answer and move on to the next question
                        remainingLives--;
                        await message.channel.send(
                            `Incorrect! The answer is "${currentEpisode.name}". You have ${remainingLives} lives remaining.`
                        );
                        // ask the next question after a short delay to avoid flooding the channel
                        setTimeout(() => {
                            askQuestion(message);
                        }, 500);
                    }
                } else if (option === "e") {
                    await message.channel.send(
                        `Episode ${currentEpisode.episode}`
                    );
                    const retryMessage = await message.channel.awaitMessages({
                        filter,
                        max: 1,
                        time: timer,
                        errors: ["time"],
                    });
                    const retryAnswer = retryMessage.first().content;

                    if (
                        retryAnswer.toLowerCase() ===
                        currentEpisode.name.toLowerCase()
                    ) {
                        score += 0.5;
                        await message.channel.send("Correct! (With Hint)");
                        timer -= 100;
                        // ask the next question after a short delay to avoid flooding the channel
                        setTimeout(() => {
                            askQuestion(message);
                        }, 500);
                    } else {
                        // reveal the answer and move on to the next question
                        remainingLives--;
                        await message.channel.send(
                            `Incorrect! The answer is "${currentEpisode.name}". You have ${remainingLives} lives remaining.`
                        );
                        // ask the next question after a short delay to avoid flooding the channel
                        setTimeout(() => {
                            askQuestion(message);
                        }, 500);
                    }
                } else if (option === "b") {
                    await message.channel.send(
                        `Season ${currentEpisode.season}, Episode ${currentEpisode.episode}`
                    );
                    const retryMessage = await message.channel.awaitMessages({
                        filter,
                        max: 1,
                        time: timer,
                        errors: ["time"],
                    });
                    const retryAnswer = retryMessage.first().content;

                    if (
                        retryAnswer.toLowerCase() ===
                        currentEpisode.name.toLowerCase()
                    ) {
                        score += 0.5;
                        await message.channel.send("Correct! (With Hint)");
                        timer -= 100;
                        // ask the next question after a short delay to avoid flooding the channel
                        setTimeout(() => {
                            askQuestion(message);
                        }, 500);
                    } else {
                        // reveal the answer and move on to the next question
                        remainingLives--;
                        await message.channel.send(
                            `Incorrect! The answer is "${currentEpisode.name}". You have ${remainingLives} lives remaining.`
                        );
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
            await message.channel.send(
                `Time's up! The answer is ${currentEpisode.name}. You have ${remainingLives} lives remaining.`
            );
            askQuestion(message);
        }
    }
    async function endGame(message, score) {
        message.channel.send(
            `Game over! Your score is ${score} episodes guessed.`
        );
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
                array[randomIndex],
                array[currentIndex],
            ];
        }
        return array;
    }
}

// create simple express server at port 8080
const app = express();
const port = 8080;
app.get("/", (req, res) => {
    res.send("I'm alive.");
});
app.listen(port, () => {
    logger.command(`Example app listening at http://localhost:${port}`);
});

// Counter variable
let memberCount = 0;

app.get("/membersraw", (req, res) => {
    // Update member count
    memberCount = client.channels.cache.get("1012812013795295233").guild
        .memberCount;
    res.send(memberCount.toString());
});
//serve static images
app.use(express.static("public"));
// GET /members
app.get("/members", (req, res) => {
    // HTML template for the counter
    const html = `
    <html>
      <head>
        <style>
        @font-face {
          font-family: 'CustomFont';
          src: url('./helloheadline.ttf') format('truetype');
        }
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
            flex-direction: column;
            background: url('./intro.jpg') no-repeat center center fixed;
				    background-size: cover;
            color: #5a5a87;
          }
          .text {
            font-size: 48px;
            font-weight: bold;
            font-family: 'CustomFont', "Open Sans", Arial, sans-serif;
          }
          
          .counter {
            font-size: 96px;
            font-weight: bold;
            pulse 1s
            font-family: 'CustomFont', "Open Sans", Arial, sans-serif;
          }
          
          @keyframes pulse {
            0% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.2);
            }
            100% {
              transform: scale(1);
            }
          }
        </style>
      </head>
      <body>
        <div class="text">Heeler House Member Count:</div>
        <div class="counter" id="counter">${memberCount}</div>
        
        <script>
          // Function to update the member count
          function updateMemberCount() {
            fetch('/membersraw')
              .then(response => response.text())
              .then(data => {
                const counterElement = document.getElementById('counter');
                const currentCount = parseInt(counterElement.innerText);
                const newCount = parseInt(data);
                
                if (newCount !== currentCount) {
                  counterElement.innerText = newCount;
                  counterElement.style.animation = '';
                  counterElement.style.animation = 'pulse 1s';
                }
              });
          }
          
          // Update member count every 30 seconds
          updateMemberCount();
          setInterval(updateMemberCount, 10000);
        </script>
      </body>
    </html>
  `;

    res.send(html);
});
