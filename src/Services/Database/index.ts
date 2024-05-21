/*
 * Main database for Bot Bilby.
 */

import * as mongoDB from "mongodb";
import * as logger from "../../Logger";
import * as dotenv from "dotenv";
dotenv.config();

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
            bilby: client.db("bilby"),
        }

        this.collections.muteroulette = databases.bilby.collection("muteroulette");
        this.collections.guess = databases.bilby.collection("guess");
    }
}

interface Databases {
    bilby: mongoDB.Db,
}

export interface DatabaseCollections {
    muteroulette?: mongoDB.Collection,
    guess?: mongoDB.Collection
}