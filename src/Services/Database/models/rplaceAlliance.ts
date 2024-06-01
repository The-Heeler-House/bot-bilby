import { Snowflake } from "discord.js";
import { ObjectId } from "mongodb";

export default interface rplaceAlliance {
    id?: ObjectId
    name: string,
    templates?: Template[],
    enduTemplate?: string,
    inviteUrl: string,
    theirDiplos: Snowflake[],
    ourDiplos: Snowflake[],
    ticket: Snowflake,
}

export interface Template {
    name: string,
    source: string,
    x: number,
    y: number,
    custom: boolean,
}