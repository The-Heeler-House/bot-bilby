import test from "node:test";
import assert from "node:assert/strict";
import TestHarness from "../../src/Services/WaffleHouse/testing/TestHarness";
import { createSandbox, destroySandbox, requireMongo } from "./helpers/setup";
import { createFakeMessage } from "./helpers/fakes";
import { waffleChannelIds } from "../../src/constants";

test("waffle scoring scenario passes", async t => {
    if (!requireMongo(t)) return;
    const context = await createSandbox();
    try {
        const result = await TestHarness.runScoringScenario(context);
        assert.equal(result.passed, true, JSON.stringify(result.failures));
    } finally {
        await destroySandbox(context);
    }
});

test("blueyderp reacts when a hidden effect triggers", async t => {
    if (!requireMongo(t)) return;
    const context = await createSandbox();
    try {
        await context.factory.updateEventState({
            glazeBurnCounters: {
                glaze_pool: { counter: 0, threshold: 1 },
            },
        });
        const message = createFakeMessage(context.env, {
            userId: "hidden_effect_user",
            channelId: waffleChannelIds.house,
            content: "waffle",
        });
        await context.waffleHouse.scoringEngine.evaluate(message as any, context.services);
        assert.ok(message.reactions.cache.has("🧇"));
        assert.ok(message.reactions.cache.has("😛"));
    } finally {
        await destroySandbox(context);
    }
});
