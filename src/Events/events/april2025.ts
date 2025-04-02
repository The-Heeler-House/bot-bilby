import { Client, Collection, Events, Message, TextChannel, AttachmentBuilder, EmbedBuilder } from "discord.js";
import BotEvent from "../BotEvent";
import { Services } from "../../Services";
import { customEvents } from "../BotEvent";
import { time, TimestampStyles } from 'discord.js';
import gaussian from "gaussian";
import { stockList, stockEmojis, Stock, StockSetting, Trade, Change } from "../../Services/Database/models/april2025";
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { Chart, ChartConfiguration } from "chart.js";
import 'chartjs-adapter-moment';
import { last } from "cheerio/dist/commonjs/api/traversing";

// day reset time is 0am EST
const resetTime = 4;

const updatesChannel = "1353760723116888236";
const stockChannel = "1356357964432412847";
const staffChannel = "1356505606130896936"

const stockMessage = "1356780219377389729"

function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}

async function fetchPeriod(start: Date, end: Date, channel: TextChannel) {
    let allMessages = 0;
    let lastMessageId: string | undefined;

    while (true) {
        const options = { limit: 100, before: lastMessageId, cache: true };
        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) break;

        const filteredMessages = messages.filter(message => message.createdAt >= start && message.createdAt <= end);
        allMessages += filteredMessages.size;

        const lastMessage = messages.last();
        if (!lastMessage || lastMessage.createdAt < start) break;

        lastMessageId = lastMessage.id;
    }

    return allMessages;
}

async function channels(client: Client, services: Services) {
    const initTime = new Date();

    const stocks = Object.keys(stockList);

    const stockMessages = await Promise.all(stocks.map(async stock => {
        const stockChannel = await client.channels.fetch(stockList[stock]) as TextChannel;
        const messages = await fetchPeriod(new Date(initTime.getTime() - 3600000), initTime, stockChannel);

        return messages;
    }));

    const stockMessagesPreviousHour = await Promise.all(stocks.map(async stock => {
        const stockChannel = await client.channels.fetch(stockList[stock]) as TextChannel;
        const messages = await fetchPeriod(new Date(initTime.getTime() - 7200000), new Date(initTime.getTime() - 3600000), stockChannel);

        return messages;
    }));

    const previousDayMessages = await Promise.all(stocks.map(async stock => {
        const hoursSinceReset = initTime.getUTCHours() < resetTime ? 24 - resetTime + initTime.getUTCHours() : initTime.getUTCHours() - resetTime;
        const stockChannel = await client.channels.fetch(stockList[stock]) as TextChannel;
        const messages = await fetchPeriod(new Date(initTime.getTime() - 86400000 - hoursSinceReset * 3600000), new Date(initTime.getTime() - 86400000), stockChannel);

        return messages;
    }));

    const currentDayMessages = await Promise.all(stocks.map(async stock => {
        const hoursSinceReset = initTime.getUTCHours() < resetTime ? 24 - resetTime + initTime.getUTCHours() : initTime.getUTCHours() - resetTime;
        const stockChannel = await client.channels.fetch(stockList[stock]) as TextChannel;
        const messages = await fetchPeriod(new Date(initTime.getTime() - hoursSinceReset * 3600000), initTime, stockChannel);

        return messages;
    }));

    const last24Hours = await Promise.all(stocks.map(async stock => {
        const stockChannel = await client.channels.fetch(stockList[stock]) as TextChannel;
        const messages = await fetchPeriod(new Date(initTime.getTime() - 86400000), initTime, stockChannel);

        return messages;
    }));

    const stockUpdates = await client.channels.fetch(updatesChannel) as TextChannel;

    const stockMessagesData = stocks.map((stock, i) => {
        return {
            emoji: stockEmojis[stock],
            stock,
            id: stockList[stock],
            messages: stockMessages[i],
            previousHourMessages: stockMessagesPreviousHour[i],
            previousDayMessages: previousDayMessages[i],
            currentDayMessages: currentDayMessages[i],
            last24Hours: last24Hours[i]
        };
    });

    const stockMessagesDataString = stockMessagesData.map(stock => {
        const hourChange = ((stock.messages - stock.previousHourMessages) / stock.previousHourMessages * 100);
        const dayChange = ((stock.currentDayMessages - stock.previousDayMessages) / stock.previousDayMessages * 100);

        const hourChangeEmoji = hourChange >= 0 ? "<:yes:1090051438828326912>" : "<:no:1090051727732002907>";
        const dayChangeEmoji = dayChange >= 0 ? "<:yes:1090051438828326912>" : "<:no:1090051727732002907>";

        const dayAvg = stock.last24Hours / 24;

        const trendFactor = (clamp(isNaN(hourChange) ? 0 : hourChange / 100, -1, 1) / 2 + clamp(isNaN(dayChange) ? 0 : dayChange / 100, -1, 1) / 2)
        const avgFactor = clamp((stock.messages - dayAvg) / dayAvg, -1, 1);

        const trend =  trendFactor / 2 + avgFactor / 2;

        const staffLogChannel = client.channels.cache.get(staffChannel) as TextChannel;
        // log ticker, dayavg, trendFactor, avgFactor, trend
        staffLogChannel.send(`\`\$${stock.stock}\` - **${dayAvg}** messages in the last 24 hours\n` +
            `Trend Factor: **${trendFactor.toFixed(6)}**\n` +
            `Average Factor: **${avgFactor.toFixed(6)}**\n` +
            `Trend: **${trend.toFixed(6)}**`);

        // update the trend
        const stockInfo = services.database.collections.settings.findOne({ ticker: stock.stock });
        if (stockInfo) {
            services.database.collections.settings.updateOne({ ticker: stock.stock }, { $set: { trend } });
        }

        return `${stock.emoji} \`\$${stock.stock}\` - <#${stock.id}>\n` +
           `**${stock.messages.toLocaleString()}** messages in the last hour (**${hourChange.toFixed(2)}% change ${hourChangeEmoji}**)\n` +
           `**${stock.currentDayMessages.toLocaleString()}** messages in the current day (**${dayChange.toFixed(2)}% change ${dayChangeEmoji}**)`;
    }).join("\n\n");

    await stockUpdates.send(`## <:BanditHuh:1079130551535009822> Channel Activity Report - ${time(initTime)}\n\n${stockMessagesDataString}\n\n*Use these report stats to influence your trades. Remember, more channel activity equals more value! <:BingoQueen:962664872104058910>*`);

    const afterTime = new Date();

    const timeToWait = getTimeToWait(afterTime, 60);
    setTimeout(() => {
        channels(client, services);
    }, timeToWait);
}

async function stockUpdate(client: Client, services: Services) {
    const stocks = Object.keys(stockList);

    const stockData = await Promise.all(stocks.map(async stock => {
        const stockData = await services.database.collections.stocks.findOne({ ticker: stock });
        return stockData;
    }));

    const stockSettings = await Promise.all(stocks.map(async stock => {
        const stockSetting = await services.database.collections.settings.findOne({ ticker: stock });
        return stockSetting;
    }));

    const initTime = new Date();
    initTime.setMinutes(initTime.getMinutes() - initTime.getMinutes() % 5);
    initTime.setSeconds(0);
    initTime.setMilliseconds(0);

    const previousInterval = new Date(initTime.getTime() - 300000);

    const trades = await services.database.collections.trades.find({ time: { $gte: previousInterval, $lt: initTime } }).toArray();

    const tradesByStock: Record<string, Trade[]> = stocks.reduce((acc, stock) => {
        acc[stock] = [];
        return acc;
    }, {});

    trades.forEach(trade => {
        if (!tradesByStock[trade.ticker]) {
            tradesByStock[trade.ticker] = [];
        }
        tradesByStock[trade.ticker].push(trade as any as Trade);
    });

    const changes = [];
    const buySellVolumes = [];
    for (const stock of stocks) {
        const data = stockData.find(s => s.ticker === stock);
        const settings = stockSettings.find(s => s.ticker === stock);
        const trades = tradesByStock[stock];

        const buyVolume = trades.reduce((acc, trade) => trade.amount > 0 ? acc + trade.amount : acc, 0);
        const sellVolume = -1 * trades.reduce((acc, trade) => trade.amount < 0 ? acc + trade.amount : acc, 0);
        
        buySellVolumes.push({ stock, buyVolume, sellVolume });
        
        const result = await SuperSecretAlgorithm(data, buyVolume, sellVolume, settings.volumeFactor, settings.limitingVolume, settings.volatilityFactor, settings.trend, settings.trendFactor);

        const newVolume = trades.reduce((acc, trade) => acc + Math.abs(trade.amount), 0);

        data.price = result.price;
        data.lastUpdated = initTime;
        data.volume += newVolume;

        await services.database.collections.stocks.updateOne({ ticker: stock }, { $set: { price: data.price, volume: data.volume, lastUpdated: data.lastUpdated } });

        const change: Change = { 
            ticker: stock, 
            price: data.price, 
            volume: newVolume, 
            volumeFactor: result.volumeFactor, 
            volatilityFactor: result.volatilityFactor, 
            trendFactor: result.trendFactor, 
            settings: settings as any as StockSetting,
            time: initTime 
        };
        changes.push(change);
        await services.database.collections.changes.insertOne(change);
    }

    const stockUpdates = await client.channels.fetch(stockChannel) as TextChannel;

    const newStockData = await Promise.all(stocks.map(async stock => {
        const stockData = await services.database.collections.stocks.findOne({ ticker: stock });
        return stockData;
    }));

    const newStockImages = await Promise.all(stocks.map(async stock => {
        const stockImage = await graphData(services, stock, initTime);
        const attachment = new AttachmentBuilder(stockImage, { name: `stock_changes_${stock}.png` });
        return attachment;
    }));

    // make embeds for each stock, display ticker, channel_name, price, iteration change, iteration change%, and exchange (NASDUNNY) as inline fields, and a graph of the stock price over the last 24 hours
    const stockEmbeds = new Collection<string, EmbedBuilder>();
    for (let i = 0; i < stocks.length; i++) {
        const stock = stocks[i];
        const nStockData = newStockData[i];
        const stockImage = newStockImages[i];

        const previousData = await services.database.collections.changes.find({ ticker: stock, time: { $lt: initTime } }).sort({ time: -1 }).limit(1).toArray();
        const previousPrice = previousData.length === 0 ? stockData[i].price : previousData[0].price;

        const change = nStockData.price - previousPrice;
        const changePercent = (change / previousPrice) * 100;

        const embed = new EmbedBuilder()
            .addFields(
            { name: " Ticker", value: stockEmojis[stock] + ` \`\$${stock}\``, inline: true },
            { name: "Channel", value: `<#${stockList[stock]}>`, inline: true },
            { name: "Price", value: "$" + String(nStockData.price), inline: true },
            { name: "Change", value: `${change >= 0 ? "+" : "-"}$${Math.abs(change).toFixed(2)}`, inline: true },
            { name: "% Change", value: `${changePercent >= 0 ? "+" : "-"}${Math.abs(changePercent).toFixed(2)}%`, inline: true },
            { name: "Exchange", value: "NASDUNNY", inline: true }
            )
            .setImage(`attachment://${stockImage.name}`)
            .setTimestamp(initTime);

        stockEmbeds.set(stock, embed);
    }

    const stockEmbedsArray = stockEmbeds.map(embed => embed);

    const stockUpdateMessage = await stockUpdates.messages.fetch(stockMessage);
    if (stockUpdateMessage) {
        await stockUpdateMessage.edit({
            content: `## <:BanditHuh:1079130551535009822> Stock Prices Report - ${time(initTime)}`,
            embeds: stockEmbedsArray,
            files: newStockImages
        });
    } else {
        await stockUpdates.send({
            content: `## <:BanditHuh:1079130551535009822> Stock Prices Report - ${time(initTime)}`,
            embeds: stockEmbedsArray,
            files: newStockImages
        });
    }

    const stockStaffInfo = await client.channels.fetch(staffChannel) as TextChannel;
    const stockChangesString = changes.map(change => {
        const buySellVolume = buySellVolumes.find(volume => volume.stock === change.ticker);
        return `${stockEmojis[change.ticker]} \`\$${change.ticker}\` - **${change.price}** (${change.volume.toLocaleString()} shares, Buy: **${buySellVolume?.buyVolume.toLocaleString() || 0}**, Sell: **${buySellVolume?.sellVolume.toLocaleString() || 0}**)\n` +
            `Volume Factor: **${change.volumeFactor.toFixed(6)}**\n` +
            `Volatility Factor: **${change.volatilityFactor.toFixed(6)}**\n` +
            `Trend Factor: **${change.trendFactor.toFixed(6)}**\n`;
    }).join("\n");
    await stockStaffInfo.send({
        content: `## <:BanditHuh:1079130551535009822> Stock Changes - ${time(initTime)}\n\n${stockChangesString}`
    });

    const afterTime = new Date();

    const timeToWaitStocks = getTimeToWait(afterTime, 5);
    setTimeout(() => {
        stockUpdate(client, services);
    }, timeToWaitStocks);
}

export default class messageStocks extends BotEvent {
    public eventName = customEvents.ManualFire;

    async execute(client: Client, services: Services, ...params: any) {
        // await init(services);

        const afterTime = new Date();

        const timeToWaitChannels = getTimeToWait(afterTime, 60);
        // printTimeToWait(timeToWaitChannels);
        setTimeout(() => {
            channels(client, services);
        }, timeToWaitChannels);

        const timeToWaitStocks = getTimeToWait(afterTime, 5);
        // printTimeToWait(timeToWaitStocks);
        setTimeout(() => {
            stockUpdate(client, services);
        }, timeToWaitStocks);
    }
}

function getTimeToWait(currentTime: Date, interval: number) {
    const nextTime = new Date(currentTime.getTime());
    nextTime.setMinutes((nextTime.getMinutes() + interval) - nextTime.getMinutes() % interval);
    nextTime.setSeconds(0);
    nextTime.setMilliseconds(0);

    return nextTime.getTime() - currentTime.getTime() + 1000; // add 1 second to ensure we're past the next interval
}
function printTimeToWait(timeToWait: number) {
    const seconds = Math.floor((timeToWait / 1000) % 60);
    const minutes = Math.floor((timeToWait / (1000 * 60)) % 60);
    const hours = Math.floor((timeToWait / (1000 * 60 * 60)) % 24);
    console.log(`Waiting ${hours}h ${minutes}m ${seconds}s until the next interval`);
}

async function init(services: Services) {
    for (const stock of Object.keys(stockList)) {
        const newStock: Stock = { ticker: stock, price: 100, volume: 0, lastUpdated: new Date() };
        const stockData = await services.database.collections.stocks.findOne({ ticker: stock });
        if (!stockData) {
            await services.database.collections.stocks.insertOne(newStock);
        }
    }
    for (const stock of Object.keys(stockList)) {
        const stockSetting: StockSetting = { ticker: stock, volumeFactor: 0.05, volatilityFactor: 0.025, trendFactor: 0.001, limitingVolume: 1000, trend: 0.0 };
        const stockSettingData = await services.database.collections.settings.findOne({ ticker: stock });
        if (!stockSettingData) {
            await services.database.collections.settings.insertOne(stockSetting);
        }
    }
    console.log("stocks.ts loaded");
}

async function SuperSecretAlgorithm(stock, buyVolume, sellVolume, volumeFactor, limitingVolume, volatilityFactor, trend, trendFactor) {
    const price = stock.price;
    const nextVolumeFactor = calculateVolumeFactor(buyVolume, sellVolume, volumeFactor, limitingVolume);
    const nextVolatilityFactor = calculateVolatilityFactor(volatilityFactor);
    const nextTrendFactor = calculateTrendFactor(trendFactor, trend);

    const newPrice = price * (1 + nextVolumeFactor + nextVolatilityFactor + nextTrendFactor);

    // round to 2 decimal places
    const finalPrice = Math.round(newPrice * 100) / 100;

    return {
        price: Math.max(1, finalPrice),
        volumeFactor: nextVolumeFactor,
        volatilityFactor: nextVolatilityFactor,
        trendFactor: nextTrendFactor,
    };
}

function calculateVolumeFactor(buyVolume, sellVolume, volumeFactor, limitingVolume) {
    const totalVolume = buyVolume + sellVolume;
    if (totalVolume === 0) return 0;

    const volumeRatio = (buyVolume - sellVolume) / totalVolume;

    const volumeLimiter = Math.min(Math.log(1 + totalVolume / (limitingVolume/9)), 1);

    return ((volumeFactor + 1) ** volumeRatio - 1) * volumeLimiter;
}

function calculateVolatilityFactor(volatility) {
    return gaussian(0, (volatility / 3)**2).random(1)[0];
}

function calculateTrendFactor(trendFactor, trend) {
    return trendFactor * trend;
}

export async function graphData(services: Services, stock: string, time: Date) {
    const stockData = await services.database.collections.changes.find({ ticker: stock }).toArray();

    const lastDay = stockData.filter(change => change.time.getTime() > time.valueOf() - 86400000);

    // get the price at the start and end
    const startPrice = lastDay[0].price;
    const endPrice = lastDay[lastDay.length - 1].price;

    const positive = endPrice > startPrice

    const labels = lastDay.map(change => {
        const elapsed = time.valueOf() - change.time.getTime();

        return elapsed
    });
    const data = lastDay.map(change => change.price);

    const width = 600; //px
    const height = 300; //px
    const backgroundColour = 'transparent'; // Uses https://www.w3schools.com/tags/canvas_fillstyle.asp
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour});

    const configuration: ChartConfiguration<'line'> = {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: `$${stock}`,
                data,
                fill: true,
                borderColor: positive ? 'green' : 'red',
                backgroundColor: positive ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
                tension: 0,
                pointRadius: 0
            }]
        },
        options: {
            responsive: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: 0, // Minimum time is 24 hours ago
                    max: 86400000, // Maximum time is now
                    ticks: {
                        stepSize: 3600000,
                        callback: function(value, index, values) {
                            const elapsedHours = Math.round(value as number / 3600000);
                            return `${elapsedHours}h`;
                        },
                    },
                    reverse: true,
                    grid: {
                        display: false // Remove vertical grid lines
                    }
                },
                y: {
                    beginAtZero: false,
                    border: {
                        display: false,
                    },
                }
            }
        }
    };
    const image = await chartJSNodeCanvas.renderToBuffer(configuration);

    return image;
}
