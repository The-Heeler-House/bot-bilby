export interface GlazeDefinition {
    id: string;
    name: string;
    type: "glaze";
    multiplier: number;
    durationMs: number;
    triggerRange: [number, number]; // [min, max] WP threshold range
    final24hOnly: boolean;
}

export interface BurnDefinition {
    id: string;
    name: string;
    type: "burn";
    penalty: number; // subtracted from net multiplier
    durationMs: number;
    triggerRange: [number, number];
    final24hOnly: boolean;
}

export interface PancakeBurnDefinition {
    id: string;
    name: string;
    penalty: number;
    durationMs: number;
}

export const GLAZES: GlazeDefinition[] = [
    { id: "strawberry_glaze",    name: "Strawberry Glaze",    type: "glaze", multiplier: 2,   durationMs: 60 * 60 * 1000,      triggerRange: [200, 300],   final24hOnly: false },
    { id: "blueberry_glaze",     name: "Blueberry Glaze",     type: "glaze", multiplier: 2,   durationMs: 2 * 60 * 60 * 1000,  triggerRange: [280, 420],   final24hOnly: false },
    { id: "maple_glaze",         name: "Maple Glaze",         type: "glaze", multiplier: 3,   durationMs: 60 * 60 * 1000,      triggerRange: [350, 550],   final24hOnly: false },
    { id: "banana_glaze",        name: "Banana Glaze",        type: "glaze", multiplier: 2.5, durationMs: 90 * 60 * 1000,      triggerRange: [450, 650],   final24hOnly: false },
    { id: "chocolate_glaze",     name: "Chocolate Glaze",     type: "glaze", multiplier: 3,   durationMs: 45 * 60 * 1000,      triggerRange: [550, 800],   final24hOnly: false },
    { id: "peanut_butter_glaze", name: "Peanut Butter Glaze", type: "glaze", multiplier: 4,   durationMs: 30 * 60 * 1000,      triggerRange: [700, 1000],  final24hOnly: false },
    { id: "cherry_glaze",        name: "Cherry Glaze",        type: "glaze", multiplier: 5,   durationMs: 20 * 60 * 1000,      triggerRange: [1000, 1400], final24hOnly: false },
    { id: "golden_glaze",        name: "Golden Glaze",        type: "glaze", multiplier: 10,  durationMs: 10 * 60 * 1000,      triggerRange: [400, 700],   final24hOnly: true  },
];

export const BURNS: BurnDefinition[] = [
    { id: "soggy_bottom", name: "Soggy Bottom", type: "burn", penalty: 0.5,  durationMs: 45 * 60 * 1000,     triggerRange: [300, 500], final24hOnly: false },
    { id: "cold_waffle",  name: "Cold Waffle",  type: "burn", penalty: 0.75, durationMs: 60 * 60 * 1000,     triggerRange: [500, 800], final24hOnly: false },
    { id: "waffle_bug",   name: "Waffle Bug",   type: "burn", penalty: 1,    durationMs: 2 * 60 * 60 * 1000, triggerRange: [350, 600], final24hOnly: true  },
];

export const PANCAKE_BURN: PancakeBurnDefinition = {
    id: "burned_the_waffle",
    name: "Burned the Waffle",
    penalty: 0.5,
    durationMs: 30 * 60 * 1000,
};

export const GLAZE_MAP = new Map<string, GlazeDefinition>(GLAZES.map(g => [g.id, g]));
export const BURN_MAP = new Map<string, BurnDefinition>(BURNS.map(b => [b.id, b]));

/** Upgrade a burn one tier for final24h minigame losers. */
export function upgradeBurn(burnId: string): string {
    if (burnId === "soggy_bottom") return "cold_waffle";
    if (burnId === "cold_waffle") return "waffle_bug";
    return burnId;
}
