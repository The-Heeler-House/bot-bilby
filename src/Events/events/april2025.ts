import { Client, Collection, Events, Message, TextChannel } from "discord.js";
import BotEvent from "../BotEvent";
import { Services } from "../../Services";
import { customEvents } from "../BotEvent";
const { time, TimestampStyles } = require('discord.js');
import { stockList, stockEmojis } from "../../Services/Database/models/april2025";

// day reset time is 0am EST
const resetTime = 4;

const updatesChannel = "1353760723116888236"

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

async function stonks(client: Client) {
    const initTime = new Date();

    const stocks = Object.keys(stockList);

    const stockMessages = await Promise.all(stocks.map(async stock => {
        const stockChannel = await client.channels.fetch(stockList[stock]) as TextChannel;
        const messages = await fetchPeriod(new Date(initTime.getTime() - 3600000), initTime, stockChannel);

        return messages
    }));

    const stockMessagesPreviousHour = await Promise.all(stocks.map(async stock => {
        const stockChannel = await client.channels.fetch(stockList[stock]) as TextChannel;
        const messages = await fetchPeriod(new Date(initTime.getTime() - 7200000), new Date(initTime.getTime() - 3600000), stockChannel);

        return messages
    }));

    const previousDayMessages = await Promise.all(stocks.map(async stock => {
        const hoursSinceReset = initTime.getUTCHours() < resetTime ? 24 - resetTime + initTime.getUTCHours() : initTime.getUTCHours() - resetTime;
        const stockChannel = await client.channels.fetch(stockList[stock]) as TextChannel;
        const messages = await fetchPeriod(new Date(initTime.getTime() - 86400000 - hoursSinceReset * 3600000), new Date(initTime.getTime() - 86400000), stockChannel);

        return messages
    }));

    const currentDayMessages = await Promise.all(stocks.map(async stock => {
        const hoursSinceReset = initTime.getUTCHours() < resetTime ? 24 - resetTime + initTime.getUTCHours() : initTime.getUTCHours() - resetTime;
        const stockChannel = await client.channels.fetch(stockList[stock]) as TextChannel;
        const messages = await fetchPeriod(new Date(initTime.getTime() - hoursSinceReset * 3600000), initTime, stockChannel);

        return messages
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
            currentDayMessages: currentDayMessages[i]
        }
    });

    const stockMessagesDataString = stockMessagesData.map(stock => {
        const hourChange = ((stock.messages - stock.previousHourMessages) / stock.previousHourMessages * 100);
        const dayChange = ((stock.currentDayMessages - stock.previousDayMessages) / stock.previousDayMessages * 100);

        const hourChangeEmoji = hourChange >= 0 ? "<:yes:1090051438828326912>" : "<:no:1090051727732002907>";
        const dayChangeEmoji = dayChange >= 0 ? "<:yes:1090051438828326912>" : "<:no:1090051727732002907>";

        return `${stock.emoji} \`\$${stock.stock}\` - <#${stock.id}>\n` +
           `**${stock.messages.toLocaleString()}** messages in the last hour (**${hourChange.toFixed(2)}% change ${hourChangeEmoji}**)\n` +
           `**${stock.currentDayMessages.toLocaleString()}** messages in the current day (**${dayChange.toFixed(2)}% change ${dayChangeEmoji}**)`;
    }).join("\n\n");

    await stockUpdates.send(`## <:BanditHuh:1079130551535009822> Channel Activity Report - ${time(initTime)}\n\n${stockMessagesDataString}\n\n*Use these report stats to influence your trades. Remember, more channel activity equals more value! <:BingoQueen:962664872104058910>*`);

    const afterTime = new Date();

    // wait until the next 1 hour interval
    const nextHour = new Date();
    nextHour.setHours(nextHour.getUTCHours() + 1);
    nextHour.setMinutes(0);
    nextHour.setSeconds(0);
    nextHour.setMilliseconds(0);

    const timeToWait = nextHour.getTime() - afterTime.getTime() + 1000; // add 1 second to ensure we're past the next hour

    const seconds = Math.floor((timeToWait / 1000) % 60);
    const minutes = Math.floor((timeToWait / (1000 * 60)) % 60);
    const hours = Math.floor((timeToWait / (1000 * 60 * 60)) % 24);

    // console.log(`Waiting ${hours}h ${minutes}m ${seconds}s until the next hour`);

    setTimeout(() => {
        stonks(client);
    }, timeToWait);
}

export default class messageStocks extends BotEvent {
    // get time
    public eventName = customEvents.ManualFire;

    async execute(client: Client, services: Services, ...params: any) {
        const afterTime = new Date();

        // wait until the next 1 hour interval
        const nextHour = new Date();
        nextHour.setHours(nextHour.getUTCHours() + 1);
        nextHour.setMinutes(0);
        nextHour.setSeconds(0);
        nextHour.setMilliseconds(0);

        const timeToWait = nextHour.getTime() - afterTime.getTime() + 1000; // add 1 second to ensure we're past the next hour

        const seconds = Math.floor((timeToWait / 1000) % 60);
        const minutes = Math.floor((timeToWait / (1000 * 60)) % 60);
        const hours = Math.floor((timeToWait / (1000 * 60 * 60)) % 24);

        // console.log(`Waiting ${hours}h ${minutes}m ${seconds}s until the next hour`);

        setTimeout(() => {
            stonks(client);
        }, timeToWait);
    }
}