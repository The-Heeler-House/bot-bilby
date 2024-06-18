import { ObjectId } from "mongodb";

export default interface AutoResponse {
    id?: ObjectId
    trigger: string,
    response: string,
    cooldown: number
}