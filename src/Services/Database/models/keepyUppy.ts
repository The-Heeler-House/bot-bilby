import { Snowflake } from "discord.js";

export default interface KeepyUppyData {
    channel: Snowflake,
    balloon_state: "off_ground" | "almost_on_ground" | "blown_by_fan" | "land_on_cup" | "popped"

    longestStreak: number,
    currentStreak: number
}