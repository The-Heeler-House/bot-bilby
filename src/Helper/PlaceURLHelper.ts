/**
 * Gets a full template image URL from the CDN.
 * @param id The full template image ID.
 * @returns A full template image URL related to the ID provided.
 */
export function getFullTemplateURL(id: number): string {
    return `https://cdn.place.heeler.house/templates/bluey/full/${id}.png`;
}

export function getArtworkURL(artworkFileName: string): string {
    return `https://cdn.place.heeler.house/artworks/${artworkFileName}.png`;
}