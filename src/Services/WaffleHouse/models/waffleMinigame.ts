import { ObjectId } from "mongodb";

export interface WaffleMinigame {
    _id?: ObjectId;
    isTestData?: boolean;
    testRunId?: string;
    gameType: "chef_battle" | "anonymous_poll" | "prompt_entry" | "waffle_alliance";
    status: "signup" | "battle" | "voting" | "submission" | "active" | "transitioning" | "resolved" | "cancelled";
    phase: string;
    startedAt: number;
    phaseEndsAt: number;
    prompt: string;
    messageId: string | null;
    data: any;
}

export interface WafflePrompt {
    _id?: ObjectId;
    isTestData?: boolean;
    testRunId?: string;
    gameType: "chef_battle" | "anonymous_poll" | "prompt_entry";
    prompt: string;
    options?: string[];
    addedBy: string;
    addedAt: number;
}
