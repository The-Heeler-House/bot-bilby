import { ObjectId } from "mongodb";

export default interface BotCharacter {
    id?: ObjectId
    name: string,
    avatar: string
}