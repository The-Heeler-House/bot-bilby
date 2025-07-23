/*
 * Main database for Bot Bilby.
 */

import * as mongoDB from "mongodb";
import * as logger from "../../logger";
import * as dotenv from "dotenv";
import KeepyUppyData from "./models/keepyUppy";
import Trigger from "./models/trigger"
import MuteRoulette from "./models/muteroulette"
import SpamDetection from "./models/spamDetection";
import RandomPicker from "./models/randomPicker";
dotenv.config();

export default class DatabaseService {
    public collections: DatabaseCollections = {};
    
    constructor() {
        this.connect();
    }

    private async connect() {
        const client: mongoDB.MongoClient = new mongoDB.MongoClient(process.env.MONGO_URL);

        await client.connect();

        logger.command("Connected to MongoDB database.");

        const databases = {
            bilby: client.db("bilby")
        }

        const collections: (keyof DatabaseCollections)[] = [
            "botCharacters",
            "muteroulette",
            "guess",
            "triggers",
            "guessWho",
            "oldGuessWho",
            "mutemeData",
            "commandBlacklist",
            "keepyUppy",
            "spamDetection",
            "randomPicker"
        ]

        for (const collection of collections) {
            //? yes, i know there's an `any` there. fuck it lol.
            this.collections[collection] = databases.bilby.collection<any>(collection)
        }
    }
}

export interface DatabaseCollections {
    botCharacters?: mongoDB.Collection,
    muteroulette?: mongoDB.Collection<MuteRoulette>,
    guess?: mongoDB.Collection,
    triggers?: mongoDB.Collection<Trigger>,
    guessWho?: mongoDB.Collection,
    oldGuessWho?: mongoDB.Collection,
    mutemeData?: mongoDB.Collection,
    commandBlacklist?: mongoDB.Collection,
    keepyUppy?: mongoDB.Collection<KeepyUppyData>,
    spamDetection?: mongoDB.Collection<SpamDetection>,
    randomPicker?: mongoDB.Collection<RandomPicker>
}