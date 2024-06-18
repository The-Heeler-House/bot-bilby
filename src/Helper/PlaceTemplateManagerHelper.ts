import { Image, createCanvas, loadImage } from "canvas"
import { PlaceState } from "../Services/State"
import { drawMissingArtworkBox, palettize } from "./PlaceCanvasHelper";
import PlaceAlliance from "../Services/Database/models/placeAlliance";
import * as logger from "../logger";
import PlaceArtwork from "../Services/Database/models/placeArtwork";
import { getArtworkURL } from "./PlaceURLHelper";

export async function generateImmediateAlliesTemplate(allies: PlaceAlliance[], state: PlaceState, shouldPalettize: boolean = false): Promise<{ buffer: Buffer, missingArtworks: string[] }> {
    return generateAlliesTemplate(allies, state, shouldPalettize, false);
}

export async function generateAllAlliesTemplate(allies: PlaceAlliance[], state: PlaceState, shouldPalettize: boolean = false): Promise<{ buffer: Buffer, missingArtworks: string[] }> {
    return generateAlliesTemplate(allies, state, shouldPalettize, true);
}

async function generateAlliesTemplate(allies: PlaceAlliance[], state: PlaceState, shouldPalettize: boolean = false, crawlAlliances: boolean = false): Promise<{ buffer: Buffer, missingArtworks: string[] }> {
    let canvas = createCanvas(state.width, state.height);
    let ctx = canvas.getContext("2d");
    let blacklist: string[] = [];
    let processedUrls: string[] = [];
    let missing: string[] = [];
    
    for (let alliance of allies) {
        if (processedUrls.includes(alliance.url)) continue; // Don't infinitly recurse.

        logger.debug("Going to process " + alliance.name);
        let assembledTemplate = await generateTemplateManagerTemplateImage(alliance.url, blacklist, state, shouldPalettize, crawlAlliances, processedUrls);
        blacklist = assembledTemplate.blacklist;
        processedUrls = assembledTemplate.processedUrls;

        assembledTemplate.missingArtworks.forEach(artwork => {
            missing.push(`${alliance.name} -> ${artwork}`);
        });

        if (assembledTemplate.buffer != null) {
            logger.debug("loading image");
            let image = await loadImage(assembledTemplate.buffer);
            ctx.drawImage(image, 0, 0);
            logger.debug("drawn");
        } else {
            logger.debug("failed to generate template for " + alliance.name);
            missing.push(`${alliance.name} template`);
        }
    }
    
    return {
        buffer: canvas.toBuffer(),
        missingArtworks: missing
    }
}

export async function generateTemplateManagerTemplateImage(url: string, blacklist: string[], state: PlaceState, shouldPalettize: boolean = true, crawlAlliances: boolean = false, processedUrls: string[] = []): Promise<{ buffer: Buffer, missingArtworks: string[], blacklist: string[], processedUrls: string[] }> {
    // TODO: Get JSON and use to assemble template.    
    logger.message("Processing " + url);
    let canvas = createCanvas(state.width, state.height);
    let ctx = canvas.getContext("2d");
    let missing: string[] = [];
    processedUrls.push(url);

    try {
        let response = await fetch(`${url}`);
        let body = await response.json() as TemplateManagerTemplate;

        for (let template of body.templates) {
            try {
                if (template.frameWidth != undefined || template.frameHeight != undefined || template.frameRate != undefined || template.frameCount != undefined) continue;
                logger.debug("Loading image urls " + template.sources)
                let image = await tryLoadImageFromSources(template.sources);
                logger.debug("hit, drawing");
                ctx.drawImage(image, template.x, template.y);
            } catch (error) {
                if (error instanceof ReferenceError) {
                    // Ran out of sources to try. Replace with a pink and black box.
                    drawMissingArtworkBox(ctx, template.x, template.y, 21, 21);
                    missing.push(template.name || "Unnamed");
                    logger.warning(`Template ${template.name} is missing artwork. Drew missing artwork box.`);
                }
            }
        }

        if (body.blacklist != undefined) {
            for (let blacklisted of body.blacklist) {
                logger.message("Added " + blacklisted.name + " (" + blacklisted.url + ") to blacklist."); 
                blacklist.push(blacklisted.url);
            }
        }

        if (body.whitelist != undefined && crawlAlliances) {
            for (let whitelisted of body.whitelist) {
                if (blacklist.includes(whitelisted.url)){
                    logger.message("Tried drawing " + whitelisted.name + " (" + whitelisted.url + ") but is on blacklist.");
                    continue;
                } // ignore blacklisted artwork.
                if (processedUrls.includes(whitelisted.url)) continue; // Don't infinitly recurse.

                logger.debug("Going to process " + whitelisted.name);
                let assembledTemplate = await generateTemplateManagerTemplateImage(whitelisted.url, blacklist, state, shouldPalettize, crawlAlliances, processedUrls);
                blacklist = assembledTemplate.blacklist;
                processedUrls = assembledTemplate.processedUrls;

                assembledTemplate.missingArtworks.forEach(artwork => {
                    missing.push(`${whitelisted.name} -> ${artwork}`);
                });

                if (assembledTemplate.buffer != null) {
                    logger.debug("loading image");
                    let image = await loadImage(assembledTemplate.buffer);
                    ctx.drawImage(image, 0, 0);
                    logger.message(`Drew ${whitelisted.name} to template.`);
                } else {
                    logger.warning("Failed to generate template for " + whitelisted.name);
                    missing.push(`${whitelisted.name} template`);
                }
            }
        }

        if (shouldPalettize) palettize(canvas, state.palette);

        return {
            buffer: canvas.toBuffer(),
            missingArtworks: missing,
            blacklist,
            processedUrls
        }
    } catch (error) {
        logger.warning(error);
        return {
            buffer: null,
            missingArtworks: missing,
            blacklist,
            processedUrls
        }
    }
}

export async function generateTemplateManagerJSON(artworks: PlaceArtwork[], alliances?: PlaceAlliance[]): Promise<TemplateManagerTemplate> {
    let templates: TemplateManagerArtwork[] = [];
    let whitelist: TemplateManagerExternalArtwork[] = [];

    for (let artwork of artworks) {
        templates.push({
            name: artwork.name,
            sources: [
                getArtworkURL(artwork.fileName)
            ],
            x: artwork.x,
            y: artwork.y
        });
    }

    if (alliances) {
        for (let alliance of alliances) {
            whitelist.push({
                name: alliance.name,
                url: alliance.url
            });
        }
    }

    return {
        faction: `Bluey`,
        contact: "https://discord.gg/blueyheeler",
        templates,
        whitelist
    }
}

/**
 * Tries to load the image from an array of sources in order.
 * @param sources An array of sources to try.
 * @returns A canvas.js Image object.
 */
async function tryLoadImageFromSources(sources: string[]): Promise<Image> {
    for (let i = 0; i < sources.length; i++) {
        try {
            return await loadImage(sources[i]);
        } catch {
            // Failed, try next if available. Else throw an error.
            logger.debug("failed " + sources[i]);
            if (i == sources.length - 1) throw new ReferenceError("Couldn't load any sources for this image.");
            continue;
        }
    }
}

export interface TemplateManagerTemplate {
    faction: string,
    contact: string,
    templates: TemplateManagerArtwork[],
    whitelist?: TemplateManagerExternalArtwork[],
    blacklist?: TemplateManagerExternalArtwork[]
}

export interface TemplateManagerArtwork {
    name?: string,
    sources: string[],
    x: number,
    y: number,
    frameWidth?: number,
    frameHeight?: number,
    frameRate?: number,
    frameCount?: number
}

export interface TemplateManagerExternalArtwork {
    name: string,
    url: string
}