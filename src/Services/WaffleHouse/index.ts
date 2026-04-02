import { Client, Guild } from "discord.js";
import { Services } from "../index";
import ScoringEngine from "./ScoringEngine";
import GlazeManager from "./GlazeManager";
import CardManager from "./CardManager";
import MinigameManager from "./MinigameManager";
import AuctionManager from "./AuctionManager";
import LeaderboardManager from "./LeaderboardManager";
import { WaffleEventState } from "./models/waffleEventState";
import { defaultWaffleRuntimeStats, WaffleRuntimeCounterSet } from "./models/waffleRuntimeStats";
import { THH_SERVER_ID, waffleChannelIds, waffleRoleIds } from "../../constants";

export default class WaffleHouseService {
    public client: Client;

    // Subsystem managers
    public scoringEngine: ScoringEngine;
    public glazeManager: GlazeManager;
    public cardManager: CardManager;
    public minigameManager: MinigameManager;
    public auctionManager: AuctionManager;
    public leaderboardManager: LeaderboardManager;

    // In-memory event state (authoritative copy, synced to DB)
    public eventState: WaffleEventState | null = null;

    // Spam detection: per-user recent waffle message timestamps
    public recentWaffleMessages: Record<string, number[]> = {};
    private heartbeat: NodeJS.Timeout | null = null;
    private lastCleanupAt = 0;
    private lastRuntimeStatsAt = 0;
    private heartbeatRunning = false;

    constructor(client: Client) {
        this.client = client;
        this.scoringEngine = new ScoringEngine(this);
        this.glazeManager = new GlazeManager(this);
        this.cardManager = new CardManager(this);
        this.minigameManager = new MinigameManager(this);
        this.auctionManager = new AuctionManager(this);
        this.leaderboardManager = new LeaderboardManager(this);
    }

    async initialize(services: Services): Promise<void> {
        const { database } = services;

        // Load or create event state
        let state = await database.collections.waffleEventState!.findOne({ _id: "event_state" });
        if (!state) {
            state = this.defaultEventState();
            await database.collections.waffleEventState!.insertOne(state as any);
        }
        this.eventState = state;
        await this.ensureIndexes(services);
        await this.ensureRuntimeStats(services);

        if (!state.eventActive) {
            return;
        }

        // Clean expired glazes on startup
        await this.glazeManager.cleanExpired(services);

        // Initialize subsystem state and perform a first recovery sweep
        await this.cardManager.initialize(services);
        await this.minigameManager.initialize(services);
        await this.auctionManager.initialize(services);
        this.startHeartbeat(services);
    }

    private defaultEventState(): WaffleEventState {
        const now = Date.now();
        return {
            _id: "event_state",
            final24h: false,
            eventActive: false,
            totalWpEarnedServerWide: 0,
            waffleWpCounter: 0,
            spawnThreshold: 350,
            glazeBurnCounters: {},
            nextMinigameAt: now + 30 * 60 * 1000,
            nextMinigameIndex: 0,
            currentMinigameId: null,
            nextAuctionAt: now + 30 * 60 * 1000,
            currentAuctionBatchMessageId: null,
            currentSpawnId: null,
            dayOfEvent: 1,
            usedDefaultPrompts: {
                chef_battle: [],
                anonymous_poll: [],
                prompt_entry: [],
            },
        };
    }

    async setFinal24h(value: boolean, services: Services): Promise<void> {
        if (!this.eventState) return;
        this.eventState.final24h = value;
        await services.database.collections.waffleEventState!.updateOne({ _id: "event_state" }, { $set: { final24h: value } });
    }

    async setEventActive(value: boolean, services: Services): Promise<void> {
        if (!this.eventState) return;
        this.eventState.eventActive = value;
        await services.database.collections.waffleEventState!.updateOne({ _id: "event_state" }, { $set: { eventActive: value } });
        if (value) {
            await this.cardManager.initialize(services);
            await this.minigameManager.initialize(services);
            await this.auctionManager.initialize(services);
            this.startHeartbeat(services);
        } else {
            this.stopHeartbeat();
        }
    }

    private startHeartbeat(services: Services): void {
        this.stopHeartbeat();
        this.heartbeat = setInterval(async () => {
            try {
                await this.tickHeartbeat(services);
            } catch {
                // best effort heartbeat sweep
            }
        }, 5_000);
    }

    private stopHeartbeat(): void {
        if (this.heartbeat) {
            clearInterval(this.heartbeat);
            this.heartbeat = null;
        }
    }

    private async tickHeartbeat(services: Services): Promise<void> {
        if (!this.eventState?.eventActive) return;
        if (this.heartbeatRunning) return;

        this.heartbeatRunning = true;
        try {
            await this.cardManager.sweep(services);
            await this.minigameManager.sweep(services);
            await this.auctionManager.sweep(services);

            const now = Date.now();
            if (now - this.lastCleanupAt >= 60_000) {
                this.lastCleanupAt = now;
                await this.glazeManager.cleanExpired(services);
            }
            if (now - this.lastRuntimeStatsAt >= 60_000) {
                this.lastRuntimeStatsAt = now;
                await this.refreshRuntimeStats(services);
            }
        } finally {
            this.heartbeatRunning = false;
        }
    }

    configIsReady(): boolean {
        return ![
            waffleChannelIds.counter,
            waffleChannelIds.house,
            waffleChannelIds.noWaffle,
            waffleChannelIds.blueyTalk,
            waffleRoleIds.waffleVeteran,
        ].some(value => value.startsWith("PLACEHOLDER"));
    }

    getEventGuild(): Guild | null {
        return this.client.guilds.cache.get(THH_SERVER_ID) ?? null;
    }

    private async ensureIndexes(services: Services): Promise<void> {
        await services.database.collections.waffleUsers?.createIndex({ userId: 1 }, { unique: true });
        await services.database.collections.waffleCards?.createIndex({ ownerId: 1, auctionStatus: 1 });
        await services.database.collections.waffleCards?.createIndex({ cardId: 1 });
        await services.database.collections.waffleGlazes?.createIndex({ userId: 1, expiresAt: 1 });
        await services.database.collections.waffleAuctions?.createIndex({ status: 1, resolvesAt: 1 });
        await services.database.collections.waffleAuctions?.createIndex({ sellerId: 1 });
        await services.database.collections.waffleMinigames?.createIndex({ status: 1, phaseEndsAt: 1 });
        await services.database.collections.wafflePromptQueue?.createIndex({ gameType: 1, addedAt: 1 });
        await services.database.collections.waffleFrenchToast?.createIndex({ count: -1 });
        await services.database.collections.waffleSpawns?.createIndex({ status: 1, expiresAt: 1 });
        await services.database.collections.waffleSpawns?.createIndex({ messageId: 1 });
        await services.database.collections.waffleTestRuns?.createIndex({ testRunId: 1 }, { unique: true });
        await services.database.collections.waffleTestRuns?.createIndex({ status: 1, startedAt: -1 });
        await services.database.collections.waffleRuntimeStats?.createIndex({ updatedAt: -1 });
    }

    async bumpRuntimeCounter(
        key: keyof WaffleRuntimeCounterSet,
        amount: number,
        services: Services,
    ): Promise<void> {
        if (amount === 0) return;
        await services.database.collections.waffleRuntimeStats?.updateOne(
            { _id: "runtime_stats" },
            {
                $inc: { [`counters.${key}`]: amount },
                $set: { updatedAt: Date.now() },
            },
            { upsert: true }
        );
    }

    private async ensureRuntimeStats(services: Services): Promise<void> {
        const existing = await services.database.collections.waffleRuntimeStats?.findOne({ _id: "runtime_stats" });
        if (!existing) {
            await services.database.collections.waffleRuntimeStats?.insertOne(defaultWaffleRuntimeStats() as any);
        }
    }

    private async refreshRuntimeStats(services: Services): Promise<void> {
        const collection = services.database.collections.waffleRuntimeStats;
        if (!collection) return;

        const stats = await collection.findOne({ _id: "runtime_stats" }) ?? defaultWaffleRuntimeStats();
        const counters = stats.counters ?? defaultWaffleRuntimeStats().counters;
        const now = Date.now();

        const [totalCards, totalOwnedCards, pooledAuctions, liveAuctions, totalUsers] = await Promise.all([
            services.database.collections.waffleCards!.countDocuments(),
            services.database.collections.waffleCards!.countDocuments({ ownerId: { $ne: null } }),
            services.database.collections.waffleAuctions!.countDocuments({ status: "pooled" }),
            services.database.collections.waffleAuctions!.countDocuments({ status: "live" }),
            services.database.collections.waffleUsers!.countDocuments(),
        ]);

        const snapshot = {
            at: now,
            ...counters,
            totalCards,
            totalOwnedCards,
            pooledAuctions,
            liveAuctions,
            totalUsers,
            totalWpEarnedServerWide: this.eventState?.totalWpEarnedServerWide ?? 0,
        };

        const snapshots = [...(stats.snapshots ?? []), snapshot].slice(-1440);
        const oneHourAgo = now - 60 * 60 * 1000;
        const baseline = [...snapshots].reverse().find(entry => entry.at <= oneHourAgo) ?? snapshots[0];

        const ratesLastHour = baseline ? {
            manualWpPerHour: snapshot.manualWpEarned - baseline.manualWpEarned,
            minigameWpPerHour: snapshot.minigameWpEarned - baseline.minigameWpEarned,
            spawnsPerHour: snapshot.spawnedCards - baseline.spawnedCards,
            claimsPerHour: snapshot.claimedSpawns - baseline.claimedSpawns,
            expirationsPerHour: snapshot.expiredSpawns - baseline.expiredSpawns,
            discardsPerHour: snapshot.discardedCards - baseline.discardedCards,
            auctionSalesPerHour: snapshot.auctionSales - baseline.auctionSales,
            auctionSaleWpPerHour: snapshot.auctionSaleWp - baseline.auctionSaleWp,
        } : defaultWaffleRuntimeStats().ratesLastHour;

        await collection.updateOne(
            { _id: "runtime_stats" },
            {
                $set: {
                    updatedAt: now,
                    current: {
                        ...counters,
                        totalCards,
                        totalOwnedCards,
                        pooledAuctions,
                        liveAuctions,
                        totalUsers,
                        totalWpEarnedServerWide: this.eventState?.totalWpEarnedServerWide ?? 0,
                    },
                    ratesLastHour,
                    snapshots,
                },
                $setOnInsert: {
                    counters,
                },
            },
            { upsert: true }
        );
    }
}
