// Responsible for turning EventEmmitter-powered tasks into asyncronous code.

import { Channel, Collection, CollectorFilter, Message, MessageCollectorOptions, TextChannel } from "discord.js";


export function getUpcomingMessage(channel: TextChannel, filter: CollectorFilter<[Message<boolean>, Collection<string, Message<boolean>>]>, timeout: number): Promise<Message> {
    return new Promise((result, reject) => {
        let collector = channel.createMessageCollector({ filter, time: timeout, max: 1 });
        
        collector.on("collect", message => {
            result(message);
            collector.stop();
        });

        collector.on("end", collected => {
            if (collected.size == 0) reject(new CollectionTimeoutError());
        });
    });
}

export class CollectionTimeoutError extends Error {
    constructor() {
        super();
    }
}