import { ObjectId } from "mongodb";

export interface WaffleEventState {
    _id: string;
    final24h: boolean;
    eventActive: boolean;

    totalWpEarnedServerWide: number;
    waffleWpCounter: number;
    spawnThreshold: number;
    spawnSerial: number;

    glazeBurnCounters: {
        [glazeOrBurnId: string]: {
            counter: number;
            threshold: number;
        };
    };

    nextMinigameAt: number;
    nextMinigameIndex: number; // 0-3
    currentMinigameId: ObjectId | null;

    nextAuctionAt: number;
    currentAuctionBatchMessageId: string | null;
    currentSpawnId: ObjectId | null;

    dayOfEvent: number; // 1-7

    usedDefaultPrompts: {
        chef_battle: number[];
        anonymous_poll: number[];
        prompt_entry: number[];
    };
}

export interface WaffleFrenchToast {
    userId: string;
    isTestData?: boolean;
    testRunId?: string;
    count: number;
}

export interface WaffleTuning {
    _id: string;
    methodPoints?: { [methodId: string]: number };
    methodCooldowns?: { [methodId: string]: number };
    dropRateWeights?: { common?: number; uncommon?: number; rare?: number; epic?: number; legendary?: number };
    specialDropRateMultiplier?: number;
    glazeMultipliers?: { [glazeId: string]: number };
    glazeDurations?: { [glazeId: string]: number };
    glazeTriggerRanges?: { [glazeId: string]: [number, number] };
    burnPenalties?: { [burnId: string]: number };
    burnDurations?: { [burnId: string]: number };
    burnTriggerRanges?: { [burnId: string]: [number, number] };
    infusionCosts?: { [level: string]: number };
    infusionBurnRisks?: { [level: string]: number };
    spawnThresholdRange?: [number, number];
    auctionRefreshMs?: number;
    minigameIntervalMs?: number;
    minigameWp?: {
        chefBattle?: { winner?: number; loser?: number; tie?: number };
        poll?: { winner?: number; loser?: number; tie?: number };
        promptEntry?: { winner?: number; submitter?: number };
        alliance?: { winner?: number; loser?: number; tie?: number };
    };
}
