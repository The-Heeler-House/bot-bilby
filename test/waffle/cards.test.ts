import test from "node:test";
import assert from "node:assert/strict";
import TestHarness from "../../src/Services/WaffleHouse/testing/TestHarness";
import { createSandbox, destroySandbox, requireMongo } from "./helpers/setup";

test("card combine/decompose/infuse scenario passes", async t => {
    if (!requireMongo(t)) return;
    const context = await createSandbox();
    try {
        const result = await TestHarness.runCardsScenario(context);
        assert.equal(result.passed, true, JSON.stringify(result.failures));
    } finally {
        await destroySandbox(context);
    }
});

test("combo-only legendary does not drop from random rolls", async t => {
    if (!requireMongo(t)) return;
    const context = await createSandbox();
    try {
        for (let index = 0; index < 200; index++) {
            const card = context.waffleHouse.cardManager.rollRandomCard();
            assert.notEqual(card.id, "jalens_67_eternal_waffle");
        }
    } finally {
        await destroySandbox(context);
    }
});
