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

        const databases = {
            bilby: client.db("bilby")
        }

        this.collections.state = databases.bilby.collection("state");
        this.collections.botCharacters = databases.bilby.collection("botCharacters");
        this.collections.muteroulette = databases.bilby.collection("muteroulette");
        this.collections.guess = databases.bilby.collection("guessLeaders");
    }
}

export interface DatabaseCollections {
    state?: mongoDB.Collection
    botCharacters?: mongoDB.Collection,
    muteroulette?: mongoDB.Collection,
    guess?: mongoDB.Collection
}