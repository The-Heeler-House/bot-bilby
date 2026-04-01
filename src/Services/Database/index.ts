/*
 * Main database for Bot Bilby.
 */

import * as mongoDB from "mongodb";
import * as logger from "../../logger";
import * as dotenv from "dotenv";
import KeepyUppyData from "./models/keepyUppy";
import Trigger from "./models/trigger";
import MuteRoulette from "./models/muteroulette";
import SpamDetection from "./models/spamDetection";
import GuessLeaderboard from "./models/guess";
dotenv.config();

// Add missing types for collections
import BotCharacter from "./models/botCharacter";

export default class DatabaseService {
    public collections: DatabaseCollections = {};
    private _connectPromise: Promise<void>;

    constructor() {
        this._connectPromise = this.connect();
    }

    public async waitForConnection(): Promise<void> {
        return this._connectPromise;
    }

    private async connect() {
        try {
            const client: mongoDB.MongoClient = new mongoDB.MongoClient(
                process.env.MONGO_URL,
            );

            await client.connect();

            logger.command("Connected to MongoDB database.");

            const databases = {
                bilby: client.db("bilby"),
            };

            // Use explicit types for each collection
            this.collections.botCharacters =
                databases.bilby.collection<BotCharacter>("botCharacters");
            this.collections.muteroulette =
                databases.bilby.collection<MuteRoulette>("muteroulette");
            this.collections.guess =
                databases.bilby.collection<GuessLeaderboard>("guess");
            this.collections.triggers =
                databases.bilby.collection<Trigger>("triggers");
            this.collections.guessWho =
                databases.bilby.collection<any>("guessWho");
            this.collections.oldGuessWho =
                databases.bilby.collection<any>("oldGuessWho");
            this.collections.mutemeData =
                databases.bilby.collection<any>("mutemeData");
            this.collections.commandBlacklist =
                databases.bilby.collection<any>("commandBlacklist");
            this.collections.keepyUppy =
                databases.bilby.collection<KeepyUppyData>("keepyUppy");
            this.collections.spamDetection =
                databases.bilby.collection<SpamDetection>("spamDetection");
        } catch (error) {
            logger.error("Failed to connect to MongoDB database.", error);
            throw error;
        }
    }
}

export interface DatabaseCollections {
    botCharacters?: mongoDB.Collection<import("./models/botCharacter").default>;
    muteroulette?: mongoDB.Collection<MuteRoulette>;
    guess?: mongoDB.Collection<GuessLeaderboard>;
    triggers?: mongoDB.Collection<Trigger>;
    guessWho?: mongoDB.Collection<any>;
    oldGuessWho?: mongoDB.Collection<any>;
    mutemeData?: mongoDB.Collection<any>;
    commandBlacklist?: mongoDB.Collection<any>;
    keepyUppy?: mongoDB.Collection<KeepyUppyData>;
    spamDetection?: mongoDB.Collection<SpamDetection>;
}
