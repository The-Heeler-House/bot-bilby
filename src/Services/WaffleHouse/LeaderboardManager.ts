import { Client } from "discord.js";
import { Services } from "../index";
import type WaffleHouseService from "./index";

export interface LeaderboardEntry {
    userId: string;
    tag: string;
    currentWP: number;
    collectionValue: number;
    score: number;
}

export default class LeaderboardManager {
    private waffle: WaffleHouseService;

    constructor(waffle: WaffleHouseService) {
        this.waffle = waffle;
    }

    async getAllEntries(services: Services): Promise<LeaderboardEntry[]> {
        const { database } = services;
        const now = Date.now();

        const allUsers = await database.collections.waffleUsers!.find({}).toArray();
        const entries: LeaderboardEntry[] = [];

        for (const user of allUsers) {
            const cards = await database.collections.waffleCards!.find({ ownerId: user.userId, auctionStatus: "none" }).toArray();
            const collectionValue = cards.reduce((sum, card) => {
                const isBurnt = card.burnt && card.burntUntil != null && card.burntUntil > now;
                const effective = Math.round(card.rolledValue * card.infusionMultiplier * (isBurnt ? 0.5 : 1.0));
                return sum + effective;
            }, 0);

            let tag = `<@${user.userId}>`;
            try {
                const discordUser = await this.waffle.client.users.fetch(user.userId);
                tag = discordUser.tag;
            } catch { /* user left server */ }

            entries.push({
                userId: user.userId,
                tag,
                currentWP: user.current_wp,
                collectionValue,
                score: user.current_wp + collectionValue,
            });
        }

        return entries.sort((a, b) => b.score - a.score);
    }

    async getTopN(n: number, services: Services): Promise<LeaderboardEntry[]> {
        const entries = await this.getAllEntries(services);
        return entries.slice(0, n);
    }

    async getUserScore(userId: string, services: Services): Promise<number> {
        const { database } = services;
        const now = Date.now();
        const user = await database.collections.waffleUsers!.findOne({ userId });
        if (!user) return 0;
        const cards = await database.collections.waffleCards!.find({ ownerId: userId, auctionStatus: "none" }).toArray();
        const collectionValue = cards.reduce((sum, card) => {
            const isBurnt = card.burnt && card.burntUntil != null && card.burntUntil > now;
            return sum + Math.round(card.rolledValue * card.infusionMultiplier * (isBurnt ? 0.5 : 1.0));
        }, 0);
        return user.current_wp + collectionValue;
    }
}
