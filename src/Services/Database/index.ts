/*
 * Main database for Bot Bilby.
 */

import * as mongoDB from "mongodb";
import * as logger from "../../Logger";

export default class Database {
    public collections: DatabaseCollections = {};
    
    constructor() {
        this.connect();
    }

    private async connect() {
        const client: mongoDB.MongoClient = new mongoDB.MongoClient(process.env.MONGO_URL);

        await client.connect();

        logger.command("Connected to MongoDB database.");

        const databases: Databases = {
            muteroulette: client.db("muteroulette"),
            guess: client.db("guessLeaders")
        }

        this.collections.muteroulette = databases.muteroulette.collection("users");
        this.collections.guess = databases.guess.collection("leaders");
    }
}

interface Databases {
    muteroulette: mongoDB.Db,
    guess: mongoDB.Db
}

export interface DatabaseCollections {
    muteroulette?: mongoDB.Collection,
    guess?: mongoDB.Collection
}