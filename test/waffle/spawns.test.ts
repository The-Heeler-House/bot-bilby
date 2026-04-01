import test from "node:test";
import assert from "node:assert/strict";
import TestHarness from "../../src/Services/WaffleHouse/testing/TestHarness";
import { createSandbox, destroySandbox, requireMongo } from "./helpers/setup";

test("spawn scenario passes", async t => {
    if (!requireMongo(t)) return;
    const context = await createSandbox();
    try {
        const result = await TestHarness.runSpawnScenario(context);
        assert.equal(result.passed, true, JSON.stringify(result.failures));
    } finally {
        await destroySandbox(context);
    }
});

test("manual spawn rejects when another spawn is already active", async t => {
    if (!requireMongo(t)) return;
    const context = await createSandbox();
    try {
        await context.waffleHouse.cardManager.triggerManualSpawn(context.services, "common");
        const activeBefore = await context.collections.waffleSpawns!.findOne({ status: "active" });
        await assert.rejects(
            context.waffleHouse.cardManager.triggerManualSpawn(context.services, "rare"),
            /already an active card spawn/i
        );
        const activeAfter = await context.collections.waffleSpawns!.findOne({ status: "active" });
        assert.equal(activeAfter?._id?.toString(), activeBefore?._id?.toString());
    } finally {
        await destroySandbox(context);
    }
});
