import Denque from "denque";
import {
    GuildEmoji,
    Message,
    PrivateThreadChannel,
    PublicThreadChannel,
    ReactionEmoji,
    Snowflake,
} from "discord.js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { DATA_RETENTION_DAYS } from "../../constants";
import * as logger from "../../logger";

const STATE_PATH = path.join(__dirname, "../../../state.json");

const RETENTION_MS = DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = 60 * 60 * 1000; // Hourly.

const defaultState: State = {
    joinGate: 5, // 5 days by default
    altGate: false,
    trackedMessages: new Map<string, TrackedMessage>(),
    ignoredChannels: [],
    pagedUsers: [],
    useS3: false,
};

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
            guessWhoSessions: new Map(),
        },
        spamDetection: {
            shouldLog: {},
            log: {},

            sentAlert: {},
        },
    };

    constructor() {
        if (existsSync(STATE_PATH)) {
            this.state = JSON.parse(
                readFileSync(STATE_PATH).toString(),
                this.reviver,
            ) as State;

            this.setDefaultState(defaultState, this.state);
            this.save();
        } else {
            // Default values for the state are defined here.
            this.state = defaultState;

            this.save();
        }

        this.pruneExpiredData();
        // Bilby stays up for weeks at a time, so expiry cannot only happen at
        // startup or the window would be meaningless on a long-lived process.
        setInterval(() => this.pruneExpiredData(), PRUNE_INTERVAL_MS).unref();
    }

    /**
     * Drops persisted data that has aged past the retention window documented
     * in PRIVACY.md.
     *
     * Tracked messages keep a snapshot of a linked message's content and its
     * author, so they are user data and must not be held indefinitely.
     *
     * @returns the number of entries removed.
     */
    public pruneExpiredData(): number {
        const cutoff = Date.now() - RETENTION_MS;
        let removed = 0;

        for (const [id, tracked] of this.state.trackedMessages) {
            // Entries written before retention existed carry no timestamp.
            // Treat those as expired rather than keeping them forever.
            if ((tracked?.timestamp ?? 0) < cutoff) {
                this.state.trackedMessages.delete(id);
                removed++;
            }
        }

        if (removed > 0) {
            logger.command(
                `Pruned ${removed} tracked message(s) older than ${DATA_RETENTION_DAYS} days.`,
            );
            this.save();
        }

        return removed;
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
        if (value instanceof Map) {
            return {
                dataType: "Map",
                value: Array.from(value.entries()), // or with spread: value: [...value]
            };
        } else {
            return value;
        }
    }

    // Used in JSON.parse to handle conversion to certain types.
    private reviver(key: string, value: any) {
        if (typeof value === "object" && value !== null) {
            if (value.dataType === "Map") {
                return new Map(value.value);
            }
        }
        return value;
    }
}

export interface State {
    joinGate: number;
    altGate: boolean;
    trackedMessages: Map<string, TrackedMessage>;
    ignoredChannels: Snowflake[];
    pagedUsers: Snowflake[];
    useS3: boolean;
}

export interface TrackedMessage {
    originalMessage: Message;
    originalLink: string;
    guildId: string;
    channelId: string;
    messageId: string;
    content: string;
    author: string;
    timestamp: number; // Add timestamp to track when the message was linked
}

export interface GuessWhoSession {
    thread: PrivateThreadChannel | PublicThreadChannel;
    channel: string;
    score: number;
}

export interface VolatileState {
    trackedReactions: Map<string, TrackedReaction>;
    slashCommandData: {
        guessWhoSessions: Map<string, GuessWhoSession>;
    };
    spamDetection: {
        shouldLog: { [id: string]: boolean };
        log: {
            [id: string]: {
                timestamp: number;
                channelId: string;
                authorId: string;
                flag1: number;
                flag2: number;
                flag3: number;
                flag4: number;
                score: number;
                score1: number;
                score2: number;
                channel_buffer_length: number;
                user_buffer_length: number;
            }[];
        };

        sentAlert: { [id: string]: boolean };
    };
}

export interface TrackedReaction {
    authorId: Snowflake;
    emote: ReactionEmoji | GuildEmoji;
    timestamp: number;
}
