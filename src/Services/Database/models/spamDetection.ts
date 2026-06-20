import { Snowflake } from "discord.js";

export default interface SpamDetection {
    channel: Snowflake;
    window_ms: number;
    min_delta_ms: number;
    score_threshold: number;
    fast_msg_min_cnt: number;
}
