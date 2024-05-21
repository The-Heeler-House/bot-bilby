import { ObjectId } from "mongodb"

export default interface State {
    id?: ObjectId,
    joinGate: boolean
}