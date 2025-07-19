import { Snowflake } from "discord.js";

export default interface SpamDetection {
    channel: Snowflake,
    min_message_cnt: number,
    min_message_time: number,
    min_media_cnt: number,
    min_media_sample_size: number
}