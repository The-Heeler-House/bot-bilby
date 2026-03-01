import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, UserSelectMenuBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, User, ButtonBuilder, ButtonStyle } from "discord.js";
import { Services } from "../../Services";
import SlashCommand from "../SlashCommand";
import * as logger from "../../logger";
import { WithId } from "mongodb";
import MuterouletteUser from "../../Services/Database/models/muteroulette";

export default class MuterouletteCommand extends SlashCommand {
    public disabledTime = new Date(0);

    public data = new SlashCommandBuilder()
        .setName("muteroulette")
        .setDescription("Try your luck at the muteroulette!")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("play")
                .setDescription("Roll the dice and chance fate!")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("stats")
                .setDescription("View your muteroulette stats!")
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
                .setDescription("View the muteroulette leaderboard!")
        ) as SlashCommandBuilder;
    
    async execute(
        interaction: ChatInputCommandInteraction,
        services: Services
    ) {
        const muteRouletteWarning = ``;

        const users = services.database.collections.muteroulette;

        if (interaction.options.getSubcommand() === "play") {
            var user = await users.findOne({ user: interaction.user.id });
            // each entry has format { id: string, numMutesTotal: number, numAllTotal: number, numStreak: number, numMaxStreak: number, lastTime: string }
            if (user == null) {
                await users.insertOne({
                    user: interaction.user.id,
                    numMutesTotal: 0,
                    numAllTotal: 0,
                    numStreak: 0,
                    numMaxStreak: 0,
                    lastTime: new Date(),
                    powerUps: [],
                    mutePercentage: 0,
                });
                user = await users.findOne({ user: interaction.user.id });
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

            const getTextTime = (time: number) => {
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
                    { user: interaction.user.id },
                    { $set: { lastTime: currentTime } }
                );
            }
            // remove powerup function
            async function removePowerUp(powerUp: string) {
                const updatedPowerUps = powerUps.filter((p: any) => p !== powerUp);
                await users.updateOne(
                    { user: interaction.user.id },
                    { $set: { powerUps: updatedPowerUps } }
                );
            }
            // add powerup
            async function addPowerUp(powerUp: string) {
                const updatedPowerUps = [...powerUps];
                if (!updatedPowerUps.includes(powerUp)) {
                    updatedPowerUps.push(powerUp);
                }
                await users.updateOne(
                    { user: interaction.user.id },
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
                    { user: interaction.user.id },
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
            async function muted(time: number) {
                if (interaction.inCachedGuild() && interaction.member) {
                    await interaction.member
                        .timeout(
                            time * 60000,
                            "Played with fate and lost."
                        )
                        .catch(async (error: any) => {
                            await interaction.followUp({
                                content: `I was unable to mute you! Are you an admin?`,
                                ephemeral: true,
                            });
                        });
                } else {
                    logger.error("Interaction is not in a guild or member is null");
                    await interaction.reply({
                        content: `I was unable to mute you! Are you in this server?`,
                        ephemeral: true,
                    });
                }
                await users.updateOne(
                    { user: interaction.user.id },
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
            // shield
            async function shield(time: number) {
                const shieldMessage = [
                    `You landed on a ${getTextTime(
                        time
                    )} mute, but you had a \`Shield\` powerup, so you were protected!`,
                ];
                await interaction.reply({
                    content: `You landed on ${randomNumber}. ${
                        shieldMessage[
                            Math.floor(Math.random() * shieldMessage.length)
                        ]
                    }${muteRouletteWarning}`,
                });
                await avoidedMute();
                await removePowerUp("Shield");
            }
            // double trouble
            async function doubleTrouble(time: number) {
                if (powerUps.includes("Shield")) {
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
                        doubleMessage[
                            Math.floor(Math.random() * doubleMessage.length)
                        ]
                    }${muteRouletteWarning}`,
                });
                await muted(time * 2);
                await removePowerUp("Double Trouble");
            }
            // raise the stakes
            async function raiseTheStakes(time: number) {
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
                                Math.floor(
                                    Math.random() * muteRaiseMessage.length
                                )
                            ]
                        }${muteRouletteWarning}`,
                    });
                    await muted(time * 2);
                    await removePowerUp("Raise the Stakes");
                } else {
                    const noMuteMessage = [
                        `Without the \`Raise the Stakes\` powerup, this would have been a ${getTextTime(
                            time
                        )} mute!`,
                    ];
                    await interaction.reply({
                        content: `You landed on ${randomNumber}. ${
                            noMuteMessage[
                                Math.floor(Math.random() * noMuteMessage.length)
                            ]
                        }${muteRouletteWarning}`,
                    });
                    await avoidedMute();
                    await removePowerUp("Raise the Stakes");
                }
            }

            // check if the user ran the command within the last 10 seconds
            if (Number(currentTime) - Number(lastTime) < 10000) {
                await interaction.reply({
                    content: `You must wait ${Math.round(
                        (10000 - (Number(currentTime) - Number(lastTime))) / 1000
                    )} seconds before using this command again!${muteRouletteWarning}`,
                    ephemeral: true,
                });
                return;
            }

            // if disabled time under 10 minutes
            if (Number(currentTime) - Number(this.disabledTime) < 600000) {
                await interaction.reply({
                    content: `This command is disabled for 10 minutes!${muteRouletteWarning}`,
                });
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
                                Math.floor(
                                    Math.random() * fiftyFiftyMessage.length
                                )
                            ]
                        }${muteRouletteWarning}`,
                    });
                    await muted(60);
                    await removePowerUp("Fifty-Fifty");
                    return;
                } else {
                    const fiftyFiftyMessage = [
                        "Because of your `Fifty-Fifty` powerup, you landed on tails! You got off easy.",
                    ];
                    await interaction.reply({
                        content: `${
                            fiftyFiftyMessage[
                                Math.floor(
                                    Math.random() * fiftyFiftyMessage.length
                                )
                            ]
                        }${muteRouletteWarning}`,
                    });
                    await avoidedMute();
                    await removePowerUp("Fifty-Fifty");
                    return;
                }
            }

            // get a random number between 1 and 100
            const randomNumber = Math.floor(Math.random() * 100) + 1;
            // const randomNumber = 47

            logger.bilby(randomNumber.toString());

            // 1-5: mute for 10 minutes
            if (randomNumber <= 5) {
                // checks if the user has a double trouble powerup
                if (powerUps.includes("Double Trouble")) {
                    await doubleTrouble(10);
                    return;
                }

                // checks if the user has a raise the stakes powerup
                if (powerUps.includes("Raise the Stakes")) {
                    await raiseTheStakes(10);
                    return;
                }

                // checks if the user has a shield powerup
                if (powerUps.includes("Shield")) {
                    await shield(10);
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
                            Math.floor(
                                Math.random() * tenMinuteMuteMessage.length
                            )
                        ]
                    }${muteRouletteWarning}`,
                });
                await muted(10);
                return;
            }

            // 6-10: mute for 30 minutes
            if (randomNumber <= 10) {
                // checks if the user has a double trouble powerup
                if (powerUps.includes("Double Trouble")) {
                    await doubleTrouble(30);
                    return;
                }

                // checks if the user has a raise the stakes powerup
                if (powerUps.includes("Raise the Stakes")) {
                    await raiseTheStakes(30);
                    return;
                }

                // checks if the user has a shield powerup
                if (powerUps.includes("Shield")) {
                    await shield(30);
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
                            Math.floor(
                                Math.random() * thirtyMinuteMuteMessage.length
                            )
                        ]
                    }${muteRouletteWarning}`,
                });
                await muted(30);
                return;
            }

            // 11-15: mute for 1 hour
            if (randomNumber <= 15) {
                // checks if the user has a double trouble powerup
                if (powerUps.includes("Double Trouble")) {
                    await doubleTrouble(60);
                    return;
                }

                // checks if the user has a raise the stakes powerup
                if (powerUps.includes("Raise the Stakes")) {
                    await raiseTheStakes(60);
                    return;
                }

                // checks if the user has a shield powerup
                if (powerUps.includes("Shield")) {
                    await shield(60);
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
                            Math.floor(
                                Math.random() * oneHourMuteMessage.length
                            )
                        ]
                    }${muteRouletteWarning}`,
                });
                await muted(60);
                return;
            }

            // 16-20: mute for 3 hours
            if (randomNumber <= 20) {
                // checks if the user has a double trouble powerup
                if (powerUps.includes("Double Trouble")) {
                    await doubleTrouble(180);
                    return;
                }

                // checks if the user has a raise the stakes powerup
                if (powerUps.includes("Raise the Stakes")) {
                    await raiseTheStakes(180);
                    return;
                }

                // checks if the user has a shield powerup
                if (powerUps.includes("Shield")) {
                    await shield(180);
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
                            Math.floor(
                                Math.random() * threeHourMuteMessage.length
                            )
                        ]
                    }${muteRouletteWarning}`,
                });
                await muted(180);
                return;
            }

            // 21: get another random number from 1-10, if it's 1-9, mute for 1 day, if it's 10, mute for 1 week
            if (randomNumber === 21) {
                const randomNumber2 = Math.floor(Math.random() * 10) + 1;
                if (randomNumber2 <= 9) {
                    // checks if the user has a double trouble powerup
                    if (powerUps.includes("Double Trouble")) {
                        await doubleTrouble(1440);
                        return;
                    }

                    // checks if the user has a raise the stakes powerup
                    if (powerUps.includes("Raise the Stakes")) {
                        await raiseTheStakes(1440);
                        return;
                    }

                    // checks if the user has a shield powerup
                    if (powerUps.includes("Shield")) {
                        await shield(1440);
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
                                Math.floor(
                                    Math.random() * oneDayMuteMessage.length
                                )
                            ]
                        }${muteRouletteWarning}`,
                    });
                    await muted(1440);
                    return;
                } else {
                    // checks if the user has a double trouble powerup
                    if (powerUps.includes("Double Trouble")) {
                        await doubleTrouble(10080);
                        return;
                    }

                    // checks if the user has a raise the stakes powerup
                    if (powerUps.includes("Raise the Stakes")) {
                        await raiseTheStakes(10080);
                        return;
                    }

                    // checks if the user has a shield powerup
                    if (powerUps.includes("Shield")) {
                        await shield(10080);
                        return;
                    }

                    const oneWeekMuteMessage = [
                        "Do you understand how small the chances of this is? There is exactly a .1% chance of this happening, and it happened to you. It's actually insane how this happened, I'm genuinely in shock. You should go buy a lottery ticket. Whackadoo!",
                    ];
                    await interaction.reply({
                        content: `You landed on ${randomNumber}. You have been muted for 1 week! ${
                            oneWeekMuteMessage[
                                Math.floor(
                                    Math.random() * oneWeekMuteMessage.length
                                )
                            ]
                        }${muteRouletteWarning}`,
                    });
                    await muted(10080);
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
                        shieldMessage[
                            Math.floor(Math.random() * shieldMessage.length)
                        ]
                    }${muteRouletteWarning}`,
                });
                await avoidedMute();
                await addPowerUp("Shield");
                return;
            }

            // 27-30: Get a double trouble powerup
            if (randomNumber <= 30) {
                const doubleMessage = [
                    "You get a `Double Trouble` powerup! This will automatically be used to double your next mute time.",
                ];
                await interaction.reply({
                    content: `You landed on ${randomNumber}. ${
                        doubleMessage[
                            Math.floor(Math.random() * doubleMessage.length)
                        ]
                    }${muteRouletteWarning}`,
                });
                await avoidedMute();
                await addPowerUp("Double Trouble");
                return;
            }

            // 31-35: Get a raise the stakes powerup
            if (randomNumber <= 35) {
                const raiseMessage = [
                    "You get a `Raise the Stakes` powerup! This will automatically be used on your next roll to halve all potential mute chances, but double all potential mute times.",
                ];
                await interaction.reply({
                    content: `You landed on ${randomNumber}. ${
                        raiseMessage[
                            Math.floor(Math.random() * raiseMessage.length)
                        ]
                    }${muteRouletteWarning}`,
                });
                await avoidedMute();
                await addPowerUp("Raise the Stakes");
                return;
            }

            // 36-40: Get a 50/50 powerup
            if (randomNumber <= 40) {
                const fiftyMessage = [
                    "You get a `Fifty-Fifty` powerup! This will automatically be used on your next roll to make it a 50/50 chance of getting muted. Good luck!",
                ];
                await interaction.reply({
                    content: `You landed on ${randomNumber}. ${
                        fiftyMessage[
                            Math.floor(Math.random() * fiftyMessage.length)
                        ]
                    }${muteRouletteWarning}`,
                });
                await avoidedMute();
                await addPowerUp("Fifty-Fifty");
                return;
            }

            // 41-45: Disable Muteroulette for everyone for 10 minutes
            if (randomNumber <= 45) {
                const tripleMessage = [
                    "You have disabled muteroulette for everyone for 10 minutes! Enjoy the peace and quiet.",
                ];
                await interaction.reply({
                    content: `You landed on ${randomNumber}. ${
                        tripleMessage[
                            Math.floor(Math.random() * tripleMessage.length)
                        ]
                    }${muteRouletteWarning}`,
                });
                this.disabledTime = new Date();
                return;
            }

            // 46-50: Gift a friend
            if (randomNumber <= 50) {
                const giftMessage = [
                    "You get to gift a friend a powerup! Who and what would you like to gift?",
                ];
                const selectUserDropdown = new UserSelectMenuBuilder()
                    .setCustomId("user_id")
                    .setRequired(true)
                    .setPlaceholder("Select user to gift!")
                    .setMaxValues(1)
                const selectGiftDropdown = new StringSelectMenuBuilder()
                    .setCustomId("gift")
                    .setRequired(true)
                    .setPlaceholder("Select powerup to gift!")
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Shield")
                            .setValue("Shield"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Double Trouble")
                            .setValue("Double Trouble"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Raise the Stakes")
                            .setValue("Raise the Stakes"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Fifty-Fifty")
                            .setValue("Fifty-Fifty")
                    )
                    .setMaxValues(1)
                const confirm = new ButtonBuilder()
                    .setCustomId("confirm")
                    .setStyle(ButtonStyle.Primary)
                    .setLabel("Confirm")
                const cancel = new ButtonBuilder()
                    .setCustomId("cancel")
                    .setStyle(ButtonStyle.Danger)
                    .setLabel("Cancel")
                const row1 = new ActionRowBuilder<UserSelectMenuBuilder>()
                    .addComponents(selectUserDropdown)
                const row2 = new ActionRowBuilder<StringSelectMenuBuilder>()
                    .addComponents(selectGiftDropdown)
                const row3 = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(confirm, cancel)

                // prompt user for a user to gift
                const message = await interaction.reply({
                    content: `You landed on ${randomNumber}. ${
                        giftMessage[
                            Math.floor(Math.random() * giftMessage.length)
                        ]
                    }${muteRouletteWarning}`,
                    components: [row1, row2, row3]
                });
                await avoidedMute();
                const filter = (m: { author: { id: string; }; }) => m.author.id === interaction.user.id;
                const collector = message.createMessageComponentCollector({
                    filter: i => i.user.id == interaction.user.id,
                    time: 60 * 1000
                })

                let discordUser: string | null = null;
                let giftedUser: WithId<MuterouletteUser> | null = null
                let powerup: string | null = null
                let willGift = false
                collector.on("collect", async (e) => {
                    if (e.customId == "user_id" && e.isUserSelectMenu()) {
                        discordUser = e.values[0]
                        giftedUser = await users.findOne({ user: discordUser })
                    }
                    if (e.customId == "gift" && e.isStringSelectMenu()) {
                        powerup = e.values[0]
                    }
                    if (e.isButton()) {
                        switch (e.customId) {
                            case "confirm":
                                willGift = true
                            case "cancel":
                            default:
                                break;
                        }
                        collector.stop()
                    }
                    await e.deferUpdate()
                })
                collector.on("end", async _ => {
                    if (!willGift) {
                        await message.edit({
                            content: "Gift wasted. Took too long to gift, or you have chosen to not gift.",
                            components: []
                        })
                        return
                    }
                    if (discordUser == null) {
                        await message.edit({
                            content: "No user selected! Gift wasted.",
                            components: []
                        })
                        return
                    }
                    if (giftedUser == null) {
                        await message.edit({
                            content: "That user has not run the muteroulette yet! Gift wasted.",
                            components: []
                        })
                        return
                    }
                    if (giftedUser.user === interaction.user.id) {
                        await message.edit({
                            content: "You cannot gift yourself! Gift wasted.",
                            components: []
                        })
                        return;
                    }
                    if (powerup == null) {
                        await message.edit({
                            content: "No powerup selected! Gift wasted.",
                            components: []
                        })
                        return;
                    }
                    await users.updateOne(
                        { user: discordUser },
                        { $set: { powerUps: [...giftedUser.powerUps, powerup] } }
                    );
                    await message.edit({
                        content: `Your gift of ${powerup} has been sent to <@${discordUser}>! The gift is immediately redeemed upon arrival.`,
                        components: []
                    })
                })
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
                    normalMessage[
                        Math.floor(Math.random() * normalMessage.length)
                    ]
                }${muteRouletteWarning}`,
            });
            await avoidedMute();
        } else if (interaction.options.getSubcommand() === "stats") {
            var specifiedUser =
                (interaction.inCachedGuild() && interaction.options.getMentionable("person")) ||
                interaction.user;
            const user = await users.findOne({ user: specifiedUser.id });

            if (user == null) {
                await interaction.reply({
                    content: "You have not run the muteroulette yet!",
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
                .setTitle(`Muteroulette Stats!`)
                .setDescription(
                    `<@${specifiedUser.id}>\nTotal Mutes: **${numMutesTotal}**\nTotal Rolls: **${numAllTotal}**\nCurrent Streak: **${numStreak}**\nMax Streak: **${numMaxStreak}**\nMute Percentage: **${mutePercentage}%**`
                )
                .addFields({
                    name: "Powerups",
                    value: powerUps.join("\n") || "None",
                })
                .setColor(0x72bfed)
                .setTimestamp()

            await interaction.reply({ embeds: [embed] });
        } else if (interaction.options.getSubcommand() === "leaders") {
            // find the top user for each category

            // TODO: don't use defer in the future
            await interaction.deferReply();

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
                .find({
                    mutePercentage: { $lt: 100 },
                    numAllTotal: { $gte: 50 },
                })
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
                    description += `Highest Number of Mutes: **\`${topMutesUser.displayName}\`** - **${topMutesData} mutes**\n`;
                } catch (error) {
                    if (i === topMutes.length - 1) {
                        description += "Highest Number of Mutes: **No one yet**\n";
                    }
                    continue;
                }
                break;
            }
            for (var i = 0; i < topAll.length; i++) {
                try {
                    const topAllData = topAll[i].numAllTotal;
                    const topAllUser = await interaction.guild.members.fetch(
                        topAll[i].user
                    );
                    description += `Highest Number of Rolls: **\`${topAllUser.displayName}\`** - **${topAllData} rolls**\n`;
                } catch (error) {
                    if (i === topAll.length - 1) {
                        description += "Highest Number of Rolls: **No one yet**\n";
                    }
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
                    description += `Highest Unmuted Streak: **\`${topStreakUser.displayName}\`** - **${topStreakData} rolls**\n`;
                } catch (error) {
                    if (i === topStreak.length - 1) {
                        description += "Highest Unmuted Streak: **No one yet**\n";
                    }
                    continue;
                }
                break;
            }
            for (var i = 0; i < lowestPercentage.length; i++) {
                try {
                    const lowestPercentageData =
                        lowestPercentage[i].mutePercentage;
                    const lowestPercentageUser =
                        await interaction.guild.members.fetch(
                            lowestPercentage[i].user
                        );
                    description += `Lowest Mute Percentage: **\`${lowestPercentageUser.displayName}\`** - **${lowestPercentageData}%**\n`;
                } catch (error) {
                    if (i === lowestPercentage.length - 1) {
                        description += "Lowest Mute Percentage: **No one yet**\n";
                    }
                    continue;
                }
                break;
            }
            for (var i = 0; i < highestPercentage.length; i++) {
                try {
                    const highestPercentageData =
                        highestPercentage[i].mutePercentage;
                    const highestPercentageUser =
                        await interaction.guild.members.fetch(
                            highestPercentage[i].user
                        );
                    description += `Highest Mute Percentage: **\`${highestPercentageUser.displayName}\`** - **${highestPercentageData}%**\n`;
                } catch (error) {
                    if (i === highestPercentage.length - 1) {
                        description += "Highest Mute Percentage: **No one yet**\n";
                    }
                    continue;
                }
                break;
            }

            // create the embed
            const embed = new EmbedBuilder()
                .setTitle("Muteroulette Leaderboard!")
                .setDescription(description)
                .setColor(0x72bfed)
                .setTimestamp()

            // send the embed
            await interaction.editReply({ embeds: [embed] });
        }

        return;
    }
}
