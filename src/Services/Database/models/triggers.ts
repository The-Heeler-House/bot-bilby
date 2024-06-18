import { ObjectId } from "mongodb";

export default interface Triggers {
    id?: ObjectId
    trigger: string,
    response: string,
    cooldown: number,
    meta: {
        uses: number
    }
}