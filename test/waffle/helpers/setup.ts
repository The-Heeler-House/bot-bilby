import { TestContext } from "node:test";
import TestDataFactory, { SandboxContext } from "../../../src/Services/WaffleHouse/testing/TestDataFactory";

export function requireMongo(t: TestContext): boolean {
    if (!process.env.MONGO_URL) {
        t.skip("MONGO_URL is not set.");
        return false;
    }
    return true;
}

export async function createSandbox(): Promise<SandboxContext> {
    return TestDataFactory.create(`local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
}

export async function destroySandbox(context: SandboxContext): Promise<void> {
    await context.db.dropDatabase().catch(() => null);
    await context.mongoClient.close().catch(() => null);
}
