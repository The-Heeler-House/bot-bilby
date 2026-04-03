import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    Message,
    MessageReaction,
    PartialMessageReaction,
    PartialUser,
    TextChannel,
    User,
} from "discord.js";
import { ObjectId } from "mongodb";
import { Services } from "../index";
import {
    CARD_TEMPLATES,
    CARD_TEMPLATE_MAP,
    DEFAULT_DROP_WEIGHTS,
    FINAL24H_DROP_WEIGHTS,
    INFUSION_LEVELS,
    CardRarity,
    CardTemplate,
    computeCombinedValue,
    findRecipe,
} from "./data/cards";
import { spawnEmbed, spawnTimeoutEmbed, spawnWinnerEmbed } from "./util/embeds";
import {
    detectGetWaffled,
    detectLongWaffleAcronym,
    detectWaffleAcronym,
    detectWaffleWordStarts,
} from "./util/scoring-detectors";
import { waffleChannelIds } from "../../constants";
import type WaffleHouseService from "./index";
import { WaffleCard } from "./models/waffleCard";
import { WaffleSpawn } from "./models/waffleSpawn";
import { defaultWaffleUser } from "./models/waffleUser";

export const WAFFLE_CARD_CAP = 25;

export default class CardManager {
    private waffle: WaffleHouseService;

    constructor(waffle: WaffleHouseService) {
        this.waffle = waffle;
    }

    rollRandomCard(
        rarity?: CardRarity,
        typeFilter?: "base" | "topping" | "special",
        weights: Record<CardRarity, number> = this.waffle.eventState?.final24h
            ? FINAL24H_DROP_WEIGHTS
            : DEFAULT_DROP_WEIGHTS,
        specialDropRateMultiplier = 0.25,
    ): CardTemplate {
        const drawnRarity = rarity ?? this.rollRarity(weights);
        const pool = CARD_TEMPLATES.filter((template) => {
            if (template.comboOnly || template.category === "combo")
                return false;
            if (template.rarity !== drawnRarity) return false;
            if (typeFilter && template.category !== typeFilter) return false;
            return true;
        });

        const weighted: CardTemplate[] = [];
        for (const template of pool) {
            if (template.reducedDropRate) {
                if (Math.random() < specialDropRateMultiplier)
                    weighted.push(template);
            } else {
                weighted.push(template);
            }
        }

        const finalPool = weighted.length > 0 ? weighted : pool;
        return finalPool[Math.floor(Math.random() * finalPool.length)];
    }

    rollRarity(weights: Record<CardRarity, number>): CardRarity {
        const total = Object.values(weights).reduce(
            (sum, value) => sum + value,
            0,
        );
        let pick = Math.random() * total;
        for (const [rarity, weight] of Object.entries(weights) as [
            CardRarity,
            number,
        ][]) {
            pick -= weight;
            if (pick <= 0) return rarity;
        }
        return "common";
    }

    rollValue(template: CardTemplate): number {
        const [min, max] = template.valueRange;
        const value = Math.floor(Math.random() * (max - min + 1)) + min;
        return template.negativeValue ? -Math.abs(value) : value;
    }

    async initialize(services: Services): Promise<void> {
        await this.sweep(services);
    }

    async createCard(
        cardId: string,
        ownerId: string | null,
        services: Services,
        combinedFrom?: WaffleCard["combinedFrom"],
        sourceType: WaffleCard["sourceType"] = "spawn",
        forcedRolledValue?: number,
    ): Promise<ObjectId> {
        const template = CARD_TEMPLATE_MAP.get(cardId);
        if (!template) throw new Error(`Unknown card template: ${cardId}`);

        const rolledValue =
            forcedRolledValue ??
            (template.valueRange[0] === 0 && template.valueRange[1] === 0
                ? 0
                : this.rollValue(template));

        const result =
            await services.database.collections.waffleCards!.insertOne({
                cardId,
                ownerId,
                sourceType,
                rolledValue,
                level: 1,
                infusionMultiplier: 1.0,
                burnt: false,
                burntUntil: null,
                auctionStatus: "none",
                auctionMinBid: null,
                combinedFrom: combinedFrom ?? null,
                createdAt: Date.now(),
            } as any);

        return result.insertedId;
    }

    getEffectiveValue(card: WaffleCard): number {
        const isBurnt =
            card.burnt &&
            card.burntUntil != null &&
            card.burntUntil > Date.now();
        return Math.round(
            card.rolledValue * card.infusionMultiplier * (isBurnt ? 0.5 : 1),
        );
    }

    async getOwnedCardCount(
        userId: string,
        services: Services,
    ): Promise<number> {
        return services.database.collections.waffleCards!.countDocuments({
            ownerId: userId,
        });
    }

    async canReceiveCards(
        userId: string,
        amount: number,
        services: Services,
    ): Promise<boolean> {
        const currentCount = await this.getOwnedCardCount(userId, services);
        return currentCount + amount <= WAFFLE_CARD_CAP;
    }

    inventoryCapMessage(extraCards = 1): string {
        const plural = extraCards === 1 ? "" : "s";
        return `You are at the card cap of ${WAFFLE_CARD_CAP}. Use \`/waffle discard\` before trying to gain ${extraCards} more card${plural}.`;
    }

    async sweep(services: Services): Promise<void> {
        const eventState = this.waffle.eventState;
        if (!eventState?.eventActive) return;

        const now = Date.now();
        const expiredSpawns = await services.database.collections
            .waffleSpawns!.find({
                status: "active",
                expiresAt: { $lte: now },
            })
            .toArray();

        for (const spawn of expiredSpawns) {
            await this.expireSpawn(spawn, services);
        }
    }

    async tickWpCounter(
        wpEarned: number,
        message: Message,
        services: Services,
    ): Promise<void> {
        const eventState = this.waffle.eventState;
        if (!eventState || wpEarned <= 0) return;

        eventState.waffleWpCounter += wpEarned;
        eventState.totalWpEarnedServerWide += wpEarned;

        const activeSpawn = eventState.currentSpawnId
            ? await services.database.collections.waffleSpawns!.findOne({
                  _id: eventState.currentSpawnId,
                  status: "active",
              })
            : null;

        if (
            eventState.waffleWpCounter >= eventState.spawnThreshold &&
            !activeSpawn
        ) {
            eventState.waffleWpCounter = 0;
            const tuning =
                await services.database.collections.waffleTuning!.findOne({
                    _id: "tuning",
                });
            eventState.spawnThreshold = this.rollSpawnThreshold(
                eventState.dayOfEvent,
                eventState.final24h,
                tuning?.spawnThresholdRange,
            );
            await services.database.collections.waffleEventState!.updateOne(
                { _id: "event_state" },
                {
                    $set: {
                        waffleWpCounter: 0,
                        spawnThreshold: eventState.spawnThreshold,
                        totalWpEarnedServerWide:
                            eventState.totalWpEarnedServerWide,
                    },
                },
            );
            await this.triggerSpawnFromGuild(
                message.guild?.channels.cache.get(waffleChannelIds.house) as
                    | TextChannel
                    | undefined,
                services,
                undefined,
                undefined,
                message.id,
            );
            return;
        }

        await services.database.collections.waffleEventState!.updateOne(
            { _id: "event_state" },
            {
                $inc: {
                    waffleWpCounter: wpEarned,
                    totalWpEarnedServerWide: wpEarned,
                },
            },
        );
    }

    async triggerManualSpawn(
        services: Services,
        rarityOverride?: CardRarity,
        typeFilter?: "base" | "topping" | "special",
    ): Promise<void> {
        const existing = await this.getActiveSpawn(services);
        if (existing) {
            throw new Error("There is already an active card spawn.");
        }
        const channel = await this.getHouseChannel();
        if (!channel) throw new Error("Waffle House channel not found.");
        await this.triggerSpawnFromGuild(
            channel,
            services,
            rarityOverride,
            typeFilter,
        );
    }

    async handleSpawnMessage(
        message: Message,
        services: Services,
    ): Promise<void> {
        if (message.author.bot) return;
        const spawn = await this.getActiveSpawn(services);
        if (!spawn || spawn.channelId !== message.channelId) return;
        if (
            spawn.data.triggerMessageId &&
            spawn.data.triggerMessageId === message.id
        )
            return;
        const claimRestriction = await this.getSpawnClaimRestriction(
            message.author.id,
            spawn,
            services,
        );
        if (claimRestriction) {
            await this.notifyBlockedClaimOnce(spawn, message.author.id, claimRestriction, services);
            return;
        }

        let valid = false;
        switch (spawn.challengeType) {
            case "word_starts":
                valid = detectWaffleWordStarts(message.content);
                break;
            case "long_acronym":
                valid = detectLongWaffleAcronym(message.content);
                break;
            case "epic_combo":
                valid =
                    message.content.includes("🧇") &&
                    detectGetWaffled(message.content) &&
                    detectWaffleAcronym(message.content);
                break;
            case "legendary_methods":
                valid =
                    this.waffle.scoringEngine.countTriggeredMethods(
                        message.content,
                        message.channelId,
                    ) >= 4;
                break;
            default:
                return;
        }

        if (!valid) return;
        if (
            spawn.challengeType === "long_acronym" ||
            spawn.challengeType === "epic_combo"
        ) {
            const allowed = await this.tryReserveAcronymResponse(
                message.author.id,
                message.content,
                services,
            );
            if (!allowed) {
                await message.author
                    .send(
                        "That acronym response has already been used by you before. Try a new one.",
                    )
                    .catch(() => null);
                return;
            }
        }
        await this.claimSpawn(
            spawn,
            message.author.id,
            message.author.tag,
            services,
        );
    }

    async handleSpawnReaction(
        reaction: MessageReaction | PartialMessageReaction,
        user: User | PartialUser,
        services: Services,
    ): Promise<void> {
        if (user.bot) return;
        if (reaction.partial) {
            await reaction.fetch().catch(() => null);
        }

        const spawn = await this.getActiveSpawn(services);
        if (
            !spawn ||
            spawn.challengeType !== "emoji_sequence" ||
            spawn.messageId !== reaction.message.id
        )
            return;
        const claimRestriction = await this.getSpawnClaimRestriction(
            user.id,
            spawn,
            services,
        );
        if (claimRestriction) {
            await this.notifyBlockedClaimOnce(
                spawn,
                user.id,
                claimRestriction,
                services,
            );
            return;
        }

        const emojiName = reaction.emoji.name ?? "";
        const sequence = Array.isArray(spawn.data.sequence)
            ? (spawn.data.sequence as string[])
            : [];
        if (sequence.length === 0) return;

        const progressMap = (spawn.data.progress ?? {}) as Record<
            string,
            number
        >;
        const currentProgress = progressMap[user.id] ?? 0;
        const expectedEmoji = sequence[currentProgress];

        if (emojiName !== expectedEmoji) {
            await services.database.collections.waffleSpawns!.updateOne(
                { _id: spawn._id, status: "active" },
                { $set: { [`data.progress.${user.id}`]: 0 } },
            );
            return;
        }

        if (currentProgress + 1 >= sequence.length) {
            await this.claimSpawn(spawn, user.id, user.tag, services);
            return;
        }

        await services.database.collections.waffleSpawns!.updateOne(
            { _id: spawn._id, status: "active" },
            { $set: { [`data.progress.${user.id}`]: currentProgress + 1 } },
        );
    }

    async combineCards(
        cardAId: ObjectId,
        cardBId: ObjectId,
        userId: string,
        services: Services,
    ): Promise<{ success: boolean; message: string; newCardId?: ObjectId }> {
        const [cardA, cardB] = await Promise.all([
            services.database.collections.waffleCards!.findOne({
                _id: cardAId,
                ownerId: userId,
            }),
            services.database.collections.waffleCards!.findOne({
                _id: cardBId,
                ownerId: userId,
            }),
        ]);

        if (!cardA || !cardB)
            return {
                success: false,
                message: "One or both cards were not found in your collection.",
            };
        if (cardA.auctionStatus !== "none" || cardB.auctionStatus !== "none") {
            return {
                success: false,
                message: "You can't combine cards that are listed for auction.",
            };
        }

        const recipe = findRecipe(cardA.cardId, cardB.cardId);
        if (!recipe)
            return {
                success: false,
                message: "Those cards don't form a valid recipe.",
            };

        const outputTemplate = CARD_TEMPLATE_MAP.get(recipe.outputId)!;
        const outputValue = computeCombinedValue(
            cardA.rolledValue,
            cardB.rolledValue,
            recipe,
        );
        const result =
            await services.database.collections.waffleCards!.insertOne({
                cardId: recipe.outputId,
                ownerId: userId,
                sourceType: "combo",
                rolledValue: outputValue,
                level: 1,
                infusionMultiplier: 1.0,
                burnt: false,
                burntUntil: null,
                auctionStatus: "none",
                auctionMinBid: null,
                combinedFrom: {
                    inputACardId: cardA.cardId,
                    inputARolledValue: cardA.rolledValue,
                    inputBCardId: cardB.cardId,
                    inputBRolledValue: cardB.rolledValue,
                },
                createdAt: Date.now(),
            } as any);

        await services.database.collections.waffleCards!.deleteMany({
            _id: { $in: [cardAId, cardBId] },
        });

        return {
            success: true,
            message: `Combined into **${outputTemplate.name}**.`,
            newCardId: result.insertedId,
        };
    }

    async decomposeCard(
        cardId: ObjectId,
        userId: string,
        services: Services,
    ): Promise<{
        success: boolean;
        message: string;
        restoredCardIds?: ObjectId[];
    }> {
        const card = await services.database.collections.waffleCards!.findOne({
            _id: cardId,
            ownerId: userId,
        });
        if (!card)
            return {
                success: false,
                message: "Card not found in your collection.",
            };
        if (!card.combinedFrom)
            return {
                success: false,
                message: "This card was not produced by a combination.",
            };
        if (card.auctionStatus !== "none")
            return {
                success: false,
                message: "You can't decompose a listed card.",
            };
        if (!(await this.canReceiveCards(userId, 1, services))) {
            return { success: false, message: this.inventoryCapMessage(1) };
        }

        const now = Date.now();
        const restoredA = CARD_TEMPLATE_MAP.get(card.combinedFrom.inputACardId);
        const restoredB = CARD_TEMPLATE_MAP.get(card.combinedFrom.inputBCardId);

        const insertResult =
            await services.database.collections.waffleCards!.insertMany([
                {
                    cardId: card.combinedFrom.inputACardId,
                    ownerId: userId,
                    sourceType: "combo",
                    rolledValue: card.combinedFrom.inputARolledValue,
                    level: 1,
                    infusionMultiplier: 1.0,
                    burnt: false,
                    burntUntil: null,
                    auctionStatus: "none",
                    auctionMinBid: null,
                    combinedFrom: null,
                    createdAt: now,
                },
                {
                    cardId: card.combinedFrom.inputBCardId,
                    ownerId: userId,
                    sourceType: "combo",
                    rolledValue: card.combinedFrom.inputBRolledValue,
                    level: 1,
                    infusionMultiplier: 1.0,
                    burnt: false,
                    burntUntil: null,
                    auctionStatus: "none",
                    auctionMinBid: null,
                    combinedFrom: null,
                    createdAt: now,
                },
            ] as any);
        await services.database.collections.waffleCards!.deleteOne({
            _id: cardId,
        });

        return {
            success: true,
            message: `Decomposed into **${restoredA?.name ?? card.combinedFrom.inputACardId}** and **${restoredB?.name ?? card.combinedFrom.inputBCardId}**.`,
            restoredCardIds: Object.values(insertResult.insertedIds),
        };
    }

    async discardCard(
        cardId: ObjectId,
        userId: string,
        services: Services,
    ): Promise<{ success: boolean; message: string }> {
        const card = await services.database.collections.waffleCards!.findOne({
            _id: cardId,
            ownerId: userId,
        });
        if (!card)
            return {
                success: false,
                message: "Card not found in your collection.",
            };
        if (card.auctionStatus !== "none") {
            const activeAuction =
                await services.database.collections.waffleAuctions!.findOne({
                    cardInstanceId: cardId,
                    status: { $in: ["pooled", "live", "resolving"] },
                });
            if (activeAuction)
                return {
                    success: false,
                    message: "You can't discard a card that is listed for auction.",
                };

            await services.database.collections.waffleCards!.updateOne(
                { _id: cardId, ownerId: userId },
                { $set: { auctionStatus: "none", auctionMinBid: null } },
            );
            card.auctionStatus = "none";
            card.auctionMinBid = null;
        }

        await services.database.collections.waffleCards!.deleteOne({
            _id: cardId,
            ownerId: userId,
        });
        await this.waffle.bumpRuntimeCounter("discardedCards", 1, services);
        const template = CARD_TEMPLATE_MAP.get(card.cardId);
        return {
            success: true,
            message: `Discarded **${template?.name ?? card.cardId}**.`,
        };
    }

    async infuseCard(
        cardId: ObjectId,
        userId: string,
        services: Services,
    ): Promise<{ success: boolean; message: string }> {
        const card = await services.database.collections.waffleCards!.findOne({
            _id: cardId,
            ownerId: userId,
        });
        if (!card)
            return {
                success: false,
                message: "Card not found in your collection.",
            };
        if (card.level >= 5)
            return { success: false, message: "Card is already level 5." };
        if (card.auctionStatus !== "none")
            return {
                success: false,
                message: "You can't infuse a listed card.",
            };

        const levelDef = INFUSION_LEVELS[card.level - 1];
        const tuning =
            await services.database.collections.waffleTuning!.findOne({
                _id: "tuning",
            });
        const cost = tuning?.infusionCosts?.[`${card.level}`] ?? levelDef.cost;
        const burnRisk =
            tuning?.infusionBurnRisks?.[`${card.level}`] ?? levelDef.burnRisk;

        const user = await services.database.collections.waffleUsers!.findOne({
            userId,
        });
        if (!user || user.current_wp < cost) {
            return {
                success: false,
                message: `You need **${cost} WP** to infuse this card. (You have ${user?.current_wp ?? 0} WP)`,
            };
        }

        await services.database.collections.waffleUsers!.updateOne(
            { userId },
            { $inc: { current_wp: -cost } },
        );

        if (Math.random() < burnRisk) {
            await services.database.collections.waffleCards!.updateOne(
                { _id: cardId },
                {
                    $set: {
                        level: 1,
                        infusionMultiplier: 1.0,
                        burnt: true,
                        burntUntil: Date.now() + 2 * 60 * 60 * 1000,
                    },
                },
            );
            return {
                success: true,
                message: `🔥 Infusion failed. The card reset to level 1 and is burnt for 2 hours. (**${cost} WP** spent)`,
            };
        }

        const [minMultiplier, maxMultiplier] = levelDef.multiplierRange;
        const multiplier = parseFloat(
            (
                Math.random() * (maxMultiplier - minMultiplier) +
                minMultiplier
            ).toFixed(2),
        );
        await services.database.collections.waffleCards!.updateOne(
            { _id: cardId },
            {
                $set: {
                    level: card.level + 1,
                    infusionMultiplier: multiplier,
                    burnt: false,
                    burntUntil: null,
                },
            },
        );

        return {
            success: true,
            message: `✨ Infusion succeeded. Card is now level ${card.level + 1}. (**${cost} WP** spent)`,
        };
    }

    async getInfusionPreview(
        cardId: ObjectId,
        userId: string,
        services: Services,
    ): Promise<{
        success: boolean;
        message: string;
        cost?: number;
        burnRisk?: number;
        nextLevel?: number;
    }> {
        const card = await services.database.collections.waffleCards!.findOne({
            _id: cardId,
            ownerId: userId,
        });
        if (!card)
            return {
                success: false,
                message: "Card not found in your collection.",
            };
        if (card.level >= 5)
            return { success: false, message: "Card is already level 5." };
        if (card.auctionStatus !== "none")
            return {
                success: false,
                message: "You can't infuse a listed card.",
            };

        const levelDef = INFUSION_LEVELS[card.level - 1];
        const tuning =
            await services.database.collections.waffleTuning!.findOne({
                _id: "tuning",
            });
        const cost = tuning?.infusionCosts?.[`${card.level}`] ?? levelDef.cost;
        const burnRisk =
            tuning?.infusionBurnRisks?.[`${card.level}`] ?? levelDef.burnRisk;

        return {
            success: true,
            message: `Infuse this card to level ${card.level + 1} for **${cost} WP**? Burn risk: **${Math.round(burnRisk * 100)}%**.`,
            cost,
            burnRisk,
            nextLevel: card.level + 1,
        };
    }

    async handleInfuseConfirm(
        interaction: ButtonInteraction,
        token: string,
        services: Services,
    ): Promise<void> {
        const [cardId, ownerId] = token.split(":");
        if (!cardId || !ownerId || ownerId !== interaction.user.id) {
            await interaction.reply({
                content: "That infusion confirmation isn't for you.",
                ephemeral: true,
            });
            return;
        }

        const result = await this.infuseCard(
            new ObjectId(cardId),
            interaction.user.id,
            services,
        );
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(
                    `waffle_card_view_value_${cardId}:${interaction.user.id}`,
                )
                .setLabel("View Card Value")
                .setStyle(ButtonStyle.Secondary),
        );
        await interaction.update({
            content: result.message,
            embeds: [],
            components: [row],
        });
    }

    async handleViewSpawnValue(
        interaction: ButtonInteraction,
        services: Services,
    ): Promise<void> {
        const spawn = await services.database.collections.waffleSpawns!.findOne(
            { messageId: interaction.message.id },
        );
        if (
            !spawn ||
            spawn.status !== "claimed" ||
            spawn.winnerId !== interaction.user.id
        ) {
            await interaction.reply({
                content: "That private card value isn't for you.",
                ephemeral: true,
            });
            return;
        }

        const card = await services.database.collections.waffleCards!.findOne({
            _id: spawn.cardInstanceId,
        });
        if (!card) {
            await interaction.reply({
                content: "Card not found.",
                ephemeral: true,
            });
            return;
        }

        const template = CARD_TEMPLATE_MAP.get(card.cardId);
        const effectiveValue = this.getEffectiveValue(card);
        await interaction.reply({
            content: `${template?.emoji ?? "🧇"} **${template?.name ?? card.cardId}** rolled **${card.rolledValue} WP** | multiplier **${card.infusionMultiplier}x** | effective **${effectiveValue} WP**${card.burnt && card.burntUntil && card.burntUntil > Date.now() ? " | burnt" : ""}.`,
            ephemeral: true,
        });
    }

    async handleViewCardValue(
        interaction: ButtonInteraction,
        token: string,
        services: Services,
    ): Promise<void> {
        const [cardId, ownerId] = token.split(":");
        if (!cardId || !ownerId || ownerId !== interaction.user.id) {
            await interaction.reply({
                content: "That private card value isn't for you.",
                ephemeral: true,
            });
            return;
        }

        const card = await services.database.collections.waffleCards!.findOne({
            _id: new ObjectId(cardId),
            ownerId,
        });
        if (!card) {
            await interaction.reply({
                content: "Card not found.",
                ephemeral: true,
            });
            return;
        }

        const template = CARD_TEMPLATE_MAP.get(card.cardId);
        const effectiveValue = this.getEffectiveValue(card);
        await interaction.reply({
            content: `${template?.emoji ?? "🧇"} **${template?.name ?? card.cardId}** rolled **${card.rolledValue} WP** | multiplier **${card.infusionMultiplier}x** | effective **${effectiveValue} WP**${card.burnt && card.burntUntil && card.burntUntil > Date.now() ? " | burnt" : ""}.`,
            ephemeral: true,
        });
    }

    async handleViewCardPairValues(
        interaction: ButtonInteraction,
        token: string,
        services: Services,
    ): Promise<void> {
        const [cardAId, cardBId, ownerId] = token.split(":");
        if (
            !cardAId ||
            !cardBId ||
            !ownerId ||
            ownerId !== interaction.user.id
        ) {
            await interaction.reply({
                content: "Those private card values aren't for you.",
                ephemeral: true,
            });
            return;
        }

        const cards = await services.database.collections
            .waffleCards!.find({
                _id: { $in: [new ObjectId(cardAId), new ObjectId(cardBId)] },
                ownerId,
            })
            .toArray();
        if (cards.length === 0) {
            await interaction.reply({
                content: "Cards not found.",
                ephemeral: true,
            });
            return;
        }

        const lines = cards.map((card) => {
            const template = CARD_TEMPLATE_MAP.get(card.cardId);
            const effectiveValue = this.getEffectiveValue(card);
            return `${template?.emoji ?? "🧇"} **${template?.name ?? card.cardId}** rolled **${card.rolledValue} WP** | multiplier **${card.infusionMultiplier}x** | effective **${effectiveValue} WP**${card.burnt && card.burntUntil && card.burntUntil > Date.now() ? " | burnt" : ""}.`;
        });
        await interaction.reply({ content: lines.join("\n"), ephemeral: true });
    }

    private rollSpawnThreshold(
        day: number,
        final24h: boolean,
        overrideRange?: [number, number],
    ): number {
        let range: [number, number];
        if (overrideRange) {
            range = final24h
                ? [
                      Math.ceil(overrideRange[0] * 0.5),
                      Math.ceil(overrideRange[1] * 0.5),
                  ]
                : overrideRange;
        } else if (final24h || day >= 7) {
            range = [120, 220];
        } else if (day <= 3) {
            range = [220, 380];
        } else {
            range = [170, 300];
        }
        return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    }

    private async triggerSpawnFromGuild(
        channel: TextChannel | undefined | null,
        services: Services,
        rarityOverride?: CardRarity,
        typeFilter?: "base" | "topping" | "special",
        triggerMessageId?: string,
    ): Promise<void> {
        if (!channel) return;

        const existing = await this.getActiveSpawn(services);
        if (existing) return;

        const tuning =
            await services.database.collections.waffleTuning!.findOne({
                _id: "tuning",
            });
        const weights = {
            ...(this.waffle.eventState?.final24h
                ? FINAL24H_DROP_WEIGHTS
                : DEFAULT_DROP_WEIGHTS),
            ...(tuning?.dropRateWeights ?? {}),
        } as Record<CardRarity, number>;
        const template = this.rollRandomCard(
            rarityOverride,
            typeFilter,
            weights,
            tuning?.specialDropRateMultiplier ?? 0.25,
        );
        const rolledValue = this.rollValue(template);
        const challengeType = this.getChallengeType(template.rarity);
        const spawnData: Record<string, any> = {};
        const nextSpawnSerial = (this.waffle.eventState?.spawnSerial ?? 0) + 1;

        let description = this.getChallengeDescription(template.rarity);
        if (challengeType === "emoji_sequence") {
            const sequence = this.buildEmojiSequence();
            spawnData.sequence = sequence;
            spawnData.progress = {};
            description = `React with: **${sequence.join(" → ")}** in order!`;
        }
        if (triggerMessageId) {
            spawnData.triggerMessageId = triggerMessageId;
        }

        const msg = await channel.send({
            embeds: [
                spawnEmbed(
                    template.name,
                    template.emoji,
                    template.rarity,
                    description,
                ),
            ],
        });

        const cardId = await this.createCard(
            template.id,
            null,
            services,
            undefined,
            "spawn",
            rolledValue,
        );
        const result =
            await services.database.collections.waffleSpawns!.insertOne({
                cardInstanceId: cardId,
                cardTemplateId: template.id,
                rarity: template.rarity,
                challengeType,
                status: "active",
                channelId: channel.id,
                messageId: msg.id,
                startedAt: Date.now(),
                expiresAt: Date.now() + 5 * 60 * 1000,
                winnerId: null,
                data: { ...spawnData, spawnSerial: nextSpawnSerial },
            } as any);

        if (this.waffle.eventState) {
            this.waffle.eventState.currentSpawnId = result.insertedId;
            this.waffle.eventState.spawnSerial = nextSpawnSerial;
        }
        await this.waffle.bumpRuntimeCounter("spawnedCards", 1, services);
        await services.database.collections.waffleEventState!.updateOne(
            { _id: "event_state" },
            {
                $set: {
                    currentSpawnId: result.insertedId,
                    spawnSerial: nextSpawnSerial,
                },
            },
        );
    }

    private getChallengeType(rarity: CardRarity): WaffleSpawn["challengeType"] {
        switch (rarity) {
            case "common":
                return "emoji_sequence";
            case "uncommon":
                return "word_starts";
            case "rare":
                return "long_acronym";
            case "epic":
                return "epic_combo";
            case "legendary":
                return "legendary_methods";
        }
    }

    private getChallengeDescription(rarity: CardRarity): string {
        switch (rarity) {
            case "common":
                return "React with the correct emoji sequence first to claim this card!";
            case "uncommon":
                return "Send a message using at least 6 words, and every word must start with one of the letters in **W-A-F-F-L-E**.";
            case "rare":
                return "Send a message with 6 consecutive words whose first letters spell **W-A-F-F-L-E**, and every word must be at least 5 letters long.";
            case "epic":
                return "Send a message with the 🧇 emoji, a verb-form waffle phrase, and a valid WAFFLE acronym all at once.";
            case "legendary":
                return "Send a single message that triggers at least **4** scoring methods at once.";
        }
    }

    private buildEmojiSequence(): string[] {
        const pool = ["🧇", "⭐", "🍯", "🍁", "🫐", "☁️", "🍫", "🎩"];
        return [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    }

    private normalizeAcronymResponse(content: string): string {
        return content
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim()
            .replace(/\s+/g, " ");
    }

    private async tryReserveAcronymResponse(
        userId: string,
        content: string,
        services: Services,
    ): Promise<boolean> {
        const normalized = this.normalizeAcronymResponse(content);
        if (!normalized) return false;
        const baseUser = defaultWaffleUser(userId);
        const { used_acronym_responses: _unusedResponses, ...insertUser } =
            baseUser;

        await services.database.collections.waffleUsers!.updateOne(
            { userId },
            { $setOnInsert: { ...insertUser } },
            { upsert: true },
        );

        const result =
            await services.database.collections.waffleUsers!.updateOne(
            {
                userId,
                used_acronym_responses: { $ne: normalized },
            },
            {
                $addToSet: { used_acronym_responses: normalized },
            },
            { upsert: false },
        );

        return result.modifiedCount > 0;
    }

    private async getActiveSpawn(
        services: Services,
    ): Promise<WaffleSpawn | null> {
        const currentSpawnId = this.waffle.eventState?.currentSpawnId;
        if (currentSpawnId) {
            const current =
                await services.database.collections.waffleSpawns!.findOne({
                    _id: currentSpawnId,
                    status: "active",
                });
            if (current) return current;
        }
        return services.database.collections.waffleSpawns!.findOne(
            { status: "active" },
            { sort: { startedAt: -1 } },
        );
    }

    private async getSpawnClaimRestriction(
        userId: string,
        spawn: WaffleSpawn,
        services: Services,
    ): Promise<string | null> {
        const user = await services.database.collections.waffleUsers!.findOne({
            userId,
        });
        const blockedUntilSerial = user?.spawn_claim_blocked_until_serial ?? 0;
        const spawnSerial = Number(spawn.data?.spawnSerial ?? 0);
        if (spawnSerial > 0 && blockedUntilSerial >= spawnSerial) {
            const remaining = blockedUntilSerial - spawnSerial + 1;
            const nextWord = remaining === 1 ? "spawn" : "spawns";
            return `You claimed a recent card and can't claim the next two spawns. You must wait ${remaining} more ${nextWord}.`;
        }
        return null;
    }

    private async notifyBlockedClaimOnce(
        spawn: WaffleSpawn,
        userId: string,
        message: string,
        services: Services,
    ): Promise<void> {
        const result =
            await services.database.collections.waffleSpawns!.updateOne(
            {
                _id: spawn._id,
                [`data.blockedClaimNoticeSent.${userId}`]: { $ne: true },
            },
            {
                $set: { [`data.blockedClaimNoticeSent.${userId}`]: true },
            },
        );
        if (result.modifiedCount === 0) return;

        const user = await this.waffle.client.users.fetch(userId).catch(
            () => null,
        );
        await user?.send(message).catch(() => null);
    }

    private async claimSpawn(
        spawn: WaffleSpawn,
        winnerId: string,
        winnerTag: string,
        services: Services,
    ): Promise<void> {
        if (!(await this.canReceiveCards(winnerId, 1, services))) {
            const winner = await this.waffle.client.users
                .fetch(winnerId)
                .catch(() => null);
            await winner?.send(this.inventoryCapMessage(1)).catch(() => null);
            return;
        }

        const updateResult =
            await services.database.collections.waffleSpawns!.updateOne(
                { _id: spawn._id, status: "active" },
                { $set: { status: "claiming", winnerId } },
            );
        if (updateResult.modifiedCount === 0) return;

        await services.database.collections.waffleCards!.updateOne(
            { _id: spawn.cardInstanceId },
            {
                $set: {
                    ownerId: winnerId,
                    auctionStatus: "none",
                    auctionMinBid: null,
                },
            },
        );
        const spawnSerial = Number(spawn.data?.spawnSerial ?? 0);
        if (spawnSerial > 0) {
            const baseUser = defaultWaffleUser(winnerId);
            const {
                spawn_claim_blocked_until_serial: _unusedBlockedSerial,
                ...insertUser
            } = baseUser;
            await services.database.collections.waffleUsers!.updateOne(
                { userId: winnerId },
                {
                    $set: { spawn_claim_blocked_until_serial: spawnSerial + 2 },
                    $setOnInsert: insertUser,
                },
                { upsert: true },
            );
        }
        await this.waffle.bumpRuntimeCounter("claimedSpawns", 1, services);

        if (this.waffle.eventState) {
            this.waffle.eventState.currentSpawnId = null;
        }
        await services.database.collections.waffleEventState!.updateOne(
            { _id: "event_state" },
            { $set: { currentSpawnId: null } },
        );

        const channel = await this.getHouseChannel();
        const message = channel
            ? await channel.messages.fetch(spawn.messageId).catch(() => null)
            : null;
        const template = CARD_TEMPLATE_MAP.get(spawn.cardTemplateId);
        if (message && template) {
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId("waffle_spawn_view_value")
                    .setLabel("View Card Value")
                    .setStyle(ButtonStyle.Secondary),
            );
            await message
                .edit({
                    embeds: [
                        spawnWinnerEmbed(
                            template.name,
                            template.emoji,
                            template.rarity,
                            winnerTag,
                        ),
                    ],
                    components: [row],
                })
                .catch(() => null);
        }

        await services.database.collections.waffleSpawns!.updateOne(
            { _id: spawn._id, status: "claiming" },
            { $set: { status: "claimed" } },
        );
    }

    private async expireSpawn(
        spawn: WaffleSpawn,
        services: Services,
    ): Promise<void> {
        const claim =
            await services.database.collections.waffleSpawns!.updateOne(
                { _id: spawn._id, status: "active" },
                { $set: { status: "expiring" } },
            );
        if (claim.modifiedCount === 0) return;
        await services.database.collections.waffleSpawns!.updateOne(
            { _id: spawn._id, status: "expiring" },
            { $set: { status: "expired" } },
        );
        await this.waffle.bumpRuntimeCounter("expiredSpawns", 1, services);

        if (this.waffle.eventState?.currentSpawnId?.equals(spawn._id!)) {
            this.waffle.eventState.currentSpawnId = null;
            await services.database.collections.waffleEventState!.updateOne(
                { _id: "event_state" },
                { $set: { currentSpawnId: null } },
            );
        }

        const channel = await this.getHouseChannel();
        const message = channel
            ? await channel.messages.fetch(spawn.messageId).catch(() => null)
            : null;
        const template = CARD_TEMPLATE_MAP.get(spawn.cardTemplateId);
        if (message && template) {
            await message
                .edit({
                    embeds: [spawnTimeoutEmbed(template.name, template.rarity)],
                    components: [],
                })
                .catch(() => null);
        }
    }

    private async getHouseChannel(): Promise<TextChannel | null> {
        const guild = this.waffle.getEventGuild();
        if (!guild) return null;
        return (
            (guild.channels.cache.get(waffleChannelIds.house) as TextChannel) ??
            null
        );
    }
}
