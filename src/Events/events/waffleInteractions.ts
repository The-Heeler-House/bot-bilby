import { ButtonInteraction, Client, Events, Interaction, ModalSubmitInteraction } from "discord.js";
import BotEvent from "../BotEvent";
import { Services } from "../../Services";

export default class WaffleInteractionsEvent extends BotEvent {
    public eventName = Events.InteractionCreate;

    async execute(client: Client, services: Services, interaction: Interaction) {
        if (!services.waffleHouse.eventState?.eventActive) return;

        if (interaction.isButton()) {
            await this.handleButton(interaction, services);
            return;
        }

        if (interaction.isModalSubmit()) {
            await this.handleModal(interaction, services);
        }
    }

    private async handleButton(interaction: ButtonInteraction, services: Services) {
        const { customId } = interaction;

        if (customId === "waffle_minigame_chef_signup") {
            await services.waffleHouse.minigameManager.handleChefSignup(interaction, services);
            return;
        }
        if (customId.startsWith("waffle_minigame_poll_")) {
            await services.waffleHouse.minigameManager.handlePollVote(
                interaction,
                customId.replace("waffle_minigame_poll_", ""),
                services
            );
            return;
        }
        if (customId.startsWith("waffle_minigame_entry_")) {
            await services.waffleHouse.minigameManager.handleEntryVote(
                interaction,
                parseInt(customId.replace("waffle_minigame_entry_", ""), 10),
                services
            );
            return;
        }
        if (customId === "waffle_minigame_alliance_join") {
            await services.waffleHouse.minigameManager.handleAllianceJoin(interaction, services);
            return;
        }
        if (customId.startsWith("waffle_auction_bid_")) {
            await services.waffleHouse.auctionManager.handleBidButton(
                interaction,
                customId.replace("waffle_auction_bid_", "")
            );
            return;
        }
        if (customId.startsWith("waffle_card_infuse_confirm_")) {
            await services.waffleHouse.cardManager.handleInfuseConfirm(
                interaction,
                customId.replace("waffle_card_infuse_confirm_", ""),
                services
            );
            return;
        }
        if (customId === "waffle_spawn_view_value") {
            await services.waffleHouse.cardManager.handleViewSpawnValue(interaction, services);
            return;
        }
        if (customId.startsWith("waffle_card_view_value_")) {
            await services.waffleHouse.cardManager.handleViewCardValue(
                interaction,
                customId.replace("waffle_card_view_value_", ""),
                services
            );
            return;
        }
        if (customId.startsWith("waffle_card_view_pair_values_")) {
            await services.waffleHouse.cardManager.handleViewCardPairValues(
                interaction,
                customId.replace("waffle_card_view_pair_values_", ""),
                services
            );
        }
    }

    private async handleModal(interaction: ModalSubmitInteraction, services: Services) {
        if (interaction.customId.startsWith("waffle_auction_modal_")) {
            await services.waffleHouse.auctionManager.handleBidModal(
                interaction,
                interaction.customId.replace("waffle_auction_modal_", ""),
                services
            );
        }
    }
}
