import { Message } from "discord.js";
import { existsSync, readFileSync } from "fs";
import path from "path";

const STATE_PATH = path.join(__dirname, "../../Assets/state.json");

export default class StateService {
    public readonly state: State;

    constructor() {
        if (existsSync(STATE_PATH)) {
            this.state = JSON.parse(readFileSync(STATE_PATH).toString());
        } else {
            // Default values for the state are defined here.
            this.state = {
                joinGate: true,
                trackedMessages: new Map()
            }
        }
    }

    set(key: string, value: any) {
        this.state[key] = value;
    }
}

export interface State {
    joinGate: boolean
    trackedMessages: Map<string, TrackedMessage>
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