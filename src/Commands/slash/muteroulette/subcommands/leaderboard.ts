import { CacheType, ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";

export default class MuterouletteLeaderboardSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("leaders")
        .setDescription("View the muteroulette leaderboard!")

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        const users = services.database.collections.muteroulette;
        
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
}