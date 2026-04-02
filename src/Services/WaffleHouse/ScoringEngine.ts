import { GuildMember, Message } from "discord.js";
import { Services } from "../index";
import { METHOD_MAP } from "./data/methods";
import {
    detectLonelyWaffle, detectJustSayin, detectLazyWaffle, detectWaffleScramble,
    detectW4ff13sp34k, detectEatingBackwards, detectWaffleFan,
    detectTheBasics, detectFeelingVeryWaffle, detectSoWaffley, detectBecomeWaffle,
    detectGetWaffled, detectWaffleGif, detectWaffleAcronym, detectBlueysBrekkie,
    detectBingosBrunch, detectChangeOfTopic, detectBetrayal, detectSneakyBetrayal,
    detectHeartbreaker, detectWaffleHater, detectHeretic, detectTooCheeky, detectYouThinkYoureCute,
    detectYouTakeThatBack,
    detectFrenchToast, detectPancakeMention, containsWaffle,
} from "./util/scoring-detectors";
import { discoveryEmbed, milestoneEmbed } from "./util/embeds";
import { waffleChannelIds, waffleEmojiIds, channelIds } from "../../constants";
import { defaultWaffleUser, WaffleUser } from "./models/waffleUser";
import type WaffleHouseService from "./index";

const MILESTONES = [1000, 5000, 15000, 40000, 100000];
const NEGATIVE_METHOD_IDS = new Set([
    "betrayal",
    "sneaky_betrayal",
    "heartbreaker",
    "waffle_hater",
    "heretic",
    "too_cheeky",
    "you_think_youre_cute",
    "you_take_that_back",
]);

export default class ScoringEngine {
    private waffle: WaffleHouseService;

    constructor(waffle: WaffleHouseService) {
        this.waffle = waffle;
    }

    async evaluate(message: Message, services: Services): Promise<void> {
        const { database } = services;
        const content = message.content;
        const channelId = message.channelId;
        const userId = message.author.id;

        if (process.env.PREFIX && content.startsWith(process.env.PREFIX)) {
            return;
        }

        // Step 1: Spam check (Tummy Ache)
        const waffleMatches = (content.match(/\bwaffles?\b/gi) || []).length;
        if (waffleMatches >= 8) {
            await this.applyTummyAche(message, services);
            return;
        }

        // Track rapid waffle messages in volatile state
        const now = Date.now();
        const spamKey = `spam_${userId}`;
        if (!this.waffle.recentWaffleMessages) this.waffle.recentWaffleMessages = {};
        const recentTimes: number[] = (this.waffle.recentWaffleMessages[userId] || []).filter(t => now - t < 30000);
        if (containsWaffle(content)) {
            recentTimes.push(now);
            this.waffle.recentWaffleMessages[userId] = recentTimes;
            if (recentTimes.length > 3) {
                await this.applyTummyAche(message, services);
                return;
            }
        }

        // Step 2: French Toast counter
        if (detectFrenchToast(content)) {
            const increment = this.waffle.eventState?.final24h ? 2 : 1;
            await database.collections.waffleFrenchToast!.updateOne(
                { userId },
                { $inc: { count: increment }, $setOnInsert: { userId } },
                { upsert: true }
            );
        }

        // Step 3: Channel exclusion
        if (channelId === waffleChannelIds.noWaffle) return;

        // Step 4: Evaluate all methods
        const triggered = this.runDetectors(content, message, channelId);

        // Apply exclusion rules
        this.applyExclusionRules(triggered);

        if (triggered.length === 0) {
            // Still check pancake burn and glaze triggers even if no scoring methods
            const pancakeBurnApplied = await this.checkPancakeBurn(content, userId, services);
            const hiddenEffects = containsWaffle(content)
                ? await this.waffle.glazeManager.tickCounters(userId, services)
                : { triggered: false, effects: [] };
            if (pancakeBurnApplied || hiddenEffects.triggered) {
                await message.react(waffleEmojiIds.blueyDerp || "😛").catch(() => null);
            }
            return;
        }

        // Load user record
        let waffleUser: WaffleUser | null = await database.collections.waffleUsers!.findOne({ userId });
        if (!waffleUser) {
            waffleUser = defaultWaffleUser(userId);
        }

        const filtered = this.filterTriggeredMethods(triggered, waffleUser, await database.collections.waffleTuning!.findOne({ _id: "tuning" }), now);

        if (filtered.length === 0) {
            const pancakeBurnApplied = await this.checkPancakeBurn(content, userId, services);
            const hiddenEffects = containsWaffle(content)
                ? await this.waffle.glazeManager.tickCounters(userId, services)
                : { triggered: false, effects: [] };
            if (pancakeBurnApplied || hiddenEffects.triggered) {
                await message.react(waffleEmojiIds.blueyDerp || "😛").catch(() => null);
            }
            return;
        }

        const tuning = await database.collections.waffleTuning!.findOne({ _id: "tuning" });

        // Step 6: Calculate base WP
        let baseWP = 0;
        for (const methodId of filtered) {
            const method = METHOD_MAP.get(methodId)!;
            const points = tuning?.methodPoints?.[methodId] ?? method.points;
            if (this.waffle.eventState?.final24h) {
                baseWP += points > 0 ? points * 2 : points * 3;
            } else {
                baseWP += points;
            }
        }

        // Step 7: Apply net glaze/burn multiplier
        const netMultiplier = await this.waffle.glazeManager.getNetMultiplier(userId, services);
        const finalWP = Math.round(baseWP * netMultiplier);

        // Step 8: Update user record
        const isFirstWaffle = !waffleUser.first_waffle_awarded && finalWP > 0;
        const newCooldowns: Record<string, number> = {};
        for (const methodId of filtered) {
            newCooldowns[`cooldowns.${methodId}`] = now;
        }

        const hungryCriteria = content.length >= 30 && containsWaffle(content);
        const hungerIncrement = hungryCriteria && !waffleUser.hungry_awarded ? 1 : 0;

        await database.collections.waffleUsers!.updateOne(
            { userId },
            {
                $inc: {
                    current_wp: finalWP,
                    total_wp_earned: finalWP > 0 ? finalWP : 0,
                    hungry_count: hungerIncrement,
                },
                $set: {
                    ...newCooldowns,
                    ...(isFirstWaffle ? { first_waffle_awarded: true } : {}),
                },
                $setOnInsert: {
                    userId,
                    reserved_wp: 0,
                    active_bids: {},
                    discovered_methods: [],
                    milestones_hit: [],
                    hungry_awarded: false,
                },
            },
            { upsert: true }
        );

        // Re-fetch for milestone checks
        const updatedUser = await database.collections.waffleUsers!.findOne({ userId });

        // Hungry award
        if (hungerIncrement > 0 && updatedUser && updatedUser.hungry_count >= 200 && !updatedUser.hungry_awarded) {
            await database.collections.waffleUsers!.updateOne(
                { userId },
                { $set: { hungry_awarded: true }, $inc: { current_wp: 50, total_wp_earned: 50 } }
            );
            await this.waffle.bumpRuntimeCounter("manualWpEarned", 50, services);
        }

        // Milestone check
        if (updatedUser) {
            const totalEarned = updatedUser.total_wp_earned;
            for (const milestone of MILESTONES) {
                if (totalEarned >= milestone && !updatedUser.milestones_hit.includes(milestone)) {
                    await database.collections.waffleUsers!.updateOne({ userId }, { $addToSet: { milestones_hit: milestone } });
                    try {
                        const dmChannel = await message.author.createDM();
                        await dmChannel.send({ embeds: [milestoneEmbed(milestone, totalEarned)] });
                    } catch { /* DMs blocked */ }
                }
            }
        }

        // Step 9: First-discovery DMs
        const newMethods = filtered.filter(methodId => !waffleUser.discovered_methods.includes(methodId));
        if (newMethods.length > 0) {
            await database.collections.waffleUsers!.updateOne({ userId }, { $addToSet: { discovered_methods: { $each: newMethods } } });
            for (const methodId of newMethods) {
                const method = METHOD_MAP.get(methodId)!;
                const points = tuning?.methodPoints?.[methodId] ?? method.points;
                try {
                    const dmChannel = await message.author.createDM();
                    await dmChannel.send({ embeds: [discoveryEmbed(method.name, points)] });
                } catch { /* DMs blocked */ }
            }
        }

        // Step 10: Pancake Burn check
        const pancakeBurnApplied = await this.checkPancakeBurn(content, userId, services);

        // Step 11: Glaze/burn random triggers
        let hiddenEffects = { triggered: false, effects: [] as string[] };
        if (containsWaffle(content)) {
            hiddenEffects = await this.waffle.glazeManager.tickCounters(userId, services);
        }

        if (filtered.some(methodId => !NEGATIVE_METHOD_IDS.has(methodId))) {
            await message.react("🧇").catch(() => null);
        }
        if (pancakeBurnApplied || hiddenEffects.triggered) {
            await message.react(waffleEmojiIds.blueyDerp || "😛").catch(() => null);
        }

        // Step 12: Card spawn check
        if (finalWP > 0) {
            await this.waffle.bumpRuntimeCounter("manualWpEarned", finalWP, services);
            await this.waffle.cardManager.tickWpCounter(finalWP, message, services);
        }

        // Alliance scoring: if an alliance game is active and user is in a team
        await this.waffle.minigameManager.handleAllianceScore(userId, finalWP, services);
    }

    countTriggeredMethods(content: string, channelId: string): number {
        const fakeMessage = {
            content,
            attachments: new Map(),
            embeds: [],
        } as unknown as Message;
        const triggered = this.runDetectors(content, fakeMessage, channelId);
        this.applyExclusionRules(triggered);
        return triggered.length;
    }

    private filterTriggeredMethods(triggered: string[], waffleUser: WaffleUser, tuning: any, now: number): string[] {
        return triggered.filter(methodId => {
            const method = METHOD_MAP.get(methodId)!;
            const cooldownMs = tuning?.methodCooldowns?.[methodId] ?? method.cooldownMs;
            if (cooldownMs === 0) return true;
            const effectiveCooldown = this.waffle.eventState?.final24h && method.points > 0
                ? Math.floor(cooldownMs / 1000 / 2) * 1000
                : cooldownMs;
            const lastTrigger = waffleUser.cooldowns[methodId] ?? 0;
            return now - lastTrigger >= effectiveCooldown;
        });
    }

    private runDetectors(content: string, message: Message, channelId: string): string[] {
        const triggered: string[] = [];

        if (detectLonelyWaffle(content)) triggered.push("lonely_waffle");
        if (detectJustSayin(content)) triggered.push("just_sayin");
        if (detectLazyWaffle(content)) triggered.push("lazy_waffle");
        if (detectW4ff13sp34k(content)) triggered.push("w4ff13sp34k");
        if (detectEatingBackwards(content)) triggered.push("eating_backwards");
        if (detectWaffleFan(content)) triggered.push("waffle_fan");
        if (detectWaffleScramble(content)) triggered.push("waffle_scramble");
        if (detectTheBasics(content)) triggered.push("the_basics");
        if (detectFeelingVeryWaffle(content)) triggered.push("feeling_very_waffle");
        if (detectSoWaffley(content)) triggered.push("so_waffley");
        if (detectBecomeWaffle(content)) triggered.push("become_waffle");
        if (detectGetWaffled(content)) triggered.push("get_waffled");
        if (detectWaffleGif(content, message.attachments, message.embeds)) triggered.push("waffle_gif");
        if (detectWaffleAcronym(content)) triggered.push("waffle_acronym");
        if (detectBlueysBrekkie(content, channelId, waffleChannelIds.blueyTalk)) triggered.push("blueys_brekkie");
        if (detectBingosBrunch(content, channelId, waffleChannelIds.blueyTalk)) triggered.push("bingos_brunch");
        if (detectChangeOfTopic(content, channelId, channelIds.offTopic)) triggered.push("change_of_topic");
        if (detectBetrayal(content)) triggered.push("betrayal");
        if (detectSneakyBetrayal(content)) triggered.push("sneaky_betrayal");
        if (detectHeartbreaker(content)) triggered.push("heartbreaker");
        if (detectWaffleHater(content)) triggered.push("waffle_hater");
        if (detectHeretic(content)) triggered.push("heretic");
        if (detectTooCheeky(content)) triggered.push("too_cheeky");
        if (detectYouThinkYoureCute(content)) triggered.push("you_think_youre_cute");
        if (detectYouTakeThatBack(content)) triggered.push("you_take_that_back");

        return triggered;
    }

    private applyExclusionRules(triggered: string[]): void {
        const has = (id: string) => triggered.includes(id);
        const remove = (id: string) => {
            const idx = triggered.indexOf(id);
            if (idx !== -1) triggered.splice(idx, 1);
        };

        if (has("lonely_waffle")) remove("just_sayin");
        if (has("sneaky_betrayal")) remove("betrayal");
        if (has("you_think_youre_cute")) remove("too_cheeky");
        if (has("waffle_hater")) {
            remove("just_sayin");
            remove("lonely_waffle");
            remove("waffle_fan");
        }
        if (has("get_waffled") || has("so_waffley") || has("become_waffle")) remove("just_sayin");

        // The Basics and Waffle Scramble only fire when "waffle" is NOT contiguous
        // (already handled in detectors — they return false if contiguous "waffle" present)
    }

    private async applyTummyAche(message: Message, services: Services): Promise<void> {
        try {
            await message.react(waffleEmojiIds.blueyDerp || "😛");
        } catch { /* best effort */ }
        try {
            const member = message.member as GuildMember;
            if (member?.moderatable) {
                await member.timeout(60 * 1000, "Tummy Ache: waffle spam");
            }
        } catch { /* permissions issue */ }
    }

    private async checkPancakeBurn(content: string, userId: string, services: Services): Promise<boolean> {
        if (detectPancakeMention(content)) {
            return this.waffle.glazeManager.applyPancakeBurn(userId, services);
        }
        return false;
    }
}
