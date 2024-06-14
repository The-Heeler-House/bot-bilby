import { UUID } from "crypto";
import { Snowflake } from "discord.js";
import { ObjectId } from "mongodb";

export default interface PlaceIdMap {
    id?: ObjectId
    discord: Snowflake,
    blueyplace: UUID,
    private: boolean
}