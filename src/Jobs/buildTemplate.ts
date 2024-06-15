// Builds the template on a seperate process from Bilby, then reports back it's success.

import { generateTemplate, compareCurrentTemplateWithNew, cropTemplateDiff, generateStandaloneTemplate, createTemplateDiff } from "../Helper/PlaceCanvasHelper";
import PlaceAlliance from "../Services/Database/models/placeAlliance";
import PlaceArtwork from "../Services/Database/models/placeArtwork";
import { PlaceState } from "../Services/State";
import * as logger from "../logger";

process.on("message", async (data: BuildTemplateParameters) => {
    // Start processing.

    // Build standalone template + diffs.
    let standalone: BuiltTemplate = {
        template: null,
        diff: {
            dataURL: null,
            buffer: null,
            x: null,
            y: null,
        }
    };

    logger.message("Generating standalone template.")
    standalone.template = await generateStandaloneTemplate(data.artworks, data.state, true);
    logger.debug("Generating standalone template diff");
    standalone.diff = await createTemplateDiff("bluey", standalone.template, data.state);
    logger.debug("Generated.");

    // Build alliance template + diffs
    let allies: BuiltTemplate = {
        template: null,
        diff: {
            dataURL: null,
            buffer: null,
            x: null,
            y: null,
        }
    }

    logger.message("Generating allies template.");
    let template = await generateTemplate(data.artworks, data.alliances, data.state, true);
    allies.template = template.buffer;
    allies.missing = template.missingArtworks;
    logger.debug("Generating allies template diff");
    allies.diff = await createTemplateDiff("bluey_allies", template.buffer, data.state);
    logger.debug("Generated.");

    process.send({
        standalone,
        allies
    });
});

interface BuildTemplateParameters {
    alliances: PlaceAlliance[],
    artworks: PlaceArtwork[],
    state: PlaceState
}

interface BuiltTemplate {
    template: Buffer,
    missing?: string[],
    diff: { buffer: Buffer, dataURL: string, x: number, y: number },
}