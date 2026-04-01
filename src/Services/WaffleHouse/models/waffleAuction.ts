import { ObjectId } from "mongodb";

export interface WaffleAuction {
    _id?: ObjectId;
    isTestData?: boolean;
    testRunId?: string;
    cardInstanceId: ObjectId;
    sellerId: string;
    minBid: number;
    listedAt: number;
    batchId: string | null;
    currentHighBid: number | null;
    currentHighBidderId: string | null;
    status: "pooled" | "live" | "resolving" | "resolved";
    liveAt: number | null;
    resolvesAt: number | null;
    messageId: string | null;
}
