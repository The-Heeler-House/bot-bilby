export interface WaffleUser {
    userId: string;
    isTestData?: boolean;
    testRunId?: string;
    total_wp_earned: number;
    current_wp: number;
    reserved_wp: number;
    active_bids: Record<string, number>;
    discovered_methods: string[];
    milestones_hit: number[];
    hungry_count: number;
    hungry_awarded: boolean;
    first_waffle_awarded: boolean;
    spawn_claim_blocked_until_serial: number;
    used_acronym_responses: string[];
    cooldowns: {
        [methodId: string]: number; // epoch ms of last trigger
    };
}

export function defaultWaffleUser(userId: string): WaffleUser {
    return {
        userId,
        total_wp_earned: 0,
        current_wp: 0,
        reserved_wp: 0,
        active_bids: {},
        discovered_methods: [],
        milestones_hit: [],
        hungry_count: 0,
        hungry_awarded: false,
        first_waffle_awarded: false,
        spawn_claim_blocked_until_serial: 0,
        used_acronym_responses: [],
        cooldowns: {},
    };
}
