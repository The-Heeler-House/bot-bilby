import { ObjectId } from "mongodb";

export default interface PlaceArtwork {
    id?: ObjectId
    name: string,
    fileName: string,
    lastModified: Date,
    x: number,
    y: number
}