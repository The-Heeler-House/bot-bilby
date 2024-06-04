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
            rplace: client.db("rplace")
        }

        this.collections.botCharacters = databases.bilby.collection("botCharacters");
        this.collections.muteroulette = databases.bilby.collection("muteroulette");
        this.collections.guess = databases.bilby.collection("guess");
        this.collections.rplaceIdMap = databases.rplace.collection("rplaceIdMap");
        this.collections.rplaceAlliances = databases.rplace.collection("rplaceAlliances");
        this.collections.rplaceTemplates = databases.rplace.collection("rplaceTemplates");
    }
}

export interface DatabaseCollections {
    botCharacters?: mongoDB.Collection,
    muteroulette?: mongoDB.Collection,
    guess?: mongoDB.Collection,
    rplaceIdMap?: mongoDB.Collection
    rplaceAlliances?: mongoDB.Collection
    rplaceTemplates?: mongoDB.Collection
}