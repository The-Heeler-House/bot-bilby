// Builds the template on a seperate process from Bilby, then reports back it's success.

import { generateTemplate, compareCurrentTemplateWithNew, cropTemplateDiff } from "../Helper/PlaceCanvasHelper";
import PlaceAlliance from "../Services/Database/models/placeAlliance";
import PlaceArtwork from "../Services/Database/models/placeArtwork";
import { PlaceState } from "../Services/State";

process.on("message", async (data: BuildTemplateParameters) => {
    // Start processing.
    let template = await generateTemplate(data.artworks, data.alliances, data.state, true);
    let missingArtworks = template.missingArtworks.length > 5 ? template.missingArtworks.map(value => `:warning: **Missing artwork in template:** ${value}`).splice(0, 5).join("\n") + `\n(${template.missingArtworks.length - 5} more warnings...)` : template.missingArtworks.map(value => `:warning: **Missing artwork in template:** ${value}`).join("\n");

    let diff = await compareCurrentTemplateWithNew(template.buffer, data.state);
    console.log(diff);

    let croppedDiff = await cropTemplateDiff(diff, data.state);

    process.send({
        template,
        missingArtworks,
        diff,
        croppedDiff
    });
});

interface BuildTemplateParameters {
    alliances: PlaceAlliance[],
    artworks: PlaceArtwork[],
    state: PlaceState
}