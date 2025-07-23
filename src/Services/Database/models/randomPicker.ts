import { Snowflake } from "discord.js";

export default interface RandomPicker {
    picker_id: string
    winning_message: string
    duration: number,
    enrollments: Snowflake[]
}