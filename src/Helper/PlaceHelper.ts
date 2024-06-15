import PlaceArtwork from "../Services/Database/models/placeArtwork";
import PlaceAlliance from "../Services/Database/models/placeAlliance";
import { PlaceState } from "../Services/State";
import * as child_process from "child_process";
import { Services } from "../Services";

export function getFactionName() {
    return "bluey";
}

export function generateId() {
    let characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
    let output = [];

    for (let i = 0; i < 5; i++) {
        output.push(characters[Math.floor(Math.random() * characters.length)]);
    }

    return output.join("");
}

export async function buildAndUploadTemplate(services: Services, standaloneCallback: any, allianceCallback: any, callback: any) {
    buildTemplate(
        await services.database.collections.place.artworks.find().toArray() as unknown as PlaceArtwork[],
        await services.database.collections.place.alliances.find().toArray() as unknown as PlaceAlliance[],
        services.state.state.place,
        async (data: BuiltTemplates) => {
            // Standalone
            if (data.standalone.diff === null) {
                // Do a full update
                services.state.state.place.current_template_id.standalone = generateId();

                let standaloneBuffer = Buffer.from(data.standalone.template.data);
                await services.placeCDN.putObject("templates", "bluey/full/" + services.state.state.place.current_template_id.standalone + ".png", standaloneBuffer, standaloneBuffer.byteLength);
                await services.placeRealtime.publish("bluey", "updates", {
                    type: "full",
                    id: services.state.state.place.current_template_id.standalone
                }, true);
                services.state.save();
                standaloneCallback("full", services.state.state.place.current_template_id.standalone);
            } else if (data.standalone.diff.dataURL !== null) {
                // Diff update
                let previousId = new String(services.state.state.place.current_template_id.standalone);
                services.state.state.place.current_template_id.standalone = generateId();

                let buffer = Buffer.from(data.standalone.template.data);
                await services.placeCDN.putObject("templates", "bluey/full/" + services.state.state.place.current_template_id.standalone + ".png", buffer, buffer.byteLength);
                await services.placeRealtime.publish("bluey", "updates", {
                    type: "diff",
                    previous_id: previousId,
                    current_id: services.state.state.place.current_template_id.standalone,
                    x: data.standalone.diff.x,
                    y: data.standalone.diff.y,
                    raw: false,
                    diff: data.standalone.diff.dataURL
                }, true);
                services.state.save();
                standaloneCallback("diff", services.state.state.place.current_template_id.standalone);
            }

            // Allies
            if (data.allies.diff === null) {
                // Do a full update
                services.state.state.place.current_template_id.allies = generateId();

                let buffer = Buffer.from(data.allies.template.data);
                await services.placeCDN.putObject("templates", "bluey_allies/full/" + services.state.state.place.current_template_id.allies + ".png", buffer, buffer.byteLength);
                await services.placeRealtime.publish("bluey_allies", "updates", {
                    type: "full",
                    id: services.state.state.place.current_template_id.allies
                }, true);
                services.state.save();
                allianceCallback("full", services.state.state.place.current_template_id.allies, data.allies.missing);
            } else if (data.allies.diff.dataURL !== null) {
                // Diff update
                let previousId = new String(services.state.state.place.current_template_id.allies);
                services.state.state.place.current_template_id.allies = generateId();

                let buffer = Buffer.from(data.allies.template.data);
                await services.placeCDN.putObject("templates", "bluey_allies/full/" + services.state.state.place.current_template_id.allies + ".png", buffer, buffer.byteLength);
                await services.placeRealtime.publish("bluey_allies", "updates", {
                    type: "diff",
                    previous_id: previousId,
                    current_id: services.state.state.place.current_template_id.allies,
                    x: data.allies.diff.x,
                    y: data.allies.diff.y,
                    raw: false,
                    diff: data.allies.diff.dataURL
                }, true);
                services.state.save();
                allianceCallback("diff", services.state.state.place.current_template_id.allies, data.allies.missing);
            }

            callback();
        }
    )
}

export function buildTemplate(artworks: PlaceArtwork[], alliances: PlaceAlliance[], state: PlaceState, callback: any) {
    const buildProcess = child_process.fork(`${__dirname}/../Jobs/buildTemplate.js`);
    buildProcess.send({ artworks, alliances, state });

    buildProcess.on("message", (data: BuiltTemplates) => {
        callback(data);
    });
}

export interface BuiltTemplates {
    standalone: BuiltTemplate,
    allies: BuiltTemplate
}

export interface BuiltTemplate {
    template: { type: "Buffer", data: number[] },
    missing: string[],
    diff: { buffer: { type: "Buffer", data: number[] }, dataURL: string, x: number, y: number }
}