import { ObjectId } from "mongodb"

export default interface Trigger {
    trigger: string,
    response: string,
    cooldown: number,
    attachmentIds: ObjectId[]
    meta: {
        uses: number
    }
}