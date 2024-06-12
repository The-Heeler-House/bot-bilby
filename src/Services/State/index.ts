import { Message, Snowflake } from "discord.js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const STATE_PATH = path.join(__dirname, "../../../state.json");

export default class StateService {
    public state: State;

    constructor() {
        if (existsSync(STATE_PATH)) {
            this.state = JSON.parse(readFileSync(STATE_PATH).toString());
        } else {
            // Default values for the state are defined here.
            this.state = {
                joinGate: true,
                trackedMessages: new Map(),
                pagedUsers: []
            }

            this.save();
        }
    }

    save() {
        writeFileSync(STATE_PATH, JSON.stringify(this.state, null, 4));
    }
}

export interface State {
    joinGate: boolean,
    trackedMessages: Map<string, TrackedMessage>,
    pagedUsers: Snowflake[];
}

export interface TrackedMessage {
    originalMessage: Message,
    originalLink: string,
    guildId: string,
    channelId: string,
    messageId: string,
    content: string,
    author: string,
    timestamp: number, // Add timestamp to track when the message was linked
};