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
import GuessLeaderboard from "./models/guess"
import { WaffleUser } from "../WaffleHouse/models/waffleUser";
import { WaffleCard } from "../WaffleHouse/models/waffleCard";
import { WaffleGlaze } from "../WaffleHouse/models/waffleGlaze";
import { WaffleAuction } from "../WaffleHouse/models/waffleAuction";
import { WaffleMinigame } from "../WaffleHouse/models/waffleMinigame";
import { WafflePrompt } from "../WaffleHouse/models/waffleMinigame";
import { WaffleFrenchToast, WaffleTuning, WaffleEventState } from "../WaffleHouse/models/waffleEventState";
import { WaffleSpawn } from "../WaffleHouse/models/waffleSpawn";
import { WaffleTestRun } from "../WaffleHouse/models/waffleTestRun";
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
            "waffleUsers",
            "waffleCards",
            "waffleGlazes",
            "waffleAuctions",
            "waffleMinigames",
            "wafflePromptQueue",
            "waffleFrenchToast",
            "waffleTuning",
            "waffleEventState",
            "waffleSpawns",
            "waffleTestRuns",
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
    guess?: mongoDB.Collection<GuessLeaderboard>,
    triggers?: mongoDB.Collection<Trigger>,
    guessWho?: mongoDB.Collection,
    oldGuessWho?: mongoDB.Collection,
    mutemeData?: mongoDB.Collection,
    commandBlacklist?: mongoDB.Collection,
    keepyUppy?: mongoDB.Collection<KeepyUppyData>,
    spamDetection?: mongoDB.Collection<SpamDetection>,
    waffleUsers?: mongoDB.Collection<WaffleUser>,
    waffleCards?: mongoDB.Collection<WaffleCard>,
    waffleGlazes?: mongoDB.Collection<WaffleGlaze>,
    waffleAuctions?: mongoDB.Collection<WaffleAuction>,
    waffleMinigames?: mongoDB.Collection<WaffleMinigame>,
    wafflePromptQueue?: mongoDB.Collection<WafflePrompt>,
    waffleFrenchToast?: mongoDB.Collection<WaffleFrenchToast>,
    waffleTuning?: mongoDB.Collection<WaffleTuning>,
    waffleEventState?: mongoDB.Collection<WaffleEventState>,
    waffleSpawns?: mongoDB.Collection<WaffleSpawn>,
    waffleTestRuns?: mongoDB.Collection<WaffleTestRun>,
}
