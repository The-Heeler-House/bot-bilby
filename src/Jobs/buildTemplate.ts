// Builds the template on a seperate process from Bilby, then reports back it's success.

import { generateTemplate, compareCurrentTemplateWithNew, cropTemplateDiff, generateStandaloneTemplate, createTemplateDiff } from "../Helper/PlaceCanvasHelper";
import { TemplateManagerTemplate, generateTemplateManagerJSON, generateTemplateManagerTemplateImage } from "../Helper/PlaceTemplateManagerHelper";
import PlaceAlliance from "../Services/Database/models/placeAlliance";
import PlaceArtwork from "../Services/Database/models/placeArtwork";
import { PlaceState } from "../Services/State";
import * as logger from "../logger";

process.on("message", async (data: BuildTemplateParameters) => {
    // Start processing.

    if (data.task == "full") {
        // Build standalone template + diffs.
        let standalone: BuiltTemplate = {
            template: {
                buffer: null,
                templateManagerJSON: null
            },
            diff: {
                dataURL: null,
                buffer: null,
                x: null,
                y: null,
            }
        };

        logger.message("Generating standalone template.")
        standalone.template.buffer = await generateStandaloneTemplate(data.artworks, data.state, true);
        standalone.template.templateManagerJSON = await generateTemplateManagerJSON(data.artworks);
        logger.debug("Generating standalone template diff");
        standalone.diff = await createTemplateDiff("bluey", standalone.template.buffer, data.state);
        logger.debug("Generated.");

        // Build alliance template + diffs
        let allies: BuiltTemplate = {
            template: {
                buffer: null,
                templateManagerJSON: null
            },
            missing: [],
            diff: {
                dataURL: null,
                buffer: null,
                x: null,
                y: null,
            }
        }

        logger.message("Generating allies template.");
        let template = await generateTemplate(data.artworks, data.alliances, data.state, true);
        allies.template.buffer = template.buffer;
        allies.template.templateManagerJSON = await generateTemplateManagerJSON(data.artworks, data.alliances);
        allies.missing = template.missingArtworks;
        logger.debug("Generating allies template diff");
        allies.diff = await createTemplateDiff("bluey_allies", template.buffer, data.state);
        logger.debug("Generated.");

        process.send({
            standalone,
            allies
        });
    } else if (data.task == "partial") {
        // Build standalone template.
        let standalone: BuiltTemplate = {
            template: {
                buffer: null,
                templateManagerJSON: null
            },
            diff: null
        };

        logger.message("Generating standalone template.")
        standalone.template.buffer = await generateStandaloneTemplate(data.artworks, data.state, true);
        standalone.template.templateManagerJSON = await generateTemplateManagerJSON(data.artworks);
        logger.debug("Generated.");

        // Build alliance template
        let allies: BuiltTemplate = {
            template: {
                buffer: null,
                templateManagerJSON: null
            },
            missing: [],
            diff: null
        }

        logger.message("Generating allies template.");
        let template = await generateTemplate(data.artworks, data.alliances, data.state, true);
        allies.template.buffer = template.buffer;
        allies.template.templateManagerJSON = await generateTemplateManagerJSON(data.artworks, data.alliances);
        allies.missing = template.missingArtworks;
        logger.debug("Generated.");

        process.send({
            standalone,
            allies
        });
    } else if (data.task == "one") {
        let template = await generateTemplateManagerTemplateImage(data.alliances[0].url, [], data.state, true, false, []);

        process.send({
            standalone: null,
            allies: [
                {
                    template: {
                        buffer: template.buffer,
                        templateManagerJSON: null
                    },
                    missing: template.missingArtworks,
                    diff: null
                }
            ]
        });
    }
});

interface BuildTemplateParameters {
    task: "full" | "partial" | "one",
    alliances: PlaceAlliance[],
    artworks: PlaceArtwork[],
    state: PlaceState
}

interface BuiltTemplate {
    template: { buffer: Buffer, templateManagerJSON: TemplateManagerTemplate },
    missing?: string[],
    diff: { buffer: Buffer, dataURL: string, x: number, y: number },
}