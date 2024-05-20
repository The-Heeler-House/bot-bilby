import { ObjectId } from "mongodb";

export default interface GuessUser {
    id?: ObjectId
    user: string,
    score: number
}