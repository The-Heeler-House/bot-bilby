/*
 * Main database for Bot Bilby.
 */

import * as mongoDB from "mongodb";
import * as logger from "../../logger";
import * as dotenv from "dotenv";
dotenv.config();

export default class DatabaseService {
    public collections: DatabaseCollections = { rplace: {} };
    
    constructor() {
        this.connect();
    }

    private async connect() {
        const client: mongoDB.MongoClient = new mongoDB.MongoClient(process.env.MONGO_URL);

        await client.connect();

        logger.command("Connected to MongoDB database.");

        const databases = {
            bilby: client.db("bilby"),
            place: client.db("place")
        }

        this.collections.botCharacters = databases.bilby.collection("botCharacters");
        this.collections.muteroulette = databases.bilby.collection("muteroulette");
        this.collections.guess = databases.bilby.collection("guess");
        this.collections.rplace = {
            idMap: databases.place.collection("idMap"),
            alliances: databases.place.collection("alliances"),
            artworks: databases.place.collection("artworks")
        }
    }
}

export interface DatabaseCollections {
    botCharacters?: mongoDB.Collection,
    muteroulette?: mongoDB.Collection,
    guess?: mongoDB.Collection,
    rplace?: {
        idMap?: mongoDB.Collection,
        alliances?: mongoDB.Collection,
        artworks?: mongoDB.Collection
    }
}