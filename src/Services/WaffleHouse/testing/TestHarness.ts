import { EmbedBuilder } from "discord.js";
import { ObjectId } from "mongodb";
import { Services } from "../../index";
import WaffleCommand from "../../../Commands/slash/waffle";
import WaffleStaffCommand from "../../../Commands/slash/wafflestaff";
import { roleIds, waffleChannelIds } from "../../../constants";
import { baseEmbed } from "../util/embeds";
import { ScenarioRecorder } from "./TestAssertions";
import TestCleanup from "./TestCleanup";
import TestDataFactory, { SandboxContext } from "./TestDataFactory";
import {
    addUserReaction,
    createButtonInteraction,
    createChatInputInteraction,
    createFakeDirectMessage,
    createFakeMessage,
    createModalSubmitInteraction,
} from "./FakeDiscordFactory";
import { WaffleScenarioResult, WaffleTestFailure, WaffleTestRun } from "../models/waffleTestRun";

export type HarnessMode = "smoke" | "full";
type ProgressCallback = (embed: EmbedBuilder) => Promise<void>;

export default class TestHarness {
    static async run(mode: HarnessMode, liveServices: Services, startedByUserId: string, channelId: string, progress?: ProgressCallback): Promise<WaffleTestRun> {
        const running = await liveServices.database.collections.waffleTestRuns!.findOne({ status: "running" });
        if (running) {
            throw new Error(`Another Waffle House test run is still active: ${running.testRunId}`);
        }

        const testRunId = `wh_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const databaseName = `bilby_waffle_test_${testRunId.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase()}`;
        const run: WaffleTestRun = {
            testRunId,
            databaseName,
            startedByUserId,
            startedAt: Date.now(),
            finishedAt: null,
            mode,
            status: "running",
            channelId,
            messageId: null,
            summary: "Starting sandbox suite...",
            results: [],
            failures: [],
            cleanupStatus: "pending",
        };

        await liveServices.database.collections.waffleTestRuns!.insertOne(run as any);

        let context: SandboxContext | null = null;
        const results: WaffleScenarioResult[] = [];

        try {
            context = await TestDataFactory.create(testRunId);
            const scenarios = mode === "smoke"
                ? [
                    this.runEnvironmentScenario,
                    this.runScoringScenario,
                    this.runCardsScenario,
                    this.runAuctionScenario,
                    this.runSchedulerScenario,
                ]
                : [
                    this.runEnvironmentScenario,
                    this.runScoringScenario,
                    this.runGlazeScenario,
                    this.runCardsScenario,
                    this.runSpawnScenario,
                    this.runAuctionScenario,
                    this.runMinigameScenario,
                    this.runSchedulerScenario,
                    this.runCommandScenario,
                ];

            for (const scenario of scenarios) {
                if (progress) {
                    await progress(this.progressEmbed(mode, results, `Running ${scenario.name.replace(/^run|Scenario$/g, "")}...`));
                }
                const result = await scenario.call(this, context);
                results.push(result);
                await liveServices.database.collections.waffleTestRuns!.updateOne(
                    { testRunId },
                    {
                        $set: {
                            results,
                            failures: results.flatMap(entry => entry.failures),
                            summary: `${results.filter(entry => entry.passed).length}/${results.length} scenarios passing`,
                        },
                    }
                );
            }

            const failures = results.flatMap(entry => entry.failures);
            await liveServices.database.collections.waffleTestRuns!.updateOne(
                { testRunId },
                {
                    $set: {
                        status: failures.length === 0 ? "passed" : "failed",
                        finishedAt: Date.now(),
                        summary: `${results.filter(entry => entry.passed).length}/${results.length} scenarios passing`,
                        results,
                        failures,
                    },
                }
            );
        } catch (error) {
            const failure: WaffleTestFailure = {
                scenario: "harness",
                assertion: "suite execution",
                expected: "suite completes",
                actual: "suite threw",
                error: error instanceof Error ? error.message : String(error),
            };
            await liveServices.database.collections.waffleTestRuns!.updateOne(
                { testRunId },
                {
                    $set: {
                        status: "failed",
                        finishedAt: Date.now(),
                        summary: "Harness crashed before completing.",
                    },
                    $push: { failures: failure as any },
                }
            );
        } finally {
            const current = await liveServices.database.collections.waffleTestRuns!.findOne({ testRunId });
            if (current) {
                await TestCleanup.cleanupRun(liveServices, current);
            }
            await context?.mongoClient.close().catch(() => null);
        }

        const finished = await liveServices.database.collections.waffleTestRuns!.findOne({ testRunId });
        if (!finished) {
            throw new Error("Test run disappeared before completion.");
        }

        if (progress) {
            await progress(this.resultEmbed(finished));
        }

        return finished;
    }

    static async cleanup(services: Services, runId?: string, olderThanHours?: number): Promise<number> {
        const filter: Record<string, any> = {};
        if (runId) filter.testRunId = runId;
        if (olderThanHours != null) filter.startedAt = { $lte: Date.now() - olderThanHours * 60 * 60 * 1000 };

        const runs = await services.database.collections.waffleTestRuns!.find(filter).toArray();
        for (const run of runs) {
            await TestCleanup.cleanupRun(services, run);
        }
        return runs.length;
    }

    static async recentRuns(services: Services, limit = 10): Promise<WaffleTestRun[]> {
        return services.database.collections.waffleTestRuns!.find({})
            .sort({ startedAt: -1 })
            .limit(limit)
            .toArray();
    }

    static progressEmbed(mode: HarnessMode, results: WaffleScenarioResult[], status: string): EmbedBuilder {
        return baseEmbed()
            .setTitle(`🧪 Waffle Test Run (${mode})`)
            .setDescription(status)
            .addFields(
                { name: "Completed", value: `${results.length}`, inline: true },
                { name: "Passing", value: `${results.filter(result => result.passed).length}`, inline: true },
                { name: "Failing", value: `${results.flatMap(result => result.failures).length}`, inline: true },
            );
    }

    static resultEmbed(run: WaffleTestRun): EmbedBuilder {
        const failures = run.failures.slice(0, 6).map(failure => `**${failure.scenario}** — ${failure.assertion}: ${failure.error ?? `${failure.actual} vs ${failure.expected}`}`).join("\n");
        return baseEmbed()
            .setTitle(`🧪 Waffle Test ${run.status === "passed" ? "Passed" : "Finished With Failures"}`)
            .setDescription(run.summary)
            .addFields(
                { name: "Run ID", value: run.testRunId },
                { name: "Mode", value: run.mode, inline: true },
                { name: "Cleanup", value: run.cleanupStatus, inline: true },
                { name: "Failures", value: failures || "None", inline: false },
            );
    }

    static async runEnvironmentScenario(context: SandboxContext): Promise<WaffleScenarioResult> {
        const startedAt = Date.now();
        const recorder = new ScenarioRecorder();
        const eventState = await context.collections.waffleEventState!.findOne({ _id: "event_state" });
        recorder.ok(!!eventState, "event state exists");
        recorder.equal(eventState?.eventActive, true, "event state is active");
        recorder.ok(context.waffleHouse.getEventGuild() != null, "event guild resolves from fake client");
        recorder.ok(await context.collections.waffleUsers!.countDocuments() === 0, "sandbox starts with empty waffleUsers");
        return recorder.finish("environment", startedAt, { databaseName: context.databaseName });
    }

    static async runScoringScenario(context: SandboxContext): Promise<WaffleScenarioResult> {
        const startedAt = Date.now();
        const recorder = new ScenarioRecorder();

        const msg1 = createFakeMessage(context.env, {
            userId: "score_user",
            channelId: waffleChannelIds.house,
            content: "waffle",
        });
        await context.waffleHouse.scoringEngine.evaluate(msg1 as any, context.services);

        const user = await context.collections.waffleUsers!.findOne({ userId: "score_user" });
        recorder.ok(!!user, "scoring created a user");
        recorder.ok((user?.current_wp ?? 0) > 0, "scoring awarded positive wp");
        recorder.equal(user?.first_waffle_awarded, true, "first waffle flag set");

        const noWaffleMsg = createFakeMessage(context.env, {
            userId: "score_user",
            channelId: waffleChannelIds.noWaffle,
            content: "waffle waffles forever",
        });
        await context.waffleHouse.scoringEngine.evaluate(noWaffleMsg as any, context.services);
        const noWaffleUser = await context.collections.waffleUsers!.findOne({ userId: "score_user" });
        recorder.equal(noWaffleUser?.current_wp, user?.current_wp, "no-waffle channel does not score");

        const frenchToastMsg = createFakeMessage(context.env, {
            userId: "score_user",
            channelId: waffleChannelIds.house,
            content: "French!!! toast??",
        });
        await context.waffleHouse.scoringEngine.evaluate(frenchToastMsg as any, context.services);
        const frenchToast = await context.collections.waffleFrenchToast!.findOne({ userId: "score_user" });
        recorder.equal(frenchToast?.count, 1, "french toast counter increments");

        return recorder.finish("scoring", startedAt);
    }

    static async runGlazeScenario(context: SandboxContext): Promise<WaffleScenarioResult> {
        const startedAt = Date.now();
        const recorder = new ScenarioRecorder();

        await context.factory.createUser("glaze_user");
        await context.waffleHouse.glazeManager.applyGlaze("glaze_user", "strawberry_glaze", context.services);
        await context.waffleHouse.glazeManager.applyBurn("glaze_user", "soggy_bottom", context.services);

        const active = await context.collections.waffleGlazes!.find({ userId: "glaze_user" }).toArray();
        const multiplier = await context.waffleHouse.glazeManager.getNetMultiplier("glaze_user", context.services);
        recorder.equal(active.length, 2, "glaze and burn docs inserted");
        recorder.ok(multiplier > 0 && multiplier < 3, "net multiplier stacks additively");

        await context.collections.waffleGlazes!.updateMany({ userId: "glaze_user" }, { $set: { expiresAt: Date.now() - 1 } });
        await context.waffleHouse.glazeManager.cleanExpired(context.services);
        recorder.equal(await context.collections.waffleGlazes!.countDocuments({ userId: "glaze_user" }), 0, "expired glazes are cleaned");

        return recorder.finish("glazes", startedAt);
    }

    static async runCardsScenario(context: SandboxContext): Promise<WaffleScenarioResult> {
        const startedAt = Date.now();
        const recorder = new ScenarioRecorder();

        await context.factory.createUser("card_user", { current_wp: 10_000, total_wp_earned: 10_000 });
        const cardAId = await context.factory.createCard("card_user", "muffins_leftover_waffle", { rolledValue: 120 });
        const cardBId = await context.factory.createCard("card_user", "drizzle_of_honey", { rolledValue: 70 });

        const combine = await context.waffleHouse.cardManager.combineCards(cardAId, cardBId, "card_user", context.services);
        recorder.equal(combine.success, true, "combine succeeds on known recipe");
        recorder.ok(!!combine.newCardId, "combine returns a new card id");

        const decompose = await context.waffleHouse.cardManager.decomposeCard(combine.newCardId!, "card_user", context.services);
        recorder.equal(decompose.success, true, "decompose restores inputs");

        const infuseCardId = await context.factory.createCard("card_user", "bandits_special", { rolledValue: 900 });
        const originalRandom = Math.random;
        Math.random = () => 0.99;
        try {
            const infuse = await context.waffleHouse.cardManager.infuseCard(infuseCardId, "card_user", context.services);
            recorder.equal(infuse.success, true, "infuse command succeeds");
        } finally {
            Math.random = originalRandom;
        }

        const infused = await context.collections.waffleCards!.findOne({ _id: infuseCardId });
        recorder.equal(infused?.level, 2, "infusion increases level");
        recorder.ok((infused?.infusionMultiplier ?? 1) > 1, "infusion increases multiplier");

        return recorder.finish("cards", startedAt);
    }

    static async runSpawnScenario(context: SandboxContext): Promise<WaffleScenarioResult> {
        const startedAt = Date.now();
        const recorder = new ScenarioRecorder();

        await context.waffleHouse.cardManager.triggerManualSpawn(context.services, "uncommon");
        const spawn = await context.collections.waffleSpawns!.findOne({ status: "active" });
        recorder.ok(!!spawn, "manual spawn creates active spawn");

        const triggerMessage = createFakeMessage(context.env, {
            userId: "spawn_user",
            channelId: waffleChannelIds.house,
            content: "waffle angled fancy fancy lemon echo",
        });
        if (spawn) {
            await context.collections.waffleSpawns!.updateOne({ _id: spawn._id }, { $set: { "data.triggerMessageId": triggerMessage.id } });
            await context.waffleHouse.cardManager.handleSpawnMessage(triggerMessage as any, context.services);
            const stillActive = await context.collections.waffleSpawns!.findOne({ _id: spawn._id });
            recorder.equal(stillActive?.status, "active", "triggering message cannot immediately claim spawn");

            const winnerMessage = createFakeMessage(context.env, {
                userId: "spawn_user",
                channelId: waffleChannelIds.house,
                content: "waffle apple fancy funny lemon eclair",
            });
            await context.waffleHouse.cardManager.handleSpawnMessage(winnerMessage as any, context.services);
            const claimed = await context.collections.waffleSpawns!.findOne({ _id: spawn._id });
            const claimedCard = await context.collections.waffleCards!.findOne({ _id: spawn.cardInstanceId });
            recorder.equal(claimed?.status, "claimed", "spawn claim transitions to claimed");
            recorder.equal(claimedCard?.ownerId, "spawn_user", "claimed spawn transfers card ownership");
        }

        return recorder.finish("spawns", startedAt);
    }

    static async runAuctionScenario(context: SandboxContext): Promise<WaffleScenarioResult> {
        const startedAt = Date.now();
        const recorder = new ScenarioRecorder();

        await context.factory.createUser("seller", { current_wp: 250, total_wp_earned: 250 });
        await context.factory.createUser("buyer", { current_wp: 2_000, total_wp_earned: 2_000 });
        const cardId = await context.factory.createCard("seller", "bandits_special", { rolledValue: 777 });

        const list = await context.waffleHouse.auctionManager.listCard(cardId, "seller", 100, context.services);
        recorder.equal(list.success, true, "listing a card succeeds");

        await context.factory.updateEventState({ nextAuctionAt: Date.now() - 1 });
        await context.waffleHouse.auctionManager.sweep(context.services);

        const liveAuction = await context.collections.waffleAuctions!.findOne({ cardInstanceId: cardId, status: "live" });
        recorder.ok(!!liveAuction, "auction cycle promotes pooled card to live");

        if (liveAuction) {
            const bidInteraction = createModalSubmitInteraction(context.env, {
                userId: "buyer",
                customId: `waffle_auction_modal_${liveAuction._id!.toString()}`,
                fields: { bid_amount: "250" },
            });
            await context.waffleHouse.auctionManager.handleBidModal(bidInteraction as any, liveAuction._id!.toString(), context.services);

            await context.collections.waffleAuctions!.updateOne({ _id: liveAuction._id }, { $set: { resolvesAt: Date.now() - 1 } });
            await context.waffleHouse.auctionManager.sweep(context.services);

            const resolvedCard = await context.collections.waffleCards!.findOne({ _id: cardId });
            const buyer = await context.collections.waffleUsers!.findOne({ userId: "buyer" });
            const seller = await context.collections.waffleUsers!.findOne({ userId: "seller" });
            recorder.equal(resolvedCard?.ownerId, "buyer", "auction resolution transfers the card");
            recorder.equal(buyer?.current_wp, 1_750, "buyer wp reduced by winning bid");
            recorder.equal(seller?.current_wp, 500, "seller receives winning bid");
        }

        return recorder.finish("auctions", startedAt);
    }

    static async runMinigameScenario(context: SandboxContext): Promise<WaffleScenarioResult> {
        const startedAt = Date.now();
        const recorder = new ScenarioRecorder();

        await context.waffleHouse.minigameManager.triggerManual("prompt_entry", context.services);
        const activeGame = await context.collections.waffleMinigames!.findOne({ status: "submission" });
        recorder.ok(!!activeGame, "manual minigame trigger creates a prompt-entry game");

        if (activeGame?._id) {
            const entry1 = createFakeDirectMessage(context.env, { userId: "chef_1", content: "waffle lore entry one" });
            const entry2 = createFakeDirectMessage(context.env, { userId: "chef_2", content: "waffle lore entry two" });
            await context.waffleHouse.minigameManager.handleDirectMessage(entry1 as any, context.services);
            await context.waffleHouse.minigameManager.handleDirectMessage(entry2 as any, context.services);

            await context.collections.waffleMinigames!.updateOne({ _id: activeGame._id }, { $set: { phaseEndsAt: Date.now() - 1 } });
            await context.waffleHouse.minigameManager.sweep(context.services);
            const votingGame = await context.collections.waffleMinigames!.findOne({ _id: activeGame._id });
            recorder.equal(votingGame?.phase, "voting", "prompt-entry advances from submission to voting");

            const voteInteraction = createButtonInteraction(context.env, {
                userId: "voter_1",
                customId: "waffle_minigame_entry_1",
            });
            await context.waffleHouse.minigameManager.handleEntryVote(voteInteraction as any, 1, context.services);

            await context.collections.waffleMinigames!.updateOne({ _id: activeGame._id }, { $set: { phaseEndsAt: Date.now() - 1 } });
            await context.waffleHouse.minigameManager.sweep(context.services);
            const resolvedGame = await context.collections.waffleMinigames!.findOne({ _id: activeGame._id });
            recorder.equal(resolvedGame?.status, "resolved", "prompt-entry resolves after voting");
        }

        return recorder.finish("minigames", startedAt);
    }

    static async runSchedulerScenario(context: SandboxContext): Promise<WaffleScenarioResult> {
        const startedAt = Date.now();
        const recorder = new ScenarioRecorder();

        await context.waffleHouse.cardManager.triggerManualSpawn(context.services, "common");
        const activeSpawn = await context.collections.waffleSpawns!.findOne({ status: "active" });
        recorder.ok(!!activeSpawn, "scheduler setup created active spawn");

        if (activeSpawn) {
            await context.collections.waffleSpawns!.updateOne({ _id: activeSpawn._id }, { $set: { expiresAt: Date.now() - 1 } });
            await context.waffleHouse.cardManager.sweep(context.services);
            const expired = await context.collections.waffleSpawns!.findOne({ _id: activeSpawn._id });
            recorder.equal(expired?.status, "expired", "expired spawn transitions to expired");
            recorder.equal(
                await context.collections.waffleAuctions!.countDocuments({ cardInstanceId: activeSpawn.cardInstanceId }),
                0,
                "expired spawn does not create an auction entry"
            );
        }

        let sweepCount = 0;
        const originalSweep = context.waffleHouse.cardManager.sweep.bind(context.waffleHouse.cardManager);
        context.waffleHouse.cardManager.sweep = async (...args: any[]) => {
            sweepCount += 1;
            await new Promise(resolve => setTimeout(resolve, 25));
            return originalSweep(...args as [Services]);
        };
        try {
            await Promise.all([
                (context.waffleHouse as any).tickHeartbeat(context.services),
                (context.waffleHouse as any).tickHeartbeat(context.services),
            ]);
        } finally {
            context.waffleHouse.cardManager.sweep = originalSweep;
        }
        recorder.equal(sweepCount, 1, "heartbeat mutex prevents overlapping sweeps");

        return recorder.finish("scheduler", startedAt);
    }

    static async runCommandScenario(context: SandboxContext): Promise<WaffleScenarioResult> {
        const startedAt = Date.now();
        const recorder = new ScenarioRecorder();

        const waffle = new WaffleCommand();
        const wafflestaff = new WaffleStaffCommand();

        await context.factory.createUser("cmd_user", { current_wp: 999, total_wp_earned: 999 });
        const cardId = await context.factory.createCard("cmd_user", "muffins_leftover_waffle", { rolledValue: 123 });

        const statsInteraction = createChatInputInteraction(context.env, {
            commandName: "waffle",
            userId: "cmd_user",
            subcommand: "stats",
        });
        await waffle.execute(statsInteraction as any, context.services);
        recorder.ok(!!statsInteraction.replyPayload?.embeds?.length, "/waffle stats replies with an embed");

        const infuseInteraction = createChatInputInteraction(context.env, {
            commandName: "waffle",
            userId: "cmd_user",
            subcommand: "infuse",
            strings: { card: cardId.toString() },
        });
        await waffle.execute(infuseInteraction as any, context.services);
        recorder.ok(!!infuseInteraction.replyPayload?.components?.length, "/waffle infuse returns confirmation controls");

        const staffInteraction = createChatInputInteraction(context.env, {
            commandName: "wafflestaff",
            userId: "staff_user",
            subcommand: "stats",
            roleIds: [roleIds.staff],
        });
        await wafflestaff.execute(staffInteraction as any, context.services);
        recorder.ok(!!staffInteraction.replyPayload?.embeds?.length, "/wafflestaff stats replies with embeds");

        return recorder.finish("commands", startedAt);
    }
}
