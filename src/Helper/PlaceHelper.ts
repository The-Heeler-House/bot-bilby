import { Canvas, CanvasRenderingContext2D, Image } from "canvas";
import PlaceArtwork from "../Services/Database/models/placeArtwork";
import PlaceAlliance from "../Services/Database/models/placeAlliance";
import { PlaceState } from "../Services/State";
import * as child_process from "child_process";

export function getFactionName() {
    return "bluey";
}

export function buildTemplate(artworks: PlaceArtwork[], alliances: PlaceAlliance[], state: PlaceState, callback: any) {
    const buildProcess = child_process.fork(`${__dirname}/../Jobs/buildTemplate.js`);
    buildProcess.send({ artworks, alliances, state });

    buildProcess.on("message", (data) => {
        callback(data);
    });
}