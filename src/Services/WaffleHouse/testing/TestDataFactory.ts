import { MongoClient, Db, ObjectId } from "mongodb";
import { DatabaseCollections } from "../../Database";
import { Services } from "../../index";
import WaffleHouseService from "..";
import { createFakeDiscordEnvironment } from "./FakeDiscordFactory";
import { WaffleCard } from "../models/waffleCard";
import { WaffleAuction } from "../models/waffleAuction";
import { WaffleMinigame, WafflePrompt } from "../models/waffleMinigame";
import { WaffleFrenchToast, WaffleTuning, WaffleEventState } from "../models/waffleEventState";
import { WaffleSpawn } from "../models/waffleSpawn";
import { WaffleUser, defaultWaffleUser } from "../models/waffleUser";
import { WaffleGlaze } from "../models/waffleGlaze";
import { WaffleTestRun } from "../models/waffleTestRun";

export interface SandboxContext {
    testRunId: string;
    databaseName: string;
    mongoClient: MongoClient;
    db: Db;
    collections: DatabaseCollections;
    env: ReturnType<typeof createFakeDiscordEnvironment>;
    services: Services;
    waffleHouse: WaffleHouseService;
    factory: TestDataFactory;
}

export default class TestDataFactory {
    constructor(public context: SandboxContext) {}

    static async create(testRunId: string): Promise<SandboxContext> {
        if (!process.env.MONGO_URL) {
            throw new Error("MONGO_URL is required to run Waffle House tests.");
        }

        const databaseName = `bilby_waffle_test_${testRunId.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase()}`;
        const mongoClient = new MongoClient(process.env.MONGO_URL);
        await mongoClient.connect();
        const db = mongoClient.db(databaseName);
        const collections = TestDataFactory.buildCollections(db);
        const env = createFakeDiscordEnvironment();
        const waffleHouse = new WaffleHouseService(env.client as any);

        (waffleHouse as any).startHeartbeat = () => undefined;
        (waffleHouse as any).stopHeartbeat = () => undefined;
        (waffleHouse as any).configIsReady = () => true;

        const services = {
            commands: {} as any,
            database: { collections } as any,
            s3: {} as any,
            state: {} as any,
            pager: {} as any,
            waffleHouse,
        } as Services;

        const context = {
            testRunId,
            databaseName,
            mongoClient,
            db,
            collections,
            env,
            services,
            waffleHouse,
            factory: null as unknown as TestDataFactory,
        } satisfies Omit<SandboxContext, "factory"> & { factory: TestDataFactory };

        context.factory = new TestDataFactory(context as SandboxContext);

        await waffleHouse.initialize(services);
        await waffleHouse.setEventActive(true, services);

        return context as SandboxContext;
    }

    static buildCollections(db: Db): DatabaseCollections {
        return {
            waffleUsers: db.collection<WaffleUser>("waffleUsers"),
            waffleCards: db.collection<WaffleCard>("waffleCards"),
            waffleGlazes: db.collection<WaffleGlaze>("waffleGlazes"),
            waffleAuctions: db.collection<WaffleAuction>("waffleAuctions"),
            waffleMinigames: db.collection<WaffleMinigame>("waffleMinigames"),
            wafflePromptQueue: db.collection<WafflePrompt>("wafflePromptQueue"),
            waffleFrenchToast: db.collection<WaffleFrenchToast>("waffleFrenchToast"),
            waffleTuning: db.collection<WaffleTuning>("waffleTuning"),
            waffleEventState: db.collection<WaffleEventState>("waffleEventState"),
            waffleSpawns: db.collection<WaffleSpawn>("waffleSpawns"),
            waffleTestRuns: db.collection<WaffleTestRun>("waffleTestRuns"),
        };
    }

    async createUser(userId: string, overrides: Partial<WaffleUser> = {}): Promise<WaffleUser> {
        const user = {
            ...defaultWaffleUser(userId),
            isTestData: true,
            testRunId: this.context.testRunId,
            ...overrides,
        };
        await this.context.collections.waffleUsers!.replaceOne(
            { userId },
            user,
            { upsert: true }
        );
        return user;
    }

    async createCard(
        ownerId: string | null,
        cardId: string,
        overrides: Partial<WaffleCard> = {}
    ): Promise<ObjectId> {
        const result = await this.context.collections.waffleCards!.insertOne({
            cardId,
            ownerId,
            sourceType: "staff",
            rolledValue: 100,
            level: 1,
            infusionMultiplier: 1,
            burnt: false,
            burntUntil: null,
            auctionStatus: "none",
            auctionMinBid: null,
            combinedFrom: null,
            createdAt: Date.now(),
            isTestData: true,
            testRunId: this.context.testRunId,
            ...overrides,
        } as any);
        return result.insertedId;
    }

    async updateEventState(patch: Partial<WaffleEventState>): Promise<void> {
        await this.context.collections.waffleEventState!.updateOne(
            { _id: "event_state" },
            { $set: patch }
        );
        Object.assign(this.context.waffleHouse.eventState ?? {}, patch);
    }
}
