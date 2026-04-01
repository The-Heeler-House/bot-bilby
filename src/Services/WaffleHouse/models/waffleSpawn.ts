import { ObjectId } from "mongodb";
import { CardRarity } from "../data/cards";

export type WaffleSpawnChallengeType =
    | "emoji_sequence"
    | "word_starts"
    | "long_acronym"
    | "epic_combo"
    | "legendary_methods";

export interface WaffleSpawn {
    _id?: ObjectId;
    isTestData?: boolean;
    testRunId?: string;
    cardInstanceId: ObjectId;
    cardTemplateId: string;
    rarity: CardRarity;
    challengeType: WaffleSpawnChallengeType;
    status: "active" | "claiming" | "expiring" | "claimed" | "expired";
    channelId: string;
    messageId: string;
    startedAt: number;
    expiresAt: number;
    winnerId: string | null;
    data: Record<string, any>;
}
