import { ObjectId } from "mongodb";

export default interface PlaceAlliance {
    id?: ObjectId
    name: string,
    url: string
}