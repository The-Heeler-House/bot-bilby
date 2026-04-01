import { MongoClient } from "mongodb";
import { Services } from "../../index";
import { WaffleTestRun } from "../models/waffleTestRun";

export default class TestCleanup {
    static async dropDatabase(databaseName: string): Promise<void> {
        const client = new MongoClient(process.env.MONGO_URL!);
        await client.connect();
        try {
            await client.db(databaseName).dropDatabase();
        } finally {
            await client.close();
        }
    }

    static async cleanupRun(services: Services, run: WaffleTestRun): Promise<void> {
        try {
            await this.dropDatabase(run.databaseName);
            await services.database.collections.waffleTestRuns!.updateOne(
                { testRunId: run.testRunId },
                { $set: { cleanupStatus: "completed", status: run.status === "running" ? "cleaned" : run.status } }
            );
        } catch (error) {
            await services.database.collections.waffleTestRuns!.updateOne(
                { testRunId: run.testRunId },
                {
                    $set: { cleanupStatus: "failed" },
                    $push: {
                        failures: {
                            assertion: "cleanup",
                            expected: "database dropped",
                            actual: "cleanup failed",
                            error: error instanceof Error ? error.stack ?? error.message : String(error),
                        },
                    },
                } as any
            );
        }
    }
}
