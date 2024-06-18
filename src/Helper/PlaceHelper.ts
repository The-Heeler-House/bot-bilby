import PlaceArtwork from "../Services/Database/models/placeArtwork";
import PlaceAlliance from "../Services/Database/models/placeAlliance";
import { PlaceState } from "../Services/State";
import * as child_process from "child_process";
import { Services } from "../Services";
import { TemplateManagerTemplate } from "./PlaceTemplateManagerHelper";

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
            let didUpdate = false;
            // Standalone
            console.log(data);

            if (data.standalone.diff === null) {
                // Do a full update
                services.state.state.place.current_template_id.standalone = generateId();

                let buffer = Buffer.from(data.standalone.template.buffer.data);
                let jsonBuffer = Buffer.from(JSON.stringify(data.standalone.template.templateManagerJSON));
                await services.placeCDN.putObject("templates", "bluey/full/" + services.state.state.place.current_template_id.standalone + ".png", buffer, buffer.byteLength);
                await services.placeCDN.putObject("templates", "bluey/template.json", jsonBuffer, jsonBuffer.byteLength);
                await services.placeRealtime.publish("bluey", "updates", {
                    type: "full",
                    id: services.state.state.place.current_template_id.standalone
                }, true);
                services.state.save();
                standaloneCallback("full", services.state.state.place.current_template_id.standalone);
                didUpdate = true;
            } else if (data.standalone.diff.dataURL !== null) {
                // Diff update
                let previousId = new String(services.state.state.place.current_template_id.standalone);
                services.state.state.place.current_template_id.standalone = generateId();

                let buffer = Buffer.from(data.standalone.template.buffer.data);
                let jsonBuffer = Buffer.from(JSON.stringify(data.standalone.template.templateManagerJSON));
                await services.placeCDN.putObject("templates", "bluey/full/" + services.state.state.place.current_template_id.standalone + ".png", buffer, buffer.byteLength);
                await services.placeCDN.putObject("templates", "bluey/template.json", jsonBuffer, jsonBuffer.byteLength);
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
                didUpdate = true;
            }

            // Allies
            if (data.allies.diff === null) {
                // Do a full update
                services.state.state.place.current_template_id.allies = generateId();

                let buffer = Buffer.from(data.allies.template.buffer.data);
                let jsonBuffer = Buffer.from(JSON.stringify(data.allies.template.templateManagerJSON));
                await services.placeCDN.putObject("templates", "bluey_allies/full/" + services.state.state.place.current_template_id.allies + ".png", buffer, buffer.byteLength);
                await services.placeCDN.putObject("templates", "bluey_allies/template.json", jsonBuffer, jsonBuffer.byteLength);
                await services.placeRealtime.publish("bluey_allies", "updates", {
                    type: "full",
                    id: services.state.state.place.current_template_id.allies
                }, true);
                services.state.save();
                allianceCallback("full", services.state.state.place.current_template_id.allies, data.allies.missing);
                didUpdate = true;
            } else if (data.allies.diff.dataURL !== null) {
                // Diff update
                let previousId = new String(services.state.state.place.current_template_id.allies);
                services.state.state.place.current_template_id.allies = generateId();

                let buffer = Buffer.from(data.allies.template.buffer.data);
                let jsonBuffer = Buffer.from(JSON.stringify(data.allies.template.templateManagerJSON));
                await services.placeCDN.putObject("templates", "bluey_allies/full/" + services.state.state.place.current_template_id.allies + ".png", buffer, buffer.byteLength);
                await services.placeCDN.putObject("templates", "bluey_allies/template.json", jsonBuffer, jsonBuffer.byteLength);
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
                didUpdate = true;
            }

            if (didUpdate) services.state.state.place.last_template_update_timestamp = new Date().toISOString();

            callback(didUpdate);
        }
    )
}

export function buildTemplate(artworks: PlaceArtwork[], alliances: PlaceAlliance[], state: PlaceState, callback: any) {
    const buildProcess = child_process.fork(`${__dirname}/../Jobs/buildTemplate.js`);
    buildProcess.send({ task: "full", artworks, alliances, state });

    buildProcess.on("message", (data: BuiltTemplates) => {
        callback(data);
    });
}

export async function resizeAndUpdateTemplate(top: number, left: number, bottom: number, right: number, services: Services, standaloneCallback: any, allianceCallback: any, callback: any) {
    resizeTemplate(top, left, bottom, right, services);

    buildPartialTemplate(
        await services.database.collections.place.artworks.find().toArray() as unknown as PlaceArtwork[],
        await services.database.collections.place.alliances.find().toArray() as unknown as PlaceAlliance[],
        services.state.state.place,
        async (data: BuiltTemplates) => {
            let previousStandaloneId = new String(services.state.state.place.current_template_id.standalone);
            services.state.state.place.current_template_id.standalone = generateId();

            let standaloneBuffer = Buffer.from(data.standalone.template.buffer.data);
            let standaloneJSONBuffer = Buffer.from(JSON.stringify(data.standalone.template.templateManagerJSON));
            await services.placeCDN.putObject("templates", "bluey/full/" + services.state.state.place.current_template_id.standalone + ".png", standaloneBuffer, standaloneBuffer.byteLength);
            await services.placeCDN.putObject("templates", "bluey/template.json", standaloneJSONBuffer, standaloneJSONBuffer.byteLength);
            await services.placeRealtime.publish("bluey", "updates", {
                type: "diff",
                previous_id: previousStandaloneId,
                current_id: services.state.state.place.current_template_id.standalone,
                resize: {
                    top, left, bottom, right
                }
            }, true);
            standaloneCallback(services.state.state.place.current_template_id.standalone);

            let previousAlliesId = new String(services.state.state.place.current_template_id.allies);
            services.state.state.place.current_template_id.allies = generateId();

            let alliesBuffer = Buffer.from(data.allies.template.buffer.data);
            let alliesJSONBuffer = Buffer.from(JSON.stringify(data.allies.template.templateManagerJSON));
            await services.placeCDN.putObject("templates", "bluey_allies/full/" + services.state.state.place.current_template_id.allies + ".png", alliesBuffer, alliesBuffer.byteLength);
            await services.placeCDN.putObject("templates", "bluey_allies/template.json", alliesJSONBuffer, alliesJSONBuffer.byteLength);
            await services.placeRealtime.publish("bluey_allies", "updates", {
                type: "diff",
                previous_id: previousAlliesId,
                current_id: services.state.state.place.current_template_id.allies,
                resize: {
                    top, left, bottom, right
                }
            }, true);
            allianceCallback(services.state.state.place.current_template_id.allies, data.allies.missing);
            
            callback();
        }
    )
}

export function resizeTemplate(top: number, left: number, bottom: number, right: number, services: Services) {
    services.state.state.place.width = ( left + services.state.state.place.width + right );
    services.state.state.place.height = ( top + services.state.state.place.height + bottom );

    services.state.state.place.x_offset = left + services.state.state.place.x_offset;
    services.state.state.place.y_offset = top + services.state.state.place.y_offset;

    services.state.save();
}

export function buildPartialTemplate(artworks: PlaceArtwork[], alliances: PlaceAlliance[], state: PlaceState, callback: any) {
    const buildProcess = child_process.fork(`${__dirname}/../Jobs/buildTemplate.js`);
    buildProcess.send({ task: "partial", artworks, alliances, state });

    buildProcess.on("message", (data: BuiltTemplates) => {
        callback(data);
    });
}

export function buildSingleAllyTemplate(ally: PlaceAlliance, state: PlaceState, callback: any) {
    const buildProcess = child_process.fork(`${__dirname}/../Jobs/buildTemplate.js`);
    buildProcess.send({ task: "one", artworks: null, alliances: [ally], state });

    buildProcess.on("message", (data: BuiltTemplates) => {
        callback(data);
    });
}

export function missingArtworkText(missing: string[]) {
    return (missing.length != 0 ? `\n\n:warning: **The following artworks from allies are missing:** ${missing.splice(0, 20).map(missing => `\`${missing}\``).join(", ")}${missing.length > 20 ? `(...${missing.length - 20} more)` : ``}` : ``);
}

export interface BuiltTemplates {
    standalone: BuiltTemplate,
    allies: BuiltTemplate
}

export interface BuiltTemplate {
    template: { buffer: { type: "Buffer", data: number[] }, templateManagerJSON: TemplateManagerTemplate },
    missing: string[],
    diff: { buffer: { type: "Buffer", data: number[] }, dataURL: string, x: number, y: number }
}