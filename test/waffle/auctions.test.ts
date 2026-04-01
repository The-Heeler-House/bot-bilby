import test from "node:test";
import assert from "node:assert/strict";
import TestHarness from "../../src/Services/WaffleHouse/testing/TestHarness";
import { createSandbox, destroySandbox, requireMongo } from "./helpers/setup";

test("auction scenario passes", async t => {
    if (!requireMongo(t)) return;
    const context = await createSandbox();
    try {
        const result = await TestHarness.runAuctionScenario(context);
        assert.equal(result.passed, true, JSON.stringify(result.failures));
    } finally {
        await destroySandbox(context);
    }
});
