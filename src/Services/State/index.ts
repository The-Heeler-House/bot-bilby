import Denque from "denque";
import { GuildEmoji, Message, PrivateThreadChannel, PublicThreadChannel, ReactionEmoji, Snowflake } from "discord.js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const STATE_PATH = path.join(__dirname, "../../../state.json");

const defaultState: State = {
    joinGate: true,
    altGate: false,
    trackedMessages: new Map<string, TrackedMessage>(),
    ignoredChannels: [],
    pagedUsers: [],
    useS3: false
}

export default class StateService {
    /**
     * Persistent state that is retained between restarts.
     * Useful for long-term general information storage (think long-term memory).
     */
    public state: State;

    /**
     * Volatile state which does not get retained between restarts.
     * Useful for short-term general information storage (think short-term memory).
     */
    public volatileState: VolatileState = {
        trackedReactions: new Map(),
        slashCommandData: {
            guessWhoSessions: new Map()
        },
        spamDetection: {
            messageLog: {},
            mediaLog: {},

            sentAlert: {}
        }
    };

    constructor() {
        if (existsSync(STATE_PATH)) {
            this.state = JSON.parse(readFileSync(STATE_PATH).toString(), this.reviver) as State;

            this.setDefaultState(defaultState, this.state);
            this.save();
        } else {
            // Default values for the state are defined here.
            this.state = defaultState

            this.save();
        }
    }

    save() {
        writeFileSync(STATE_PATH, JSON.stringify(this.state, this.replacer, 4));
    }

    private setDefaultState(defaultStateObject: State, target: State) {
        for (let key in defaultStateObject) {
            if (defaultStateObject[key] instanceof Object) {
                this.setDefaultState(defaultStateObject[key], target[key]);
                continue;
            }

            if (key === "__proto__" || key === "constructor") continue;
            if (target[key] == undefined) target[key] = defaultStateObject[key];
        }
    }

    // Used in JSON.stringify to handle conversion of certain types.
    private replacer(key: string, value: any) {
        if(value instanceof Map) {
            return {
                dataType: 'Map',
                value: Array.from(value.entries()), // or with spread: value: [...value]
            };
        } else {
            return value;
        }
    }

    // Used in JSON.parse to handle conversion to certain types.
    private reviver(key: string, value: any) {
        if(typeof value === 'object' && value !== null) {
            if (value.dataType === 'Map') {
                return new Map(value.value);
            }
        }
        return value;
    }
}

export interface State {
    joinGate: boolean,
    altGate: boolean,
    trackedMessages: Map<string, TrackedMessage>,
    ignoredChannels: Snowflake[];
    pagedUsers: Snowflake[];
    useS3: boolean
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

export interface GuessWhoSession {
    thread: PrivateThreadChannel | PublicThreadChannel,
    channel: string,
    score: number
}

export interface VolatileState {
    trackedReactions: Map<string, TrackedReaction>,
    slashCommandData: {
        guessWhoSessions: Map<string, GuessWhoSession>
    },
    spamDetection: {
        messageLog: { [id: string]: Denque<number> }
        mediaLog: { [id: string]: { queue: Denque<number>, cnt: number } }

        sentAlert: { [id: string]: boolean }
    }
}

export interface TrackedReaction {
    authorId: Snowflake,
    emote: ReactionEmoji | GuildEmoji,
    timestamp: number
}