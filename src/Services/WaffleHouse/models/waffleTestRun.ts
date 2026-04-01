import { ObjectId } from "mongodb";

export interface WaffleTestFailure {
    scenario?: string;
    assertion: string;
    expected: string;
    actual: string;
    error?: string;
}

export interface WaffleScenarioResult {
    name: string;
    passed: boolean;
    assertions: number;
    failures: WaffleTestFailure[];
    durationMs: number;
    artifacts?: Record<string, unknown>;
}

export interface WaffleTestRun {
    _id?: ObjectId;
    testRunId: string;
    databaseName: string;
    startedByUserId: string;
    startedAt: number;
    finishedAt: number | null;
    mode: "smoke" | "full";
    status: "running" | "passed" | "failed" | "cleaned";
    channelId: string;
    messageId: string | null;
    summary: string | null;
    results: WaffleScenarioResult[];
    failures: WaffleTestFailure[];
    cleanupStatus: "pending" | "completed" | "failed";
}
