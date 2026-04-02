export interface WaffleRuntimeCounterSet {
    manualWpEarned: number;
    minigameWpEarned: number;
    spawnedCards: number;
    claimedSpawns: number;
    expiredSpawns: number;
    discardedCards: number;
    auctionSales: number;
    auctionSaleWp: number;
}

export interface WaffleRuntimeSnapshot extends WaffleRuntimeCounterSet {
    at: number;
    totalCards: number;
    totalOwnedCards: number;
    pooledAuctions: number;
    liveAuctions: number;
    totalUsers: number;
    totalWpEarnedServerWide: number;
}

export interface WaffleRuntimeStats {
    _id: "runtime_stats";
    updatedAt: number;
    counters: WaffleRuntimeCounterSet;
    current: Omit<WaffleRuntimeSnapshot, "at">;
    ratesLastHour: {
        manualWpPerHour: number;
        minigameWpPerHour: number;
        spawnsPerHour: number;
        claimsPerHour: number;
        expirationsPerHour: number;
        discardsPerHour: number;
        auctionSalesPerHour: number;
        auctionSaleWpPerHour: number;
    };
    snapshots: WaffleRuntimeSnapshot[];
}

export const defaultWaffleRuntimeCounters = (): WaffleRuntimeCounterSet => ({
    manualWpEarned: 0,
    minigameWpEarned: 0,
    spawnedCards: 0,
    claimedSpawns: 0,
    expiredSpawns: 0,
    discardedCards: 0,
    auctionSales: 0,
    auctionSaleWp: 0,
});

export const defaultWaffleRuntimeStats = (): WaffleRuntimeStats => ({
    _id: "runtime_stats",
    updatedAt: Date.now(),
    counters: defaultWaffleRuntimeCounters(),
    current: {
        ...defaultWaffleRuntimeCounters(),
        totalCards: 0,
        totalOwnedCards: 0,
        pooledAuctions: 0,
        liveAuctions: 0,
        totalUsers: 0,
        totalWpEarnedServerWide: 0,
    },
    ratesLastHour: {
        manualWpPerHour: 0,
        minigameWpPerHour: 0,
        spawnsPerHour: 0,
        claimsPerHour: 0,
        expirationsPerHour: 0,
        discardsPerHour: 0,
        auctionSalesPerHour: 0,
        auctionSaleWpPerHour: 0,
    },
    snapshots: [],
});
