import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, GuildMember } from "discord.js";
import { Services } from "../../Services";
import SlashCommand from "../SlashCommand";
import { startingBalance, User, Trade, Stock, stockEmojis } from "../../Services/Database/models/april2025";
import * as logger from "../../logger";

export default class April2025Command extends SlashCommand {
    public disabledTime = new Date(0);

    public data = new SlashCommandBuilder()
        .setName("stocks")
        .setDescription("Trade in The Heeler Exchange and become the richest activilist (channel activity capitalist)!")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("buy")
                .setDescription("Buy channel stocks on the Nasdunny!")
                .addStringOption((option) =>
                    option
                        .setName("ticker")
                        .setDescription("Ticker of the stock you want to buy.")
                        .setRequired(true)
                        .addChoices(
                            { name: "$OFFT", value: "OFFT" },
                            { name: "$BLY", value: "BLY" },
                            { name: "$OVER", value: "OVER" }
                        )

                )
                .addIntegerOption((option) =>
                    option
                        .setName("shares")
                        .setDescription("Shares of stock you want to buy.")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("sell")
                .setDescription("Sell channel stocks on The Heeler Exchange!")
                .addStringOption((option) =>
                    option
                        .setName("ticker")
                        .setDescription("Ticker of the stock you want to sell.")
                        .setRequired(true)
                        .addChoices(
                            { name: "$OFFT", value: "OFFT" },
                            { name: "$BLY", value: "BLY" },
                            { name: "$OVER", value: "OVER" }
                        )
                )
                .addIntegerOption((option) =>
                    option
                        .setName("shares")
                        .setDescription("Shares of stock you want to sell.")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("portfolio")
                .setDescription("View your personal stock portfolio!")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("leaderboard")
                .setDescription("List the richest stock traders!")
        ) as SlashCommandBuilder
    async execute(
        interaction: ChatInputCommandInteraction,
        services: Services
    ) {
        switch (interaction.options.getSubcommand()) {
            case "buy":
                await this.buyStock(interaction, services);
                break;
            case "sell":
                await this.sellStock(interaction, services);
                break;
            case "portfolio":
                await this.viewPortfolio(interaction, services);
                break;
            case "leaderboard":
                await this.viewLeaderboard(interaction, services);
                break;
        }
    }
    
    async buyStock(interaction: ChatInputCommandInteraction, services: Services) {
        const ticker = interaction.options.getString("ticker")!;
        const shares = interaction.options.getInteger("shares")!;
        const userId = interaction.member.user.id;
        var user = await services.database.collections.users.findOne({ user: userId });

        if (shares <= 0) {
            await interaction.reply("You must buy at least one share!");
            return;
        }

        if (!user) {
            await services.database.collections.users.insertOne({
                user: userId,
                balance: startingBalance,
                stocks: {
                    "OFFT": 0,
                    "BLY": 0,
                    "OVER": 0
                },
                lastUpdated: new Date()
            });

            user = await services.database.collections.users.findOne({ user: userId });
        }

        const stock = await services.database.collections.stocks.findOne({ ticker });
        if (!stock) {
            await interaction.reply("That stock does not exist!");
            return;
        }

        if (stock.price < 1 || isNaN(stock.price)) {
            await interaction.reply("The stock market is broken! Spam ping Jalen.");
            return;
        }

        const cost = stock.price * shares;
        if (cost > user.balance) {
            await interaction.reply("You don't have enough dollarbucks to buy that many shares!");
            return;
        }

        user.balance -= cost;
        user.stocks[ticker] = (user.stocks[ticker] || 0) + shares;
        user.lastUpdated = new Date();

        await services.database.collections.users.updateOne({ user: userId }, { $set: user });
        await services.database.collections.trades.insertOne({
            user: userId,
            ticker,
            amount: shares,
            price: stock.price,
            time: new Date()
        });

        await interaction.reply(`You have successfully bought **${shares.toLocaleString()}** shares of \`\$${ticker}\` for **${cost.toLocaleString()} dollarbucks**!`);
    }

    async sellStock(interaction: ChatInputCommandInteraction, services: Services) {
        const ticker = interaction.options.getString("ticker")!;
        const shares = interaction.options.getInteger("shares")!;

        if (shares <= 0) {
            await interaction.reply("You must sell at least one share!");
            return;
        }

        const userId = interaction.member.user.id;
        var user = await services.database.collections.users.findOne({ user: userId });

        if (!user) {
            await services.database.collections.users.insertOne({
                user: userId,
                balance: startingBalance,
                stocks: {
                    "OFFT": 0,
                    "BLY": 0,
                    "OVER": 0
                },
                lastUpdated: new Date()
            });

            user = await services.database.collections.users.findOne({ user: userId });
        }

        const stock = await services.database.collections.stocks.findOne({ ticker });
        if (!stock) {
            await interaction.reply("That stock does not exist!");
            return;
        }

        if (stock.price < 1 || isNaN(stock.price)) {
            await interaction.reply("The stock market is broken! Spam ping Jalen.");
            return;
        }

        if (!user.stocks[ticker] || user.stocks[ticker] < shares) {
            await interaction.reply("You don't have enough shares to sell!");
            return;
        }

        const cost = stock.price * shares;
        user.balance += cost;
        user.stocks[ticker] -= shares;
        user.lastUpdated = new Date();

        await services.database.collections.users.updateOne({ user: userId }, { $set: user });
        await services.database.collections.trades.insertOne({
            user: userId,
            ticker,
            amount: -shares,
            price: stock.price,
            time: new Date()
        });

        await interaction.reply(`You have successfully sold **${shares.toLocaleString()}** shares of \`\$${ticker}\` for **${cost.toLocaleString()} dollarbucks**!`);
    }

    async viewPortfolio(interaction: ChatInputCommandInteraction, services: Services) {
        const userId = interaction.member.user.id;
        const member = interaction.member as GuildMember;

        var user = await services.database.collections.users.findOne({ user: userId });

        if (!user) {
            await services.database.collections.users.insertOne({
                user: userId,
                balance: startingBalance,
                stocks: {
                    "OFFT": 0,
                    "BLY": 0,
                    "OVER": 0
                },
                lastUpdated: new Date()
            });

            user = await services.database.collections.users.findOne({ user: userId });
        }

        const stocksData = await services.database.collections.stocks.find().toArray();
        const stockPrices = stocksData.reduce((acc, stock) => {
            acc[stock.ticker] = stock.price;
            return acc;
        }, {} as Record<string, number>);

        const stocks = Object.keys(user.stocks).map(ticker => {
            const shares = user.stocks[ticker];
            const price = stockPrices[ticker] || 0;
            const value = shares * price;
            const emoji = stockEmojis[ticker];
            return `${stockEmojis[ticker]} \`$${ticker}\`: **${shares}** shares @ $**${price.toLocaleString()}** (Value: **${value.toLocaleString()} dollarbucks**)`;
        });

        const stockValue = Object.entries(user.stocks).reduce((total, [ticker, shares]) => {
            return total + (shares as number * (stockPrices[ticker] || 0));
        }, 0);

        const netWorth = user.balance + stockValue;

        const embed = new EmbedBuilder()
            .setTitle(`${member.displayName}'s Stock Portfolio`)
            .setDescription(`:moneybag: Balance: **${user.balance.toLocaleString()} dollarbucks**\n:money_with_wings: Net Worth: **${netWorth.toLocaleString()} dollarbucks**\n\n${stocks.join("\n")}`);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async viewLeaderboard(interaction: ChatInputCommandInteraction, services: Services) {
        const users = await services.database.collections.users.find().toArray();
        const stocks = await services.database.collections.stocks.find().toArray();

        const stockPrices = stocks.reduce((acc, stock) => {
            acc[stock.ticker] = stock.price;
            return acc;
        }, {} as Record<string, number>);

        const leaderboard = users
            .map(user => {
                const stockValue = Object.entries(user.stocks).reduce((total, [ticker, shares]) => {
                    return total + (shares as number * (stockPrices[ticker] || 0));
                }, 0);
                const netWorth = user.balance + stockValue;
                return { user: user.user, netWorth };
            })
            .sort((a, b) => b.netWorth - a.netWorth)
            .slice(0, 10)
            .map((user, i) => {
                return `${i + 1}. <@${user.user}> - Net Worth: $${user.netWorth.toLocaleString()}`;
            });

        const embed = new EmbedBuilder()
            .setTitle("Richest Stock Traders")
            .setDescription(leaderboard.join("\n"));

        await interaction.reply({ embeds: [embed] });
    }
}