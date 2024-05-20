import { Snowflake } from "discord.js";
import { ObjectId } from "mongodb";

export default interface MuterouletteUser {
    id?: ObjectId
    user: Snowflake,
    numMutesTotal: number,
    numAllTotal: number,
    numStreak: number,
    numMaxStreak: number,
    lastTime: Date,
    powerUps: string[],
    mutePercentage: number
}