import { Services } from "../index";
import { GLAZES, BURNS, PANCAKE_BURN, GlazeDefinition, BurnDefinition, upgradeBurn } from "./data/glazes";
import { burnNotifyEmbed, glazeNotifyEmbed } from "./util/embeds";
import type WaffleHouseService from "./index";

export default class GlazeManager {
    private waffle: WaffleHouseService;

    constructor(waffle: WaffleHouseService) {
        this.waffle = waffle;
    }

    async getNetMultiplier(userId: string, services: Services): Promise<number> {
        const { database } = services;
        const now = Date.now();
        const activeGlazes = await database.collections.waffleGlazes!.find({ userId, expiresAt: { $gt: now } }).toArray();
        let net = 1;
        for (const g of activeGlazes) {
            if (g.type === "glaze") net += g.multiplier;
            else net -= g.multiplier;
        }
        return net;
    }

    async applyGlaze(userId: string, glazeId: string, services: Services, overrideDurationMs?: number): Promise<boolean> {
        const { database } = services;
        const def = GLAZES.find(g => g.id === glazeId);
        if (!def) return false;

        const tuning = await database.collections.waffleTuning!.findOne({ _id: "tuning" });
        const multiplier = tuning?.glazeMultipliers?.[glazeId] ?? def.multiplier;
        let durationMs = tuning?.glazeDurations?.[glazeId] ?? def.durationMs;
        if (overrideDurationMs != null) durationMs = overrideDurationMs;
        if (this.waffle.eventState?.final24h) durationMs *= 2;

        const now = Date.now();
        await database.collections.waffleGlazes!.insertOne({
            userId,
            glazeId,
            type: "glaze",
            multiplier,
            appliedAt: now,
            expiresAt: now + durationMs,
        });

        try {
            const { client } = this.waffle;
            const user = await client.users.fetch(userId);
            const dm = await user.createDM();
            await dm.send({ embeds: [glazeNotifyEmbed(def.name, durationMs)] });
        } catch { /* DMs blocked */ }
        return true;
    }

    async applyBurn(userId: string, burnId: string, services: Services, overrideDurationMs?: number): Promise<boolean> {
        const { database } = services;
        // Upgrade burn tier in final24h for minigame losers if requested
        const effectiveBurnId = burnId;
        const def = BURNS.find(b => b.id === effectiveBurnId);
        if (!def) return false;

        const tuning = await database.collections.waffleTuning!.findOne({ _id: "tuning" });
        const penalty = tuning?.burnPenalties?.[effectiveBurnId] ?? def.penalty;
        let durationMs = tuning?.burnDurations?.[effectiveBurnId] ?? def.durationMs;
        if (overrideDurationMs != null) durationMs = overrideDurationMs;
        if (this.waffle.eventState?.final24h) durationMs *= 2;

        const now = Date.now();
        await database.collections.waffleGlazes!.insertOne({
            userId,
            glazeId: effectiveBurnId,
            type: "burn",
            multiplier: penalty,
            appliedAt: now,
            expiresAt: now + durationMs,
        });

        try {
            const user = await this.waffle.client.users.fetch(userId);
            const dm = await user.createDM();
            await dm.send({ embeds: [burnNotifyEmbed(def.name, durationMs)] });
        } catch { /* DMs blocked */ }
        return true;
    }

    async applyPancakeBurn(userId: string, services: Services): Promise<boolean> {
        const { database } = services;
        const def = PANCAKE_BURN;
        let durationMs = def.durationMs;
        if (this.waffle.eventState?.final24h) durationMs *= 2;
        const now = Date.now();

        // Don't stack pancake burns — check if one is already active
        const existing = await database.collections.waffleGlazes!.findOne({
            userId, glazeId: def.id, expiresAt: { $gt: now }
        });
        if (existing) return false;

        await database.collections.waffleGlazes!.insertOne({
            userId,
            glazeId: def.id,
            type: "burn",
            multiplier: def.penalty,
            appliedAt: now,
            expiresAt: now + durationMs,
        });

        try {
            const user = await this.waffle.client.users.fetch(userId);
            const dm = await user.createDM();
            await dm.send({ embeds: [burnNotifyEmbed(def.name, durationMs)] });
        } catch { /* DMs blocked */ }
        return true;
    }

    /** Increment server-wide counters for each glaze/burn type and trigger if threshold crossed. */
    async tickCounters(userId: string, services: Services): Promise<{ triggered: boolean; effects: string[] }> {
        const { database } = services;
        const eventState = this.waffle.eventState;
        if (!eventState) return { triggered: false, effects: [] };

        const tuning = await database.collections.waffleTuning!.findOne({ _id: "tuning" });
        const final24h = eventState.final24h;

        const glazeEffects = GLAZES.filter(g => !g.final24hOnly || final24h);
        const burnEffects = BURNS.filter(b => !b.final24hOnly || final24h);

        const updates: Record<string, any> = {};
        const triggered: { id: string; type: "glaze" | "burn" }[] = [];

        if (glazeEffects.length > 0) {
            const glazeState = eventState.glazeBurnCounters.glaze_pool ?? {
                counter: 0,
                threshold: this.rollThreshold(this.getPoolRange(glazeEffects, tuning), final24h),
            };
            const glazeCounter = glazeState.counter + 1;
            if (glazeCounter >= glazeState.threshold) {
                const chosen = this.pickWeightedEffect(glazeEffects, tuning);
                if (chosen) triggered.push({ id: chosen.id, type: "glaze" });
                updates["glazeBurnCounters.glaze_pool"] = {
                    counter: 0,
                    threshold: this.rollThreshold(this.getPoolRange(glazeEffects, tuning), final24h),
                };
            } else {
                updates["glazeBurnCounters.glaze_pool"] = {
                    counter: glazeCounter,
                    threshold: glazeState.threshold,
                };
            }
        }

        if (burnEffects.length > 0) {
            const burnState = eventState.glazeBurnCounters.burn_pool ?? {
                counter: 0,
                threshold: this.rollThreshold(this.getPoolRange(burnEffects, tuning), final24h),
            };
            const burnCounter = burnState.counter + 1;
            if (burnCounter >= burnState.threshold) {
                const chosen = this.pickWeightedEffect(burnEffects, tuning);
                if (chosen) triggered.push({ id: chosen.id, type: "burn" });
                updates["glazeBurnCounters.burn_pool"] = {
                    counter: 0,
                    threshold: this.rollThreshold(this.getPoolRange(burnEffects, tuning), final24h),
                };
            } else {
                updates["glazeBurnCounters.burn_pool"] = {
                    counter: burnCounter,
                    threshold: burnState.threshold,
                };
            }
        }

        await database.collections.waffleEventState!.updateOne({ _id: "event_state" }, { $set: updates });
        // Update in-memory
        for (const [k, v] of Object.entries(updates)) {
            const parts = k.split(".");
            if (parts[0] === "glazeBurnCounters") {
                eventState.glazeBurnCounters[parts[1]] = v;
            }
        }

        for (const { id, type } of triggered) {
            if (type === "glaze") {
                await this.applyGlaze(userId, id, services);
            } else {
                await this.applyBurn(userId, id, services);
            }
        }
        return { triggered: triggered.length > 0, effects: triggered.map(effect => effect.id) };
    }

    private getPoolRange(effects: (GlazeDefinition | BurnDefinition)[], tuning: any): [number, number] {
        const ranges = effects.map(effect => this.getTriggerRange(effect, tuning));
        const min = Math.round(ranges.reduce((sum, range) => sum + range[0], 0) / ranges.length);
        const max = Math.round(ranges.reduce((sum, range) => sum + range[1], 0) / ranges.length);
        return [min, max];
    }

    private pickWeightedEffect<T extends GlazeDefinition | BurnDefinition>(effects: T[], tuning: any): T | null {
        if (effects.length === 0) return null;
        const weighted = effects.map(effect => {
            const range = this.getTriggerRange(effect, tuning);
            const averageThreshold = (range[0] + range[1]) / 2;
            return {
                effect,
                weight: averageThreshold > 0 ? 1 / averageThreshold : 1,
            };
        });
        const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
        let pick = Math.random() * total;
        for (const entry of weighted) {
            pick -= entry.weight;
            if (pick <= 0) return entry.effect;
        }
        return weighted[weighted.length - 1]?.effect ?? null;
    }

    private getTriggerRange(effect: GlazeDefinition | BurnDefinition, tuning: any): [number, number] {
        if (effect.type === "glaze") {
            return tuning?.glazeTriggerRanges?.[effect.id] ?? effect.triggerRange;
        } else {
            return tuning?.burnTriggerRanges?.[effect.id] ?? effect.triggerRange;
        }
    }

    private rollThreshold(range: [number, number], final24h: boolean): number {
        const [min, max] = final24h ? [Math.ceil(range[0] * 0.5), Math.ceil(range[1] * 0.5)] : range;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /** Upgrade a burn by one tier for final24h minigame loser penalties. */
    async applyMinigameBurn(userId: string, burnId: string, services: Services): Promise<void> {
        const effectiveBurnId = this.waffle.eventState?.final24h ? upgradeBurn(burnId) : burnId;
        await this.applyBurn(userId, effectiveBurnId, services);
    }

    /** Apply a glaze with final24h +1x bonus for minigame winners. */
    async applyMinigameGlaze(userId: string, glazeId: string, services: Services): Promise<void> {
        const { database } = services;
        const def = GLAZES.find(g => g.id === glazeId);
        if (!def) return;

        const tuning = await database.collections.waffleTuning!.findOne({ _id: "tuning" });
        let multiplier = tuning?.glazeMultipliers?.[glazeId] ?? def.multiplier;
        if (this.waffle.eventState?.final24h) multiplier += 1;

        let durationMs = tuning?.glazeDurations?.[glazeId] ?? def.durationMs;
        if (this.waffle.eventState?.final24h) durationMs *= 2;

        const now = Date.now();
        await database.collections.waffleGlazes!.insertOne({
            userId,
            glazeId,
            type: "glaze",
            multiplier,
            appliedAt: now,
            expiresAt: now + durationMs,
        });

        try {
            const user = await this.waffle.client.users.fetch(userId);
            const dm = await user.createDM();
            await dm.send({ embeds: [glazeNotifyEmbed(def.name, durationMs)] });
        } catch { /* DMs blocked */ }
    }

    async cleanExpired(services: Services): Promise<void> {
        await services.database.collections.waffleGlazes!.deleteMany({ expiresAt: { $lte: Date.now() } });
    }
}
