/*
 * Main database for Bot Bilby.
 */

import * as mongoDB from "mongodb";
import * as logger from "../../logger";
import * as dotenv from "dotenv";
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
            bilby: client.db("bilby"),
            april2025: client.db("april2025")
        }

        this.collections.botCharacters = databases.bilby.collection("botCharacters");
        this.collections.muteroulette = databases.bilby.collection("muteroulette");
        this.collections.guess = databases.bilby.collection("guess");
        this.collections.triggers = databases.bilby.collection("triggers");
        this.collections.guessWho = databases.bilby.collection("guessWho");
        this.collections.oldGuessWho = databases.bilby.collection("oldGuessWho");
        this.collections.mutemeData = databases.bilby.collection("mutemeData");
        this.collections.commandBlacklist = databases.bilby.collection("commandBlacklist");

        // april fools 2025
        this.collections.stocks = databases.april2025.collection("stocks");
        this.collections.users = databases.april2025.collection("users");
        this.collections.trades = databases.april2025.collection("trades");
        this.collections.changes = databases.april2025.collection("changes");
        this.collections.settings = databases.april2025.collection("settings");
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

    stocks?: mongoDB.Collection,
    users?: mongoDB.Collection,
    trades?: mongoDB.Collection,
    changes?: mongoDB.Collection,
    settings?: mongoDB.Collection
}