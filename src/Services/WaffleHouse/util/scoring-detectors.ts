import { Collection, Attachment, Embed } from "discord.js";

/**
 * Pure detector functions for each scoring method.
 * Each returns true if the method triggers for the given message.
 */

const CONTIGUOUS_WAFFLE = /waffles?/i;

function extractWordTokens(content: string): string[] {
    return content.toLowerCase().match(/[a-z0-9']+/g) ?? [];
}

export function detectLonelyWaffle(content: string): boolean {
    return /^waffles?$/i.test(content.trim());
}

export function detectJustSayin(content: string): boolean {
    return /\bwaffles?\b(?:[.?!-]|-\?|-\!)?/i.test(content);
}

export function detectLazyWaffle(content: string): boolean {
    return /\bwfl\b/i.test(content);
}

export function detectW4ff13sp34k(content: string): boolean {
    return /\bw4ff(?:13|l3)\b/i.test(content);
}

export function detectEatingBackwards(content: string): boolean {
    return /\belffaw\b/i.test(content);
}

export function detectWaffleFan(content: string): boolean {
    return /\bwaffles?\b/i.test(content) && /\b(best|peak|based|fire|lit|delicious|yummy)\b/i.test(content);
}

export function detectWaffleScramble(content: string): boolean {
    if (CONTIGUOUS_WAFFLE.test(content)) return false;
    const lower = content.toLowerCase();
    let w = 0, a = 0, f = 0, l = 0, e = 0;
    for (const ch of lower) {
        if (ch === "w") w++;
        else if (ch === "a") a++;
        else if (ch === "f") f++;
        else if (ch === "l") l++;
        else if (ch === "e") e++;
    }
    return w >= 1 && a >= 1 && f >= 2 && l >= 1 && e >= 1;
}

export function detectTheBasics(content: string): boolean {
    if (CONTIGUOUS_WAFFLE.test(content)) return false;
    const lower = content.toLowerCase();
    let w = 0, a = 0, f = 0, l = 0, e = 0;
    for (const ch of lower) {
        if (ch === "w") w++;
        else if (ch === "a") a++;
        else if (ch === "f") f++;
        else if (ch === "l") l++;
        else if (ch === "e") e++;
    }
    return w === 1 && a === 1 && f === 2 && l === 1 && e === 1;
}

export function detectFeelingVeryWaffle(content: string): boolean {
    return content.includes("🧇");
}

export function detectSoWaffley(content: string): boolean {
    return /\b(?:waffley|waffly)\b/i.test(content);
}

export function detectBecomeWaffle(content: string): boolean {
    return /\b(?:wafflize|waffle-ize|waffleize|wafflized|waffle-ized|waffleized)\b/i.test(content);
}

const GET_WAFFLED_PHRASES = [
    "to waffle",
    "waffling",
    "waffled",
    "will waffle",
    "i'll waffle",
    "ill waffle",
    "you'll waffle",
    "youll waffle",
    "he'll waffle",
    "shell waffle",
    "it'll waffle",
    "itll waffle",
    "he waffles",
    "she waffles",
    "it waffles",
];

export function detectGetWaffled(content: string): boolean {
    const lower = content.toLowerCase();
    return GET_WAFFLED_PHRASES.some(p => lower.includes(p));
}

export function detectWaffleGif(
    _content: string,
    attachments: Collection<string, Attachment>,
    embeds: Embed[]
): boolean {
    for (const att of attachments.values()) {
        if (att.name?.toLowerCase().includes("waffle")) return true;
        if (att.url?.toLowerCase().includes("waffle")) return true;
    }
    for (const embed of embeds) {
        if (embed.title?.toLowerCase().includes("waffle")) return true;
        if (embed.url?.toLowerCase().includes("waffle")) return true;
        if (embed.image?.url?.toLowerCase().includes("waffle")) return true;
        if (embed.video?.url?.toLowerCase().includes("waffle")) return true;
    }
    return false;
}

export function detectWaffleAcronym(content: string): boolean {
    const words = extractWordTokens(content);
    const target = ["w", "a", "f", "f", "l", "e"];
    for (let i = 0; i <= words.length - 6; i++) {
        const window = words.slice(i, i + 6);
        const firstLetters = window.map(w => w[0]?.toLowerCase() ?? "");
        if (target.every((ch, idx) => firstLetters[idx] === ch)) return true;
    }
    return false;
}

export function detectBlueysBrekkie(content: string, channelId: string, blueyTalkId: string): boolean {
    if (channelId !== blueyTalkId) return false;
    return /\bbluey\b/i.test(content) && /\bwaffles?\b/i.test(content);
}

export function detectBingosBrunch(content: string, channelId: string, blueyTalkId: string): boolean {
    if (channelId !== blueyTalkId) return false;
    return /\bbingo\b/i.test(content) && /\bwaffles?\b/i.test(content);
}

export function detectChangeOfTopic(content: string, channelId: string, offTopicId: string): boolean {
    if (channelId !== offTopicId) return false;
    return /\bokay but waffles?\b/i.test(content);
}

const POSITIVE_PANCAKE_QUALIFIER = /\b(don't hate|do not hate|don't dislike|do not dislike|not gross|not dumb)\b/i;
const NEGATIVE_PANCAKE_QUALIFIER = /\b(hate|dislike|gross|dumb)\b/i;

export function detectBetrayal(content: string): boolean {
    if (!/\bpancakes?\b/i.test(content)) return false;
    if (detectSneakyBetrayal(content)) return false;
    return !NEGATIVE_PANCAKE_QUALIFIER.test(content);
}

export function detectSneakyBetrayal(content: string): boolean {
    if (!/\bpancakes?\b/i.test(content)) return false;
    return POSITIVE_PANCAKE_QUALIFIER.test(content);
}

export function detectHeartbreaker(content: string): boolean {
    const lower = content.toLowerCase();
    return (
        lower.includes("i love pancakes") ||
        lower.includes("i like pancakes") ||
        lower.includes("pancakes are my favourite") ||
        lower.includes("pancakes are my favorite") ||
        lower.includes("i love pancake") ||
        lower.includes("i like pancake")
    );
}

export function detectWaffleHater(content: string): boolean {
    const lower = content.toLowerCase();
    if (!/\bwaffles?\b/.test(lower)) return false;
    return (
        lower.includes("hate waffles") ||
        lower.includes("don't like waffles") ||
        lower.includes("dont like waffles") ||
        lower.includes("waffles bad") ||
        lower.includes("waffles are bad") ||
        lower.includes("waffles are gross") ||
        lower.includes("waffles suck") ||
        lower.includes("waffles are awful") ||
        lower.includes("waffles are terrible")
    );
}

export function detectHeretic(content: string): boolean {
    const lower = content.toLowerCase();
    return (
        lower.includes("pancakes are delicious") ||
        lower.includes("pancakes are the best") ||
        lower.includes("pancakes great") ||
        lower.includes("pancakes are great") ||
        lower.includes("pancakes best") ||
        lower.includes("pancakes are amazing") ||
        lower.includes("pancakes are incredible") ||
        lower.includes("i love pancakes")
    );
}

const POSITIVE_HOTCAKE_QUALIFIER = POSITIVE_PANCAKE_QUALIFIER;
const NEGATIVE_HOTCAKE_QUALIFIER = NEGATIVE_PANCAKE_QUALIFIER;

export function detectTooCheeky(content: string): boolean {
    if (!/\b(hotcakes|flapjacks)\b/i.test(content)) return false;
    return !NEGATIVE_HOTCAKE_QUALIFIER.test(content);
}

export function detectYouThinkYoureCute(content: string): boolean {
    if (!/\b(hotcakes|flapjacks)\b/i.test(content)) return false;
    return POSITIVE_HOTCAKE_QUALIFIER.test(content);
}

export function detectYouTakeThatBack(content: string): boolean {
    return /pancakes?\s+are\s+better/i.test(content);
}

export function detectFrenchToast(content: string): boolean {
    return /french(?:\W|_)*toast/i.test(content);
}

export function detectPancakeMention(content: string): boolean {
    return /\bpancakes?\b/i.test(content);
}

export function containsWaffle(content: string): boolean {
    return /\bwaffles?\b/i.test(content);
}

/** Validate a WAFFLE acronym where all 6 words are 5+ letters (for Rare spawn challenge). */
export function detectLongWaffleAcronym(content: string): boolean {
    const words = extractWordTokens(content);
    const target = ["w", "a", "f", "f", "l", "e"];
    for (let i = 0; i <= words.length - 6; i++) {
        const window = words.slice(i, i + 6);
        const valid = window.every((w, idx) =>
            w[0]?.toLowerCase() === target[idx] && w.length >= 5
        );
        if (valid) return true;
    }
    return false;
}

/** Check if a message satisfies the Uncommon spawn challenge (words starting with W/A/F/F/L/E in order). */
export function detectWaffleWordStarts(content: string): boolean {
    const words = extractWordTokens(content);
    if (words.length < 6) return false;
    const allowed = new Set(["w", "a", "f", "l", "e"]);
    return words.every(word => allowed.has(word[0]?.toLowerCase() ?? ""));
}
