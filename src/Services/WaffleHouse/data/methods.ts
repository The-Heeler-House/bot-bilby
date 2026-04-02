export interface ScoringMethod {
    id: string;
    name: string;
    points: number;       // positive or negative
    cooldownMs: number;   // 0 = no cooldown
}

export const SCORING_METHODS: ScoringMethod[] = [
    { id: "lonely_waffle",          name: "Lonely Waffle",          points: 2,    cooldownMs: 60 * 1000 },
    { id: "just_sayin",             name: "Just Sayin'",            points: 10,   cooldownMs: 90 * 1000 },
    { id: "lazy_waffle",            name: "Lazy Waffle",            points: 100,  cooldownMs: 10 * 60 * 1000 },
    { id: "w4ff13sp34k",            name: "W4ff13sp34k",            points: 20,   cooldownMs: 5 * 60 * 1000 },
    { id: "eating_backwards",       name: "Eating Backwards",       points: 60,   cooldownMs: 15 * 60 * 1000 },
    { id: "waffle_fan",             name: "Waffle Fan",             points: 20,   cooldownMs: 5 * 60 * 1000 },
    { id: "waffle_scramble",        name: "Waffle Scramble",        points: 10,   cooldownMs: 90 * 1000 },
    { id: "the_basics",             name: "The Basics",             points: 20,   cooldownMs: 90 * 1000 },
    { id: "feeling_very_waffle",    name: "Feeling Very Waffle",    points: 20,   cooldownMs: 90 * 1000 },
    { id: "so_waffley",             name: "So Waffley",             points: 10,   cooldownMs: 90 * 1000 },
    { id: "become_waffle",          name: "Become Waffle",          points: 60,   cooldownMs: 300 * 1000 },
    { id: "get_waffled",            name: "Get Waffled!",           points: 30,   cooldownMs: 90 * 1000 },
    { id: "waffle_gif",             name: "Waffle GIF",             points: 40,   cooldownMs: 180 * 1000 },
    { id: "waffle_acronym",         name: "Waffle Acronym",         points: 40,   cooldownMs: 180 * 1000 },
    { id: "blueys_brekkie",         name: "Bluey's Brekkie",        points: 30,   cooldownMs: 300 * 1000 },
    { id: "bingos_brunch",          name: "Bingo's Brunch",         points: 30,   cooldownMs: 300 * 1000 },
    { id: "change_of_topic",        name: "Change of Topic",        points: 100,  cooldownMs: 10 * 60 * 1000 },
    { id: "betrayal",               name: "Betrayal",                points: -2,   cooldownMs: 60 * 1000 },
    { id: "sneaky_betrayal",        name: "Sneaky Betrayal",         points: -40,  cooldownMs: 300 * 1000 },
    { id: "heartbreaker",           name: "Heartbreaker",            points: -10,  cooldownMs: 90 * 1000 },
    { id: "waffle_hater",           name: "Waffle Hater",            points: -40,  cooldownMs: 60 * 1000 },
    { id: "heretic",                name: "Heretic",                 points: -100, cooldownMs: 10 * 60 * 1000 },
    { id: "too_cheeky",             name: "Too Cheeky",              points: -10,  cooldownMs: 60 * 1000 },
    { id: "you_think_youre_cute",   name: "You Think You're Cute",   points: -60,  cooldownMs: 300 * 1000 },
    { id: "you_take_that_back",     name: "You Take That Back",      points: -200, cooldownMs: 15 * 60 * 1000 },
];

export const METHOD_MAP = new Map<string, ScoringMethod>(
    SCORING_METHODS.map(m => [m.id, m])
);
