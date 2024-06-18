import { Canvas, CanvasRenderingContext2D, createCanvas, loadImage } from "canvas";
import PlaceArtwork from "../Services/Database/models/placeArtwork";
import { PlaceState } from "../Services/State";
import * as logger from "../logger";
import { getArtworkURL, getFullTemplateURL } from "./PlaceURLHelper";
import PlaceAlliance from "../Services/Database/models/placeAlliance";
import { TemplateManagerTemplate, generateAllAlliesTemplate, generateImmediateAlliesTemplate } from "./PlaceTemplateManagerHelper";

export async function generateStandaloneTemplate(artworks: PlaceArtwork[], state: PlaceState, shouldPalettize: boolean = false): Promise<Buffer> {
    let canvas = createCanvas(state.width, state.height);
    let ctx = canvas.getContext("2d");

    for (let artwork of artworks) {
        logger.message(`Adding ${artwork.name} to template.`);
        try {
            logger.debug("loading " + getArtworkURL(artwork.fileName));
            let image = await loadImage(getArtworkURL(artwork.fileName));
            logger.debug("loaded, adding");
            ctx.drawImage(image, (artwork.x + state.x_offset), (artwork.y + state.y_offset));
        } catch (error) {
            drawMissingArtworkBox(ctx, artwork.x, artwork.y, 31, 31);
            logger.warning(`Failed to fetch ${artwork.name}. Rendering missing artwork box.`);
        }
    }

    return canvas.toBuffer();
}

export async function generateTemplate(artworks: PlaceArtwork[], alliances: PlaceAlliance[], state: PlaceState, shouldPalettize: boolean = false): Promise<{ buffer: Buffer, missingArtworks: string[] }> {
    let canvas = createCanvas(state.width, state.height);
    let ctx = canvas.getContext("2d");

    let standalone = await generateStandaloneTemplate(artworks, state, shouldPalettize);
    let allies = await generateImmediateAlliesTemplate(alliances, state, shouldPalettize);

    ctx.drawImage(await loadImage(allies.buffer), 0, 0);
    ctx.drawImage(await loadImage(standalone), 0, 0);

    return {
        buffer: canvas.toBuffer(),
        missingArtworks: allies.missingArtworks
    }
}

export async function createTemplateDiff(templateName: "bluey" | "bluey_allies", template: Buffer, state: PlaceState): Promise<{ buffer: Buffer, dataURL: string, x: number, y: number }> {
    let diff = await compareCurrentTemplateWithNew(templateName, template, state);
    if (diff === undefined) {
        // We need a full update.
        return null;
    }
    if (diff === null) {
        // There's been no change.
        return {
            dataURL: null,
            buffer: diff,
            x: null,
            y: null
        };
    }

    let croppedDiff = await cropTemplateDiff(diff, state);

    return {
        buffer: diff,
        dataURL: croppedDiff.dataURL,
        x: croppedDiff.x,
        y: croppedDiff.y
    }
}

export async function compareCurrentTemplateWithNew(templateName: "bluey" | "bluey_allies", template: Buffer, state: PlaceState): Promise<Buffer> {
    logger.debug("Getting " + getFullTemplateURL(templateName, templateName == "bluey" ? state.current_template_id.standalone : state.current_template_id.allies));
    let currentTemplate = await loadImage(getFullTemplateURL(templateName, templateName == "bluey" ? state.current_template_id.standalone : state.current_template_id.allies));
    logger.debug("gotten");

    if (currentTemplate.width != state.width || currentTemplate.height != state.height) {
        // Mismatch, can't generate a diff. Return with undefined to indicate that a full update is needed.
        logger.debug("Need full update.");
        return undefined;
    }

    logger.debug("Creating current canvas");
    let currentCanvas = createCanvas(currentTemplate.width, currentTemplate.height);
    let currentCtx = currentCanvas.getContext("2d");
    currentCtx.drawImage(currentTemplate, 0, 0);

    logger.debug("Creating new canvas");
    let newCanvas = createCanvas(state.width, state.height);
    let newCtx = newCanvas.getContext("2d");
    newCtx.drawImage(await loadImage(template), 0, 0);

    logger.debug("Creating diff canvas");
    let diffCanvas = createCanvas(state.width, state.height);
    let diffCtx = diffCanvas.getContext("2d");

    let changesOccured = false;
    
    logger.debug("Assembling changes...");
    for (let i = 0; i < state.width; i++) {
        //let x = Math.floor((i * state.width) % state.height);

        let currentColor = currentCtx.getImageData(i, 0, 1, state.height).data;
        let newColor = newCtx.getImageData(i, 0, 1, state.height).data;

        if (!compareUint8ClampedArrays(currentColor, newColor)) {
            changesOccured = true;
            logger.debug("Found row that doesn't match.");
            for (let j = 0; j < state.height; j++) {
                let currentColor = currentCtx.getImageData(i, j, 1, 1).data;
                let newColor = newCtx.getImageData(i, j, 1, 1).data;

                if (currentColor[0] == newColor[0] && currentColor[1] == newColor[1] && currentColor[2] == newColor[2] && currentColor[3] == newColor[3]) {
                    // Colors match.
                    diffCtx.fillStyle = "rgba(0,255,255," + 254 / 255 + ")";
                    diffCtx.fillRect(i, j, 1, 1);
                } else {
                    diffCtx.fillStyle = `rgba(${newColor[0]}, ${newColor[1]}, ${newColor[2]}, ${newColor[3]/255})`;
                    diffCtx.fillRect(i, j, 1, 1);
                }
            }
        } else {
            diffCtx.fillStyle = "rgba(0,255,255," + 254 / 255 + ")";
            diffCtx.fillRect(i, 0, 1, state.height);
        }
    }
    logger.debug("Finished assembling changes.");

    if (!changesOccured) return null;
    logger.debug("Changes have occurred.");
    return diffCanvas.toBuffer();
}

export async function cropTemplateDiff(diff: Buffer, state: PlaceState): Promise<{ dataURL: string, x: number, y: number }> {
    let diffCanvas = createCanvas(state.width, state.height);
    let diffCtx = diffCanvas.getContext("2d");
    diffCtx.drawImage(await loadImage(diff), 0, 0);
    let data = diffCtx.getImageData(0, 0, state.width, state.height).data;

    let top = 0, bottom = diffCanvas.height, left = 0, right = diffCanvas.width;

    // Find top and bottom boundaries
    for (let y = 0; y < diffCanvas.height; y++) {
        for (let x = 0; x < diffCanvas.width; x++) {
            const index = (y * diffCanvas.width + x) * 4; // Index to the alpha channel
            if (!(data[index] == 0 && data[index+1] == 255 && data[index+2] == 255 && data[index+3] == 254)) { // Check if pixel is not transparent
                top = y;
                break;
            }
        }
        if (top > 0) break; // Stop searching once the top is found
    }

    for (let y = diffCanvas.height - 1; y >= top; y--) {
        for (let x = 0; x < diffCanvas.width; x++) {
            const index = (y * diffCanvas.width + x) * 4;
            if (!(data[index] == 0 && data[index+1] == 255 && data[index+2] == 255 && data[index+3] == 254)) {
                bottom = y;
                break;
            }
        }
        if (bottom < diffCanvas.height - 1) break;
    }

    // Find left and right boundaries
    for (let x = 0; x < diffCanvas.width; x++) {
        for (let y = top; y <= bottom; y++) {
            const index = (y * diffCanvas.width + x) * 4;
            if (!(data[index] == 0 && data[index+1] == 255 && data[index+2] == 255 && data[index+3] == 254)) {
                left = x;
                break;
            }
        }
        if (left > 0) break;
    }

    for (let x = diffCanvas.width - 1; x >= left; x--) {
        for (let y = top; y <= bottom; y++) {
            const index = (y * diffCanvas.width + x) * 4;
            if (!(data[index] == 0 && data[index+1] == 255 && data[index+2] == 255 && data[index+3] == 254)) {
                right = x;
                break;
            }
        }
        if (right < diffCanvas.width - 1) break;
    }

    let croppedCanvas = createCanvas(right - left + 1, bottom - top + 1);
    let croppedCtx = croppedCanvas.getContext("2d");

    croppedCtx.drawImage(diffCanvas, left, top, croppedCanvas.width, croppedCanvas.height, 0, 0, croppedCanvas.width, croppedCanvas.height);

    return {
        dataURL: croppedCanvas.toDataURL(),
        x: left,
        y: top
    }
}

function compareUint8ClampedArrays(arr1: Uint8ClampedArray, arr2: Uint8ClampedArray): boolean {
    if (arr1.length !== arr2.length) {
        return false; // Arrays have different lengths
    }
  
    for (let i = 0; i < arr1.length; i++) {
          if (arr1[i] !== arr2[i]) {
            return false; // Values at index i differ
        }
    }
  
    return true; // All values match
}

export async function palettize(canvas: Canvas, palette: number[][]) {
    let ctx = canvas.getContext("2d");

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length / 4; i++) {
        const base = i * 4;
        const currentColor = data.slice(base, base + 3);
        const currentAlpha = data[base+ 3];
        if (currentColor[0] + currentColor[1] + currentColor[2] === 0) continue;
        if (currentColor[0] === 0 && currentColor[1] === 255 && currentColor[2] === 255 && currentAlpha === 254) continue;
  
        let newColor;
        let bestDiff = Infinity;
        for (const color of palette) {
          const diff = Math.abs(currentColor[0] - color[0]) + Math.abs(currentColor[1] - color[1]) + Math.abs(currentColor[2] - color[2]);
          if (diff === 0)
                return color;
          if (diff < bestDiff) {
                bestDiff = diff;
                newColor = color;
          }
        }
        if (!newColor) newColor = [0, 0, 0];
  
        data[base] = newColor[0];
        data[base + 1] = newColor[1];
        data[base + 2] = newColor[2];
    }

    ctx.putImageData(imageData, 0, 0);
}

export function drawMissingArtworkBox(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
    for (let i = 0; i < (width * height); i++) {
        let x_offset = Math.floor(i % height);
        let y_offset = Math.floor(i / height);

        if (i % 2 == 0) {
            ctx.fillStyle = "#ff00ff";
        } else {
            ctx.fillStyle = "#000000";
        }

        ctx.fillRect(x + x_offset, y + y_offset, 1, 1);
    }
}

export async function urlToImageBuffer(url: string, width: number, height: number): Promise<Buffer> {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    let image = await loadImage(url);

    ctx.drawImage(image, 0, 0);

    return canvas.toBuffer();
}