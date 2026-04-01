import { ObjectId } from "mongodb";

export interface WaffleCard {
    _id?: ObjectId;
    isTestData?: boolean;
    testRunId?: string;
    cardId: string;
    ownerId: string | null; // null if in auction pool
    sourceType: "spawn" | "minigame" | "combo" | "staff";
    rolledValue: number;
    level: number; // 1-5
    infusionMultiplier: number; // 1.0 at level 1
    burnt: boolean;
    burntUntil: number | null; // epoch ms
    auctionStatus: "none" | "pooled" | "live";
    auctionMinBid: number | null;
    combinedFrom: {
        inputACardId: string;
        inputARolledValue: number;
        inputBCardId: string;
        inputBRolledValue: number;
    } | null;
    createdAt: number; // epoch ms
}
