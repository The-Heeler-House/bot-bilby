import { ObjectId } from "mongodb";

export interface WaffleGlaze {
    _id?: ObjectId;
    isTestData?: boolean;
    testRunId?: string;
    userId: string;
    glazeId: string;
    type: "glaze" | "burn";
    multiplier: number; // positive for glaze, positive value subtracted for burn
    appliedAt: number; // epoch ms
    expiresAt: number; // epoch ms
}
