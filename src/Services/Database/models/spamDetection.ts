import { Snowflake } from "discord.js";

export default interface SpamDetection {
    channel: Snowflake,
    window_ms: number,
    min_delta_ms: number,
    max_recent: number,
    score_threshold: number
}