import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { Services } from "../../Services";
import SlashCommand from "../SlashCommand";
import { startingBalance, User, Trade, Stock } from "../../Services/Database/models/april2025";
import * as logger from "../../logger";

export default class MuterouletteCommand extends SlashCommand {
    public disabledTime = new Date(0);

    public data = new SlashCommandBuilder()
        .setName("stocks")
        .setDescription("Trade in The Heeler Exchange and become the ultimate activilist (channel activity capitalist)!")
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
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("market")
                .setDescription("View the current The Heeler Exchange market!")
        )  as SlashCommandBuilder
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
            case "market":
                await this.viewMarket(interaction, services);
                break;
        }
    }
    
    async buyStock(interaction: ChatInputCommandInteraction, services: Services) {
        const ticker = interaction.options.getString("ticker")!;
        const shares = interaction.options.getInteger("shares")!;
        const userId = interaction.member.user.id;
        const user = await services.database.collections.users.findOne({ user: userId });

        if (!user) {
            await services.database.collections.users.insertOne({
                user: userId,
                balance: startingBalance,
                stocks: {},
                lastUpdated: new Date()
            });
        }

        const stock = await services.database.collections.stocks.findOne({ ticker });
        if (!stock) {
            await interaction.reply("That stock does not exist!");
            return;
        }

        const cost = stock.price * shares;
        if (cost > user.balance) {
            await interaction.reply("You don't have enough money to buy that many shares!");
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

        await interaction.reply(`You have successfully bought **${shares.toLocaleString()}** shares of \`\$${ticker}\` for **$${cost.toLocaleString()}**!`);
    }

    async sellStock(interaction: ChatInputCommandInteraction, services: Services) {
        const ticker = interaction.options.getString("ticker")!;
        const shares = interaction.options.getInteger("shares")!;
        const userId = interaction.member.user.id;
        const user = await services.database.collections.users.findOne({ user: userId });

        if (!user) {
            await services.database.collections.users.insertOne({
                user: userId,
                balance: startingBalance,
                stocks: {},
                lastUpdated: new Date()
            });
        }

        const stock = await services.database.collections.stocks.findOne({ ticker });
        if (!stock) {
            await interaction.reply("That stock does not exist!");
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

        await interaction.reply(`You have successfully sold **${shares.toLocaleString()}** shares of \`\$${ticker}\` for **$${cost.toLocaleString()}**!`);
    }
}