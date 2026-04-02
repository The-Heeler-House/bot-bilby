import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    EmbedBuilder,
    ModalBuilder,
    ModalSubmitInteraction,
    TextChannel,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import { ObjectId } from "mongodb";
import { Services } from "../index";
import { CARD_TEMPLATE_MAP } from "./data/cards";
import { baseEmbed } from "./util/embeds";
import { waffleChannelIds } from "../../constants";
import { WaffleAuction } from "./models/waffleAuction";
import { WaffleCard } from "./models/waffleCard";
import type WaffleHouseService from "./index";
import { WAFFLE_CARD_CAP } from "./CardManager";

const AUCTION_BATCH_SIZE = 5;
const USER_AUCTION_LISTING_CAP = 5;

export default class AuctionManager {
    private waffle: WaffleHouseService;

    constructor(waffle: WaffleHouseService) {
        this.waffle = waffle;
    }

    async initialize(services: Services): Promise<void> {
        await this.sweep(services);
    }

    async sweep(services: Services): Promise<void> {
        const eventState = this.waffle.eventState;
        if (!eventState?.eventActive) return;

        const now = Date.now();
        const expiredLive = await services.database.collections.waffleAuctions!.find({
            status: "live",
            resolvesAt: { $lte: now },
        }).toArray();

        if (expiredLive.length > 0) {
            for (const auction of expiredLive) {
                const claimed = await services.database.collections.waffleAuctions!.findOneAndUpdate(
                    { _id: auction._id, status: "live", resolvesAt: auction.resolvesAt },
                    { $set: { status: "resolving" } },
                    { returnDocument: "after" }
                );
                if (claimed) {
                    await this.resolveAuction(claimed as unknown as WaffleAuction, services);
                }
            }
            eventState.currentAuctionBatchMessageId = null;
            await services.database.collections.waffleEventState!.updateOne(
                { _id: "event_state" },
                { $set: { currentAuctionBatchMessageId: null } }
            );
        }

        if (this.waffle.eventState && this.waffle.eventState.nextAuctionAt <= now) {
            await this.runAuctionCycle(services, now);
        }
    }

    async handleBidButton(interaction: ButtonInteraction, auctionId: string): Promise<void> {
        const modal = new ModalBuilder()
            .setCustomId(`waffle_auction_modal_${auctionId}`)
            .setTitle("Place Your Bid")
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId("bid_amount")
                        .setLabel("Bid Amount (WP)")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );

        await interaction.showModal(modal);
    }

    async handleBidModal(interaction: ModalSubmitInteraction, auctionId: string, services: Services): Promise<void> {
        const rawBid = interaction.fields.getTextInputValue("bid_amount");
        const bidAmount = parseInt(rawBid, 10);
        if (Number.isNaN(bidAmount) || bidAmount <= 0) {
            await interaction.reply({ content: "Invalid bid amount.", ephemeral: true });
            return;
        }

        const batchMessageId = this.waffle.eventState?.currentAuctionBatchMessageId;
        if (!batchMessageId) {
            await interaction.reply({ content: "There is no active auction batch.", ephemeral: true });
            return;
        }

        const auction = await services.database.collections.waffleAuctions!.findOne({
            _id: new ObjectId(auctionId),
            status: "live",
            messageId: batchMessageId,
        });
        if (!auction) {
            await interaction.reply({ content: "Auction not found.", ephemeral: true });
            return;
        }

        if (auction.currentHighBid != null && bidAmount <= auction.currentHighBid) {
            await interaction.reply({ content: `Bid must be higher than **${auction.currentHighBid} WP**.`, ephemeral: true });
            return;
        }
        if (auction.currentHighBid == null && bidAmount <= auction.minBid) {
            await interaction.reply({ content: `Bid must be higher than the minimum bid of **${auction.minBid} WP**.`, ephemeral: true });
            return;
        }

        const user = await services.database.collections.waffleUsers!.findOne({ userId: interaction.user.id });
        if (!await this.waffle.cardManager.canReceiveCards(interaction.user.id, 1, services)) {
            await interaction.reply({ content: this.waffle.cardManager.inventoryCapMessage(1), ephemeral: true });
            return;
        }
        const reservationKey = auction._id!.toString();
        const existingReservation = user?.active_bids?.[reservationKey] ?? 0;
        const availableWp = (user?.current_wp ?? 0) - (user?.reserved_wp ?? 0) + existingReservation;
        if (!user || availableWp < bidAmount) {
            await interaction.reply({ content: `You don't have enough available WP. (Available: ${availableWp})`, ephemeral: true });
            return;
        }

        const previousBidderId = auction.currentHighBidderId;
        const previousBidAmount = auction.currentHighBid ?? 0;

        const bidUpdate = await services.database.collections.waffleAuctions!.updateOne(
            {
                _id: auction._id,
                status: "live",
                $or: [
                    { currentHighBid: null, minBid: { $lt: bidAmount } },
                    { currentHighBid: { $lt: bidAmount } },
                ],
            },
            { $set: { currentHighBid: bidAmount, currentHighBidderId: interaction.user.id } }
        );
        if (bidUpdate.modifiedCount === 0) {
            await interaction.reply({ content: "That auction changed before your bid landed. Try again.", ephemeral: true });
            return;
        }

        await services.database.collections.waffleUsers!.updateOne(
            { userId: interaction.user.id },
            {
                $inc: { reserved_wp: bidAmount - existingReservation },
                $set: { [`active_bids.${reservationKey}`]: bidAmount },
            }
        );

        if (previousBidderId && previousBidderId !== interaction.user.id) {
            await services.database.collections.waffleUsers!.updateOne(
                { userId: previousBidderId },
                {
                    $inc: { reserved_wp: -previousBidAmount },
                    $unset: { [`active_bids.${reservationKey}`]: "" },
                }
            );
        }

        await interaction.reply({ content: `Placed bid of **${bidAmount} WP**.`, ephemeral: true });
        await this.refreshBatchMessage(batchMessageId, services);
    }

    async listCard(cardId: ObjectId, userId: string, minBid: number, services: Services): Promise<{ success: boolean; message: string }> {
        const card = await services.database.collections.waffleCards!.findOne({ _id: cardId, ownerId: userId });
        if (!card) return { success: false, message: "Card not found in your collection." };
        if (card.auctionStatus !== "none") return { success: false, message: "Card is already listed." };

        const activeListings = await services.database.collections.waffleAuctions!.countDocuments({
            sellerId: userId,
            status: { $in: ["pooled", "live", "resolving"] },
        });
        if (activeListings >= USER_AUCTION_LISTING_CAP) {
            return {
                success: false,
                message: `You can only have ${USER_AUCTION_LISTING_CAP} cards listed in the auction house at once.`,
            };
        }

        await services.database.collections.waffleCards!.updateOne(
            { _id: cardId },
            { $set: { auctionStatus: "pooled", auctionMinBid: minBid } }
        );
        await services.database.collections.waffleAuctions!.insertOne({
            cardInstanceId: cardId,
            sellerId: userId,
            minBid,
            listedAt: Date.now(),
            batchId: null,
            currentHighBid: null,
            currentHighBidderId: null,
            status: "pooled",
            liveAt: null,
            resolvesAt: null,
            messageId: null,
        } as any);

        const template = CARD_TEMPLATE_MAP.get(card.cardId);
        return {
            success: true,
            message: `Listed **${template?.name ?? card.cardId}** with a minimum bid of **${minBid} WP**.`,
        };
    }

    async withdrawCard(cardId: ObjectId, userId: string, services: Services): Promise<{ success: boolean; message: string }> {
        const auction = await services.database.collections.waffleAuctions!.findOne({
            cardInstanceId: cardId,
            sellerId: userId,
            status: "pooled",
        });
        if (!auction) {
            return { success: false, message: "Card is not sitting in the auction pool." };
        }

        await services.database.collections.waffleAuctions!.deleteOne({ _id: auction._id });
        await services.database.collections.waffleCards!.updateOne(
            { _id: cardId },
            { $set: { auctionStatus: "none", auctionMinBid: null } }
        );

        return { success: true, message: "Card withdrawn from the auction pool." };
    }

    private async getIntervalMs(services: Services): Promise<number> {
        const tuning = await services.database.collections.waffleTuning!.findOne({ _id: "tuning" });
        return tuning?.auctionRefreshMs ?? (this.waffle.eventState?.final24h ? 15 * 60 * 1000 : 30 * 60 * 1000);
    }

    private async runAuctionCycle(services: Services, now: number): Promise<void> {
        const eventState = this.waffle.eventState;
        if (!eventState?.eventActive) return;

        const intervalMs = await this.getIntervalMs(services);
        const nextAuctionAt = now + intervalMs;
        const stateClaim = await services.database.collections.waffleEventState!.updateOne(
            {
                _id: "event_state",
                nextAuctionAt: { $lte: now },
            },
            {
                $set: {
                    nextAuctionAt,
                    currentAuctionBatchMessageId: "__auction_batch_pending__",
                },
            }
        );
        if (stateClaim.modifiedCount === 0) return;

        const pooled = await services.database.collections.waffleAuctions!.aggregate([
            { $match: { status: "pooled" } },
            { $sample: { size: AUCTION_BATCH_SIZE } },
        ]).toArray() as WaffleAuction[];

        eventState.nextAuctionAt = nextAuctionAt;

        if (pooled.length === 0) {
            eventState.currentAuctionBatchMessageId = null;
            await services.database.collections.waffleEventState!.updateOne(
                { _id: "event_state" },
                { $set: { nextAuctionAt, currentAuctionBatchMessageId: null } }
            );
            return;
        }

        const liveAt = now;
        const resolvesAt = liveAt + intervalMs;
        const batchId = `${liveAt}`;

        const auctionIds = pooled.map(auction => auction._id!);
        await services.database.collections.waffleAuctions!.updateMany(
            { _id: { $in: auctionIds } },
            { $set: { status: "live", liveAt, resolvesAt, batchId } }
        );

        const liveAuctions = await services.database.collections.waffleAuctions!.find(
            { _id: { $in: auctionIds } },
            { sort: { liveAt: 1, _id: 1 } }
        ).toArray();
        const cards = await Promise.all(
            liveAuctions.map(auction => services.database.collections.waffleCards!.findOne({ _id: auction.cardInstanceId }))
        );

        const channel = await this.getHouseChannel();
        if (!channel) return;

        const msg = await channel.send({
            embeds: [await this.buildAuctionEmbed(liveAuctions, cards, resolvesAt)],
            components: this.buildAuctionButtons(liveAuctions),
        });

        await services.database.collections.waffleAuctions!.updateMany(
            { _id: { $in: auctionIds } },
            { $set: { messageId: msg.id } }
        );

        eventState.currentAuctionBatchMessageId = msg.id;
        await services.database.collections.waffleEventState!.updateOne(
            { _id: "event_state" },
            { $set: { nextAuctionAt, currentAuctionBatchMessageId: msg.id } }
        );
    }

    private async resolveAuction(auction: WaffleAuction, services: Services): Promise<void> {
        const channel = await this.getHouseChannel();
        const card = await services.database.collections.waffleCards!.findOne({ _id: auction.cardInstanceId });
        const template = card ? CARD_TEMPLATE_MAP.get(card.cardId) : null;

        if (auction.status !== "resolving") return;

        if (auction.currentHighBidderId && auction.currentHighBid) {
            if (!await this.waffle.cardManager.canReceiveCards(auction.currentHighBidderId, 1, services)) {
                await services.database.collections.waffleUsers!.updateOne(
                    { userId: auction.currentHighBidderId },
                    {
                        $inc: { reserved_wp: -auction.currentHighBid },
                        $unset: { [`active_bids.${auction._id!.toString()}`]: "" },
                    }
                );
                await services.database.collections.waffleAuctions!.updateOne(
                    { _id: auction._id, status: "resolving" },
                    { $set: { status: "pooled", batchId: null, messageId: null, liveAt: null, resolvesAt: null, currentHighBid: null, currentHighBidderId: null } }
                );

                if (channel && card) {
                    await channel.send({
                        embeds: [
                            baseEmbed()
                                .setTitle("🧇 Auction Blocked")
                                .setDescription(`${template?.emoji ?? "🧇"} **${template?.name ?? card.cardId}** could not be awarded because the highest bidder hit the ${WAFFLE_CARD_CAP}-card cap. The card returned to the pool.`),
                        ],
                    }).catch(() => null);
                }
                return;
            }
            await services.database.collections.waffleCards!.updateOne(
                { _id: auction.cardInstanceId },
                { $set: { ownerId: auction.currentHighBidderId, auctionStatus: "none", auctionMinBid: null } }
            );
            await services.database.collections.waffleUsers!.updateOne(
                { userId: auction.currentHighBidderId },
                {
                    $inc: { current_wp: -auction.currentHighBid, reserved_wp: -auction.currentHighBid },
                    $unset: { [`active_bids.${auction._id!.toString()}`]: "" },
                    $setOnInsert: {
                        userId: auction.currentHighBidderId,
                        total_wp_earned: 0,
                        discovered_methods: [],
                        milestones_hit: [],
                        hungry_count: 0,
                        hungry_awarded: false,
                        first_waffle_awarded: false,
                        cooldowns: {},
                    },
                },
                { upsert: true }
            );
            if (auction.sellerId !== "system") {
                await services.database.collections.waffleUsers!.updateOne(
                    { userId: auction.sellerId },
                    {
                        $inc: { current_wp: auction.currentHighBid },
                        $setOnInsert: {
                            userId: auction.sellerId,
                            total_wp_earned: 0,
                            reserved_wp: 0,
                            active_bids: {},
                            discovered_methods: [],
                            milestones_hit: [],
                            hungry_count: 0,
                            hungry_awarded: false,
                            first_waffle_awarded: false,
                            cooldowns: {},
                        },
                    },
                    { upsert: true }
                );
            }

            await services.database.collections.waffleAuctions!.updateOne(
                { _id: auction._id },
                { $set: { status: "resolved" } }
            );
            await this.waffle.bumpRuntimeCounter("auctionSales", 1, services);
            await this.waffle.bumpRuntimeCounter("auctionSaleWp", auction.currentHighBid, services);

            if (channel && card) {
                await channel.send({
                    embeds: [
                        baseEmbed()
                            .setTitle("🧇 The Waffle Has Spoken")
                            .setDescription(
                                `${template?.emoji ?? "🧇"} **${template?.name ?? card.cardId}** sold for **${auction.currentHighBid} WP**.\nSeller: ${auction.sellerId === "system" ? "The House" : `<@${auction.sellerId}>`}\nBuyer: <@${auction.currentHighBidderId}>\nTrue Value: **${card.rolledValue} WP**`
                            ),
                    ],
                }).catch(() => null);
            }
            return;
        }

        await services.database.collections.waffleCards!.updateOne(
            { _id: auction.cardInstanceId },
            { $set: { auctionStatus: "pooled" } }
        );
        await services.database.collections.waffleAuctions!.updateOne(
            { _id: auction._id, status: "resolving" },
            { $set: { status: "pooled", batchId: null, messageId: null, liveAt: null, resolvesAt: null } }
        );

        if (channel && card) {
            await channel.send({
                embeds: [
                    baseEmbed()
                        .setTitle("🧇 Auction Passed")
                        .setDescription(`${template?.emoji ?? "🧇"} **${template?.name ?? card.cardId}** received no bids and returned to the pool.`),
                ],
            }).catch(() => null);
        }
    }

    private async refreshBatchMessage(batchMessageId: string, services: Services): Promise<void> {
        const channel = await this.getHouseChannel();
        if (!channel) return;
        const msg = await channel.messages.fetch(batchMessageId).catch(() => null);
        if (!msg) return;

        const auctions = await services.database.collections.waffleAuctions!.find(
            { status: "live", messageId: batchMessageId },
            { sort: { liveAt: 1, _id: 1 } }
        ).toArray();
        if (auctions.length === 0) return;

        const cards = await Promise.all(
            auctions.map(auction => services.database.collections.waffleCards!.findOne({ _id: auction.cardInstanceId }))
        );
        await msg.edit({
            embeds: [await this.buildAuctionEmbed(auctions, cards, auctions[0].resolvesAt!)],
            components: this.buildAuctionButtons(auctions),
        }).catch(() => null);
    }

    private async buildAuctionEmbed(auctions: WaffleAuction[], cards: (WaffleCard | null)[], resolvesAt: number): Promise<EmbedBuilder> {
        const embed = baseEmbed()
            .setTitle("🧇 Auction House — Current Lots")
            .setDescription(`Auctions close <t:${Math.floor(resolvesAt / 1000)}:R>`);

        for (let index = 0; index < auctions.length; index++) {
            const auction = auctions[index];
            const card = cards[index];
            if (!card) continue;
            const template = CARD_TEMPLATE_MAP.get(card.cardId);
            embed.addFields({
                name: `${index + 1}. ${template?.emoji ?? "🃏"} ${template?.name ?? card.cardId} (${template?.rarity ?? "unknown"})`,
                value: `Level ${card.level} | Minimum: ${auction.minBid} WP | Highest: **${auction.currentHighBid ?? "No bids yet"}${auction.currentHighBid != null ? " WP" : ""}**`,
            });
        }

        return embed;
    }

    private buildAuctionButtons(auctions: WaffleAuction[]): ActionRowBuilder<ButtonBuilder>[] {
        const rows: ActionRowBuilder<ButtonBuilder>[] = [];
        let row = new ActionRowBuilder<ButtonBuilder>();
        let count = 0;

        for (let index = 0; index < auctions.length; index++) {
            if (count === 5) {
                rows.push(row);
                row = new ActionRowBuilder<ButtonBuilder>();
                count = 0;
            }
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`waffle_auction_bid_${auctions[index]._id!.toString()}`)
                    .setLabel(`Bid on #${index + 1}`)
                    .setStyle(ButtonStyle.Primary)
            );
            count++;
        }
        if (count > 0) rows.push(row);
        return rows;
    }

    private async getHouseChannel(): Promise<TextChannel | null> {
        const guild = this.waffle.getEventGuild();
        if (!guild) return null;
        return guild.channels.cache.get(waffleChannelIds.house) as TextChannel ?? null;
    }
}
