export interface ScoringMethod {
    id: string;
    name: string;
    points: number;       // positive or negative
    cooldownMs: number;   // 0 = no cooldown
}

export const SCORING_METHODS: ScoringMethod[] = [
    { id: "lonely_waffle",          name: "Lonely Waffle",          points: 1,    cooldownMs: 60 * 1000 },
    { id: "just_sayin",             name: "Just Sayin'",            points: 5,    cooldownMs: 90 * 1000 },
    { id: "lazy_waffle",            name: "Lazy Waffle",            points: 50,   cooldownMs: 10 * 60 * 1000 },
    { id: "waffle_scramble",        name: "Waffle Scramble",        points: 5,    cooldownMs: 90 * 1000 },
    { id: "the_basics",             name: "The Basics",             points: 10,   cooldownMs: 90 * 1000 },
    { id: "feeling_very_waffle",    name: "Feeling Very Waffle",    points: 10,   cooldownMs: 90 * 1000 },
    { id: "so_waffley",             name: "So Waffley",             points: 5,    cooldownMs: 90 * 1000 },
    { id: "become_waffle",          name: "Become Waffle",          points: 30,   cooldownMs: 300 * 1000 },
    { id: "get_waffled",            name: "Get Waffled!",           points: 15,   cooldownMs: 90 * 1000 },
    { id: "waffle_gif",             name: "Waffle GIF",             points: 20,   cooldownMs: 180 * 1000 },
    { id: "waffle_acronym",         name: "Waffle Acronym",          points: 20,   cooldownMs: 180 * 1000 },
    { id: "blueys_brekkie",         name: "Bluey's Brekkie",         points: 15,   cooldownMs: 300 * 1000 },
    { id: "bingos_brunch",          name: "Bingo's Brunch",          points: 15,   cooldownMs: 300 * 1000 },
    { id: "change_of_topic",        name: "Change of Topic",         points: 50,   cooldownMs: 10 * 60 * 1000 },
    { id: "betrayal",               name: "Betrayal",                points: -1,   cooldownMs: 60 * 1000 },
    { id: "sneaky_betrayal",        name: "Sneaky Betrayal",         points: -20,  cooldownMs: 300 * 1000 },
    { id: "heartbreaker",           name: "Heartbreaker",            points: -5,   cooldownMs: 90 * 1000 },
    { id: "too_cheeky",             name: "Too Cheeky",              points: -5,   cooldownMs: 60 * 1000 },
    { id: "you_think_youre_cute",   name: "You Think You're Cute",   points: -30,  cooldownMs: 300 * 1000 },
];

export const METHOD_MAP = new Map<string, ScoringMethod>(
    SCORING_METHODS.map(m => [m.id, m])
);
