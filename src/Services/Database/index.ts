/*
 * Main database for Bot Bilby.
 */

import * as mongoDB from "mongodb";
import * as logger from "../../logger";
import * as dotenv from "dotenv";
import KeepyUppyData from "./models/keepyUppy";
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

        this.collections.botCharacters = databases.bilby.collection("botCharacters");
        this.collections.muteroulette = databases.bilby.collection("muteroulette");
        this.collections.guess = databases.bilby.collection("guess");
        this.collections.triggers = databases.bilby.collection("triggers");
        this.collections.guessWho = databases.bilby.collection("guessWho");
        this.collections.oldGuessWho = databases.bilby.collection("oldGuessWho");
        this.collections.mutemeData = databases.bilby.collection("mutemeData");
        this.collections.commandBlacklist = databases.bilby.collection("commandBlacklist");
        this.collections.keepyUppy = databases.bilby.collection<KeepyUppyData>("keepyUppy");
    }
}

export interface DatabaseCollections {
    botCharacters?: mongoDB.Collection,
    muteroulette?: mongoDB.Collection,
    guess?: mongoDB.Collection,
    triggers?: mongoDB.Collection,
    guessWho?: mongoDB.Collection,
    oldGuessWho?: mongoDB.Collection,
    mutemeData?: mongoDB.Collection,
    commandBlacklist?: mongoDB.Collection,
    keepyUppy?: mongoDB.Collection<KeepyUppyData>
}