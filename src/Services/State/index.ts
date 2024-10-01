import { GuildEmoji, Message, ReactionEmoji, Snowflake } from "discord.js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const STATE_PATH = path.join(__dirname, "../../../state.json");

const defaultState: State = {
    joinGate: true,
    altGate: false,
    trackedMessages: new Map<string, TrackedMessage>(),
    ignoredChannels: [],
    pagedUsers: [],
    detectSwearInMedia: true,
    swearWords: [
        "Arse", "Fatass", "Fatasses", "Fetish", "Niggr",
        "Nigr", "anal", "arsehole", "arseholes", "arsenigga",
        "arseniggas", "arsenigger", "arseniggers", "ass", "assnigga",
        "assniggas", "assnigger", "assniggers", "bastard", "bastards",
        "beaner", "beaners", "bellend", "bitch", "bitchass",
        "bitchblower", "bitched", "bitches", "bitching", "bitchs",
        "bitchtits", "bitchy", "childfucker", "childfuckers", "chink",
        "chinkies", "chinks", "chinky", "clitfucker", "clitfuckers",
        "cock", "cocks", "cocksucker", "cocksuckers", "cum",
        "cumdumpster", "cumdumpsters", "cumduzzler", "cumduzzlers",
        "cumming", "cums", "cunt", "cunter", "cunters",
        "cuntgrabber", "cuntgrabbers", "cuntlicker", "cuntlickers", "cunts",
        "dick", "dickhead", "dicks", "dicksucker", "dicksuckers",
        "dickweasel", "dickweasels", "dickweed", "dickweeds", "dumbarse",
        "dumbarses", "dumbass", "dune coon", "dune coons", "dunecoon",
        "dunecoons", "dyke", "dykes", "fag", "faggot",
        "faggoting", "faggots", "faggy", "fags", "fat fuck",
        "fatarse", "fatarses", "fatfuck", "fuck", "fucka",
        "fuckaz", "fucked", "fucker", "fuckers", "fuckhead",
        "fuckheads", "fuckin'", "fucking", "fucks", "fucktard",
        "fucktardis", "fucktards", "gaydo", "gaydoes", "gaydos",
        "gook", "gooks", "gringo", "gringoes", "gringos",
        "jizz", "joto", "kaffir", "kaffirs", "kike",
        "lezzie", "lezzies", "lezzo", "lezzos", "mcfaggot",
        "motherfucker", "motherfuckers", "motherfucking", "motherfuckin’", "niga",
        "nigaz", "niger", "nigerz", "nigga", "niggas",
        "niggaz", "nigger", "niggers", "nigguh", "niggur",
        "niggurz", "nigr", "nigrs", "nigrz", "niguh",
        "paki", "pakis", "poonani", "porn", "porno",
        "pornos", "prick", "queers", "r 34", "r34",
        "rape", "retard", "retarded", "sand nigga", "sand niggas",
        "sand nigger", "sand niggers", "sandnigga", "sandniggas", "sandnigger",
        "sandniggers", "School shooter", "School shooting", "shat", "sheep shagger",
        "sheep shaggers", "sheepshagger", "sheepshaggers", "shit", "shitaz",
        "shithead", "shitheads", "shithouse", "shithouses", "shitpost",
        "shitposter", "shitposters", "shitposting", "shitpostin’", "shitposts",
        "shits", "shitted", "shitter", "shitters", "shittier",
        "shittiest", "shitting", "shittin’", "shitty", "slut",
        "sluts", "snow nigga", "snow niggas", "snow niggaz", "snow nigger",
        "snow niggers", "snowniggas", "snowniggaz", "snownigger", "snowniggers",
        "tacohead", "tacoheads", "thot", "thotbot", "thotbots",
        "thots", "uncle fucka", "uncle fuckaz", "uncle fucker", "uncle fuckers",
        "unclefucka", "unclefuckaz", "unclefucker", "unclefuckers", "wank",
        "wanked", "wanking", "wanks", "wetback", "wetbacks",
        "white cracka", "white crackas", "white crackaz", "white cracker", "white crackers",
        "whitecracka", "whitecrackaz", "whitecracker", "whitecrackers", "whore",
        "whores", "whoresons", "whorseson", "zipperhead", "zipperheads"
    ],
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
        trackedReactions: new Map()
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
    detectSwearInMedia: boolean
    swearWords: string[]
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

export interface VolatileState {
    trackedReactions: Map<string, TrackedReaction>
}

export interface TrackedReaction {
    authorId: Snowflake,
    emote: ReactionEmoji | GuildEmoji,
    timestamp: number
}