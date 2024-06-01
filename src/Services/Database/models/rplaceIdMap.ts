import { Snowflake } from "discord.js";
import { ObjectId } from "mongodb";

export default interface rplaceIdMap {
    id?: ObjectId
    discordId: Snowflake,
    rplaceId: string
}
