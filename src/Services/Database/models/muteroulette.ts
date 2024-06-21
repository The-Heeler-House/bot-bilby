import { Snowflake } from "discord.js";

export default interface MuterouletteUser {
    user: Snowflake,
    numMutesTotal: number,
    numAllTotal: number,
    numStreak: number,
    numMaxStreak: number,
    lastTime: Date,
    powerUps: string[],
    mutePercentage: number
}