import {
    ActionRowBuilder,
    AutocompleteInteraction,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import { ObjectId } from "mongodb";
import SlashCommand from "../SlashCommand";
import { Services } from "../../Services";
import { CARD_TEMPLATE_MAP } from "../../Services/WaffleHouse/data/cards";
import { leaderboardEmbed, baseEmbed } from "../../Services/WaffleHouse/util/embeds";
import { WAFFLE_CARD_CAP } from "../../Services/WaffleHouse/CardManager";

export default class WaffleCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("waffle")
        .setDescription("Waffle House commands")
        .addSubcommand(sub =>
            sub.setName("leaderboard")
                .setDescription("Show the Waffle House leaderboard"))
        .addSubcommand(sub =>
            sub.setName("stats")
                .setDescription("Show your Waffle House stats"))
        .addSubcommand(sub =>
            sub.setName("cards")
                .setDescription("Show your card collection"))
        .addSubcommand(sub =>
            sub.setName("combine")
                .setDescription("Combine two cards")
                .addStringOption(option => option.setName("card_a").setDescription("First card").setRequired(true).setAutocomplete(true))
                .addStringOption(option => option.setName("card_b").setDescription("Second card").setRequired(true).setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName("infuse")
                .setDescription("Infuse a card")
                .addStringOption(option => option.setName("card").setDescription("Card").setRequired(true).setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName("decompose")
                .setDescription("Split a combined card back into its original components")
                .addStringOption(option => option.setName("card").setDescription("Combined card").setRequired(true).setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName("discard")
                .setDescription("Permanently discard a card")
                .addStringOption(option => option.setName("card").setDescription("Card").setRequired(true).setAutocomplete(true)))
        .addSubcommandGroup(group =>
            group.setName("auction")
                .setDescription("Auction house commands")
                .addSubcommand(sub =>
                    sub.setName("list")
                        .setDescription("List a card in the auction pool")
                        .addStringOption(option => option.setName("card").setDescription("Card").setRequired(true).setAutocomplete(true))
                        .addIntegerOption(option => option.setName("min_bid").setDescription("Minimum bid").setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName("withdraw")
                        .setDescription("Withdraw a pooled auction listing")
                        .addStringOption(option => option.setName("card").setDescription("Card").setRequired(true).setAutocomplete(true)))
                .addSubcommand(sub =>
                    sub.setName("view")
                        .setDescription("View the current auction batch"))) as SlashCommandBuilder;

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
        if (!services.waffleHouse.eventState?.eventActive) {
            await interaction.reply({ content: "The Waffle House isn't currently active.", ephemeral: true });
            return;
        }

        const subGroup = interaction.options.getSubcommandGroup(false);
        const sub = interaction.options.getSubcommand();

        if (subGroup === "auction") {
            await this.handleAuction(interaction, sub, services);
            return;
        }

        switch (sub) {
            case "leaderboard": {
                await interaction.deferReply({ ephemeral: false });
                const entries = await services.waffleHouse.leaderboardManager.getTopN(20, services);
                await interaction.editReply({ embeds: [leaderboardEmbed(entries.map((entry, index) => ({
                    rank: index + 1,
                    tag: entry.tag,
                    score: entry.score,
                }))) ] });
                return;
            }
            case "stats": {
                const user = await services.database.collections.waffleUsers!.findOne({ userId: interaction.user.id });
                const score = await services.waffleHouse.leaderboardManager.getUserScore(interaction.user.id, services);
                const glazes = await services.database.collections.waffleGlazes!.countDocuments({ userId: interaction.user.id, expiresAt: { $gt: Date.now() } });
                const cards = await services.database.collections.waffleCards!.countDocuments({ ownerId: interaction.user.id, auctionStatus: { $ne: "live" } });
                await interaction.reply({
                    embeds: [baseEmbed()
                        .setTitle("🧇 Your Waffle Stats")
                        .addFields(
                            { name: "Current WP", value: `${user?.current_wp ?? 0}`, inline: true },
                            { name: "Total Earned", value: `${user?.total_wp_earned ?? 0}`, inline: true },
                            { name: "Leaderboard Score", value: `${score}`, inline: true },
                            { name: "Cards", value: `${cards}/${WAFFLE_CARD_CAP}`, inline: true },
                            { name: "Active Glazes/Burns", value: `${glazes}`, inline: true },
                        )],
                    ephemeral: false,
                });
                return;
            }
            case "cards": {
                const cards = await services.database.collections.waffleCards!.find({ ownerId: interaction.user.id }).toArray();
                const lines = cards.map(card => {
                    const template = CARD_TEMPLATE_MAP.get(card.cardId);
                    return `${template?.emoji ?? "🧇"} **${template?.name ?? card.cardId}** | ${card.rolledValue} WP | Lv.${card.level}${card.burnt && card.burntUntil && card.burntUntil > Date.now() ? " | burnt" : ""}`;
                }).join("\n");
                await interaction.reply({
                    embeds: [baseEmbed().setTitle(`🃏 Your Collection (${cards.length}/${WAFFLE_CARD_CAP})`).setDescription(lines || "No cards yet.")],
                    ephemeral: true,
                });
                return;
            }
            case "combine": {
                const cardA = new ObjectId(interaction.options.getString("card_a", true));
                const cardB = new ObjectId(interaction.options.getString("card_b", true));
                const result = await services.waffleHouse.cardManager.combineCards(cardA, cardB, interaction.user.id, services);
                const components = result.success && result.newCardId
                    ? [new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`waffle_card_view_value_${result.newCardId.toString()}:${interaction.user.id}`)
                            .setLabel("View Card Value")
                            .setStyle(ButtonStyle.Secondary)
                    )]
                    : [];
                await interaction.reply({ content: result.message, components, ephemeral: false });
                return;
            }
            case "infuse": {
                const cardId = new ObjectId(interaction.options.getString("card", true));
                const preview = await services.waffleHouse.cardManager.getInfusionPreview(cardId, interaction.user.id, services);
                if (!preview.success) {
                    await interaction.reply({ content: preview.message, ephemeral: false });
                    return;
                }

                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`waffle_card_infuse_confirm_${cardId.toString()}:${interaction.user.id}`)
                        .setLabel("Confirm Infusion")
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(`waffle_card_view_value_${cardId.toString()}:${interaction.user.id}`)
                        .setLabel("View Card Value")
                        .setStyle(ButtonStyle.Secondary)
                );
                await interaction.reply({
                    embeds: [baseEmbed().setTitle("✨ Confirm Infusion").setDescription(preview.message)],
                    components: [row],
                    ephemeral: false,
                });
                return;
            }
            case "decompose": {
                const cardId = new ObjectId(interaction.options.getString("card", true));
                const result = await services.waffleHouse.cardManager.decomposeCard(cardId, interaction.user.id, services);
                const components = result.success && result.restoredCardIds?.length === 2
                    ? [new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`waffle_card_view_pair_values_${result.restoredCardIds[0].toString()}:${result.restoredCardIds[1].toString()}:${interaction.user.id}`)
                            .setLabel("View Cards' Values")
                            .setStyle(ButtonStyle.Secondary)
                    )]
                    : [];
                await interaction.reply({ content: result.message, components, ephemeral: false });
                return;
            }
            case "discard": {
                const cardId = new ObjectId(interaction.options.getString("card", true));
                const result = await services.waffleHouse.cardManager.discardCard(cardId, interaction.user.id, services);
                await interaction.reply({ content: result.message, ephemeral: false });
                return;
            }
        }
    }

    async autocomplete(interaction: AutocompleteInteraction, services: Services) {
        if (!services.waffleHouse.eventState?.eventActive) {
            await interaction.respond([]);
            return;
        }

        const cards = await services.database.collections.waffleCards!.find({ ownerId: interaction.user.id }).toArray();
        const focused = interaction.options.getFocused().toLowerCase();
        const filtered = cards
            .map(card => {
                const template = CARD_TEMPLATE_MAP.get(card.cardId);
                return {
                    name: `${template?.name ?? card.cardId} (${card.rolledValue} WP, Lv.${card.level})`.slice(0, 100),
                    value: card._id!.toString(),
                };
            })
            .filter(choice => choice.name.toLowerCase().includes(focused))
            .slice(0, 25);

        await interaction.respond(filtered);
    }

    private async handleAuction(interaction: ChatInputCommandInteraction, sub: string, services: Services) {
        switch (sub) {
            case "list": {
                const cardId = new ObjectId(interaction.options.getString("card", true));
                const minBid = interaction.options.getInteger("min_bid", true);
                const result = await services.waffleHouse.auctionManager.listCard(cardId, interaction.user.id, minBid, services);
                await interaction.reply({ content: result.message, ephemeral: true });
                return;
            }
            case "withdraw": {
                const cardId = new ObjectId(interaction.options.getString("card", true));
                const result = await services.waffleHouse.auctionManager.withdrawCard(cardId, interaction.user.id, services);
                await interaction.reply({ content: result.message, ephemeral: true });
                return;
            }
            case "view": {
                const batchId = services.waffleHouse.eventState?.currentAuctionBatchMessageId;
                if (!batchId) {
                    await interaction.reply({ content: "No live auctions right now.", ephemeral: true });
                    return;
                }
                const auctions = await services.database.collections.waffleAuctions!.find({ messageId: batchId, status: "live" }, { sort: { liveAt: 1, _id: 1 } }).toArray();
                const desc = await Promise.all(auctions.map(async (auction, index) => {
                    const card = await services.database.collections.waffleCards!.findOne({ _id: auction.cardInstanceId });
                    if (!card) return null;
                    const template = CARD_TEMPLATE_MAP.get(card.cardId);
                    return `**${index + 1}.** ${template?.emoji ?? "🃏"} ${template?.name ?? card.cardId} | Lv.${card.level} | Min ${auction.minBid} WP | High ${auction.currentHighBid ?? "none"}`;
                }));
                await interaction.reply({
                    embeds: [baseEmbed().setTitle("🧇 Live Auctions").setDescription(desc.filter(Boolean).join("\n") || "No live auctions.")],
                    ephemeral: true,
                });
                return;
            }
        }
    }
}
