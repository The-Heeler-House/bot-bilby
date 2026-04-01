export type CardRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type CardCategory = "base" | "topping" | "special" | "combo";

export interface CardTemplate {
    id: string;
    name: string;
    emoji: string;
    rarity: CardRarity;
    category: CardCategory;
    valueRange: [number, number]; // [min, max]
    comboOnly?: boolean;       // true = cannot drop from spawns
    reducedDropRate?: boolean; // true = ~50% of normal rarity weight
    negativeValue?: boolean;   // true = value is negative (subtracts from collection total)
    flavour?: string;
}

export interface CombinationRecipe {
    inputA: string; // card template ID
    inputB: string; // card template ID
    outputId: string;
    multiplier: number;
    bonus: number;
}

export const CARD_TEMPLATES: CardTemplate[] = [
    // Base cards
    { id: "muffins_leftover_waffle", name: "Muffin's Leftover Waffle", emoji: "🧇", rarity: "common", category: "base", valueRange: [50, 150] },
    { id: "sunday_morning_waffle", name: "Sunday Morning Waffle", emoji: "🌅", rarity: "uncommon", category: "base", valueRange: [200, 500] },
    { id: "bandits_special", name: "Bandit's Special", emoji: "🎩", rarity: "rare", category: "base", valueRange: [600, 1200] },
    { id: "chillis_disaster_waffle", name: "Chilli's Disaster Waffle", emoji: "🔥", rarity: "epic", category: "base", valueRange: [1500, 3000] },
    { id: "the_bluey_golden_waffle", name: "The Bluey Golden Waffle", emoji: "💎", rarity: "legendary", category: "base", valueRange: [5000, 10000] },

    // Topping cards
    { id: "drizzle_of_honey", name: "Drizzle of Honey", emoji: "🍯", rarity: "common", category: "topping", valueRange: [30, 100] },
    { id: "whipped_cream_cloud", name: "Whipped Cream Cloud", emoji: "☁️", rarity: "common", category: "topping", valueRange: [30, 100] },
    { id: "berry_avalanche", name: "Berry Avalanche", emoji: "🫐", rarity: "uncommon", category: "topping", valueRange: [100, 300] },
    { id: "maple_monsoon", name: "Maple Monsoon", emoji: "🍁", rarity: "rare", category: "topping", valueRange: [300, 700] },
    { id: "choc_hazelnut_lava", name: "Choc-Hazelnut Lava", emoji: "🍫", rarity: "epic", category: "topping", valueRange: [500, 1200] },

    // Special cards
    { id: "tripzs_pancake", name: "Tripz's Pancake", emoji: "🥞", rarity: "rare", category: "special", valueRange: [-500, -200], reducedDropRate: true, negativeValue: true },
    { id: "bingos_redemption_bite", name: "Bingo's Redemption Bite", emoji: "🌟", rarity: "rare", category: "special", valueRange: [50, 200], reducedDropRate: true, flavour: "She saved one waffle from the chaos." },
    { id: "jalens_67_eternal_waffle", name: "Jalen's 67 Eternal Waffle", emoji: "👑", rarity: "legendary", category: "special", valueRange: [15000, 25000], comboOnly: true },

    // Combo-produced cards
    { id: "sticky_muffin_stack", name: "Sticky Muffin Stack", emoji: "🧇", rarity: "uncommon", category: "combo", valueRange: [0, 0] },
    { id: "muffins_cloud_nine", name: "Muffin's Cloud Nine", emoji: "🧇", rarity: "uncommon", category: "combo", valueRange: [0, 0] },
    { id: "weekend_berry_feast", name: "Weekend Berry Feast", emoji: "🌅", rarity: "rare", category: "combo", valueRange: [0, 0] },
    { id: "lazy_sunday_deluxe", name: "Lazy Sunday Deluxe", emoji: "🌅", rarity: "rare", category: "combo", valueRange: [0, 0] },
    { id: "honey_glazed_sunrise", name: "Honey-Glazed Sunrise", emoji: "🌅", rarity: "rare", category: "combo", valueRange: [0, 0] },
    { id: "bandits_maple_masterwork", name: "Bandit's Maple Masterwork", emoji: "🎩", rarity: "epic", category: "combo", valueRange: [0, 0] },
    { id: "dads_secret_recipe", name: "Dad's Secret Recipe", emoji: "🎩", rarity: "epic", category: "combo", valueRange: [0, 0] },
    { id: "bandits_berry_blitz", name: "Bandit's Berry Blitz", emoji: "🎩", rarity: "epic", category: "combo", valueRange: [0, 0] },
    { id: "chillis_redemption_plate", name: "Chilli's Redemption Plate", emoji: "🔥", rarity: "epic", category: "combo", valueRange: [0, 0] },
    { id: "chillis_choc_meltdown", name: "Chilli's Choc Meltdown", emoji: "🔥", rarity: "epic", category: "combo", valueRange: [0, 0] },
    { id: "the_heeler_family_breakfast", name: "The Heeler Family Breakfast", emoji: "🍽️", rarity: "legendary", category: "combo", valueRange: [0, 0] },
    { id: "tripzs_redemption_arc", name: "Tripz's Redemption Arc", emoji: "🥞", rarity: "rare", category: "combo", valueRange: [0, 0] },
    { id: "bingos_brunch_special", name: "Bingo's Brunch Special", emoji: "🌟", rarity: "epic", category: "combo", valueRange: [0, 0] },
];

export const CARD_TEMPLATE_MAP = new Map<string, CardTemplate>(
    CARD_TEMPLATES.map(t => [t.id, t])
);

export const COMBINATION_RECIPES: CombinationRecipe[] = [
    // Standard recipes (10)
    { inputA: "muffins_leftover_waffle", inputB: "drizzle_of_honey",       outputId: "sticky_muffin_stack",          multiplier: 0.8, bonus: 100 },
    { inputA: "muffins_leftover_waffle", inputB: "whipped_cream_cloud",    outputId: "muffins_cloud_nine",           multiplier: 0.8, bonus: 80 },
    { inputA: "sunday_morning_waffle",   inputB: "berry_avalanche",         outputId: "weekend_berry_feast",          multiplier: 0.7, bonus: 200 },
    { inputA: "sunday_morning_waffle",   inputB: "whipped_cream_cloud",    outputId: "lazy_sunday_deluxe",           multiplier: 0.7, bonus: 250 },
    { inputA: "sunday_morning_waffle",   inputB: "drizzle_of_honey",       outputId: "honey_glazed_sunrise",         multiplier: 0.7, bonus: 180 },
    { inputA: "bandits_special",         inputB: "maple_monsoon",           outputId: "bandits_maple_masterwork",     multiplier: 0.6, bonus: 500 },
    { inputA: "bandits_special",         inputB: "choc_hazelnut_lava",      outputId: "dads_secret_recipe",           multiplier: 0.6, bonus: 600 },
    { inputA: "bandits_special",         inputB: "berry_avalanche",         outputId: "bandits_berry_blitz",          multiplier: 0.6, bonus: 450 },
    { inputA: "chillis_disaster_waffle", inputB: "berry_avalanche",         outputId: "chillis_redemption_plate",     multiplier: 0.5, bonus: 800 },
    { inputA: "chillis_disaster_waffle", inputB: "choc_hazelnut_lava",      outputId: "chillis_choc_meltdown",        multiplier: 0.5, bonus: 750 },
    // Secret recipes (4)
    { inputA: "chillis_disaster_waffle", inputB: "maple_monsoon",           outputId: "the_heeler_family_breakfast",  multiplier: 0.5, bonus: 2000 },
    { inputA: "the_heeler_family_breakfast", inputB: "the_bluey_golden_waffle", outputId: "jalens_67_eternal_waffle", multiplier: 0.3, bonus: 10000 },
    { inputA: "tripzs_pancake",          inputB: "drizzle_of_honey",       outputId: "tripzs_redemption_arc",        multiplier: 1.0, bonus: 300 },
    { inputA: "bingos_redemption_bite",  inputB: "berry_avalanche",         outputId: "bingos_brunch_special",        multiplier: 0.8, bonus: 1000 },
];

/** Default drop weights by rarity (normal mode). */
export const DEFAULT_DROP_WEIGHTS: Record<CardRarity, number> = {
    common: 60,
    uncommon: 25,
    rare: 10,
    epic: 4,
    legendary: 1,
};

/** Final 24h drop weights — bias toward rare+. */
export const FINAL24H_DROP_WEIGHTS: Record<CardRarity, number> = {
    common: 28,
    uncommon: 24,
    rare: 24,
    epic: 16,
    legendary: 8,
};

export const INFUSION_LEVELS: {
    cost: number;
    burnRisk: number;
    multiplierRange: [number, number];
}[] = [
    { cost: 150,  burnRisk: 0.05, multiplierRange: [1.3, 1.7] }, // 1→2
    { cost: 400,  burnRisk: 0.15, multiplierRange: [1.8, 2.3] }, // 2→3
    { cost: 1000, burnRisk: 0.30, multiplierRange: [2.5, 3.5] }, // 3→4
    { cost: 3000, burnRisk: 0.50, multiplierRange: [4.0, 6.0] }, // 4→5
];

/** Find a recipe matching two card template IDs (order-insensitive). */
export function findRecipe(cardIdA: string, cardIdB: string): CombinationRecipe | undefined {
    return COMBINATION_RECIPES.find(r =>
        (r.inputA === cardIdA && r.inputB === cardIdB) ||
        (r.inputA === cardIdB && r.inputB === cardIdA)
    );
}

/** Compute output value for a combination. */
export function computeCombinedValue(valueA: number, valueB: number, recipe: CombinationRecipe): number {
    return Math.floor((Math.abs(valueA) + Math.abs(valueB)) * recipe.multiplier + recipe.bonus);
}
