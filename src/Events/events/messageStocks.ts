import { Client, Events, TextChannel } from "discord.js";
import BotEvent from "../BotEvent";
import { Services } from "../../Services";
import { customEvents } from "../BotEvent";
// day reset time is 0am EST
const resetTime = 4;

const stockList = {
    "OFFT": "962936076404686859",
    // "BLY": "961057412465438822",
    // "OVER": "1126584442941616259",
}

const stockEmojis = {
    "OFFT": "🗣️",
    // "BLY": "🔵",
    // "OVER": "🔥",
}

const updatesChannel = "1353760723116888236"

async function fetchPeriod(start: Date, end: Date, channel: TextChannel) {
    let messages;
    let allMessages = [];
    let lastMessage;
    let found = false;

    while (!found) {
        if (lastMessage === undefined) {
            messages = await channel.messages.fetch({ limit: 100 });
        } else {
            messages = await channel.messages.fetch({ limit: 100, before: lastMessage.id });
        }
        messages = messages.filter(message => message.createdAt >= start && message.createdAt <= end)
        if (messages.size !== 0) {
            found = true;
        }
        console.log(messages.size);
        allMessages = allMessages.concat(messages);
        lastMessage = messages.last();
    }

    while (found && messages.size > 0) {
        messages = await channel.messages.fetch({ limit: 100, before: lastMessage.id });
        // console.log(messages.first().content)
        messages = messages.filter(message => message.createdAt >= start && message.createdAt <= end)
        allMessages = allMessages.concat(messages);
        lastMessage = messages.last();
        console.log(messages.size);
    }

    return allMessages;
}

export default class messageStocks extends BotEvent {
    // get time
    public eventName = customEvents.ManualFire;

    async execute(client: Client, services: Services, ...params: any) {
        var initTime = new Date();

        // wait until the next 1 hour interval
        const nextHour = new Date();
        nextHour.setHours(nextHour.getHours() + 1);
        nextHour.setMinutes(0);
        nextHour.setSeconds(0);
        nextHour.setMilliseconds(0);

        const timeToWait = nextHour.getTime() - initTime.getTime() + 1000; // add 1 second to ensure we're past the next hour

        console.log(`Waiting ${timeToWait}ms until the next hour`);

        // setTimeout(() => {
        //     this.execute(client, services, ...params);
        // }, timeToWait);

        // ready
        console.log("Checking stocks");

        initTime = new Date();

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
            const hoursSinceReset = initTime.getHours() < resetTime ? 24 - resetTime + initTime.getHours() : initTime.getHours() - resetTime;
            // console.log(hoursSinceReset);
            const stockChannel = await client.channels.fetch(stockList[stock]) as TextChannel;
            const mountainTime = new Date(initTime.getTime() - 86400000).toLocaleString("en-US", { timeZone: "America/Denver" });
            // console.log(mountainTime);
            const lastDayMessages = await fetchPeriod(new Date(initTime.getTime() - 86400000 - hoursSinceReset * 3600000), new Date(initTime.getTime() - 86400000), stockChannel);
            console.log(lastDayMessages.first().content);
            console.log(lastDayMessages.last().content);
            return lastDayMessages
        }));

        const currentDayMessages = await Promise.all(stocks.map(async stock => {
            const hoursSinceReset = initTime.getHours() < resetTime ? 24 - resetTime + initTime.getHours() : initTime.getHours() - resetTime;
            // console.log(hoursSinceReset);
            const stockChannel = await client.channels.fetch(stockList[stock]) as TextChannel;
            const messages = await fetchPeriod(new Date(initTime.getTime() - hoursSinceReset * 3600000), initTime, stockChannel);
            // print the first and last message
            console.log(messages.first().content);
            console.log(messages.last().content);
            return messages
        }));

        const stockUpdates = await client.channels.fetch(updatesChannel) as TextChannel;

        const stockMessagesData = stocks.map((stock, i) => {
            return {
                emoji: stockEmojis[stock],
                stock,
                id: stockList[stock],
                messages: stockMessages[i].size,
                previousHourMessages: stockMessagesPreviousHour[i].size,
                previousDayMessages: previousDayMessages[i].size,
                currentDayMessages: currentDayMessages[i].size
            }
        });

        const stockMessagesDataString = stockMessagesData.map(stock => {
            const hourChange = ((stock.messages - stock.previousHourMessages) / stock.previousHourMessages * 100);
            const dayChange = ((stock.currentDayMessages - stock.previousDayMessages) / stock.previousDayMessages * 100);

            const hourChangeEmoji = hourChange >= 0 ? "<:yes:1090051438828326912>" : "<:no:1090051727732002907>";
            const dayChangeEmoji = dayChange >= 0 ? "<:yes:1090051438828326912>" : "<:no:1090051727732002907>";

            return `${stock.emoji} \`${stock.stock}\` - <#${stock.id}>\n` +
               `**${stock.messages.toLocaleString()}** messages in the last hour (**${hourChange.toFixed(2)}% change ${hourChangeEmoji}**)\n` +
               `**${stock.currentDayMessages.toLocaleString()}** messages in the current day (**${dayChange.toFixed(2)}% change ${dayChangeEmoji}**)`;
        }).join("\n\n");

        await stockUpdates.send(`## Channel Activity Report - \`${initTime.toISOString()}\`**\n\n${stockMessagesDataString}`);

        console.log("Stocks checked");
        // Repeat in 1 hour intervals
        setTimeout(() => {
            this.execute(client, services, ...params);
        }, 3600000); // 1 hour in milliseconds
    }
}