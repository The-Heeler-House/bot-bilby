import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    Message,
    TextChannel,
} from "discord.js";
import { ObjectId } from "mongodb";
import { Services } from "../index";
import { baseEmbed, WAFFLE_FOOTER } from "./util/embeds";
import {
    DEFAULT_CHEF_BATTLE_PROMPTS,
    DEFAULT_POLL_PROMPTS,
    DEFAULT_PROMPT_ENTRY_PROMPTS,
} from "./data/prompts";
import { waffleChannelIds } from "../../constants";
import type WaffleHouseService from "./index";
import { WaffleMinigame } from "./models/waffleMinigame";

type GameType = "chef_battle" | "anonymous_poll" | "prompt_entry" | "waffle_alliance";
type PromptGameType = Exclude<GameType, "waffle_alliance">;

const GAME_ROTATION: GameType[] = ["chef_battle", "anonymous_poll", "prompt_entry", "waffle_alliance"];
const MINIGAME_INTERVAL_MS = 30 * 60 * 1000;
const CHEF_SIGNUP_MS = 5 * 60 * 1000;
const CHEF_BATTLE_MS = 5 * 60 * 1000;
const CHEF_VOTING_MS = 17 * 60 * 1000;
const POLL_VOTING_MS = 25 * 60 * 1000;
const ENTRY_SUBMISSION_MS = 10 * 60 * 1000;
const ENTRY_VOTING_MS = 15 * 60 * 1000;
const ALLIANCE_MS = 27 * 60 * 1000;
type MinigameWpConfig = {
    chefBattle: { winner: number; loser: number; tie: number };
    poll: { winner: number; loser: number; tie: number };
    promptEntry: { winner: number; submitter: number };
    alliance: { winner: number; loser: number; tie: number };
};

const MINIGAME_WP: MinigameWpConfig = {
    chefBattle: { winner: 200, loser: 75, tie: 150 },
    poll: { winner: 50, loser: 15, tie: 35 },
    promptEntry: { winner: 200, submitter: 50 },
    alliance: { winner: 100, loser: 35, tie: 70 },
};

export default class MinigameManager {
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

        if (eventState.currentMinigameId) {
            const game = await services.database.collections.waffleMinigames!.findOne({ _id: eventState.currentMinigameId });
            if (!game) {
                await this.clearCurrentGame(services);
            } else if (game.status !== "resolved" && game.status !== "cancelled" && game.phaseEndsAt <= now) {
                await this.progressGame(game, services);
            } else if (game.status === "resolved" || game.status === "cancelled") {
                await this.clearCurrentGame(services);
            }
        }

        if (!this.waffle.eventState?.currentMinigameId && this.waffle.eventState && this.waffle.eventState.nextMinigameAt <= now) {
            await this.startNextGame(services);
        }
    }

    async handleDirectMessage(message: Message, services: Services): Promise<boolean> {
        const eventState = this.waffle.eventState;
        if (!eventState?.currentMinigameId) return false;

        const game = await services.database.collections.waffleMinigames!.findOne({ _id: eventState.currentMinigameId });
        if (!game || game.status === "resolved" || game.status === "cancelled" || game.status === "transitioning") return false;

        if (game.gameType === "chef_battle" && game.phase === "battle") {
            return this.handleChefBattleDM(game, message, services);
        }

        if (game.gameType === "prompt_entry" && game.phase === "submission") {
            return this.handlePromptEntryDM(game, message, services);
        }

        return false;
    }

    async handleChefSignup(interaction: ButtonInteraction, services: Services): Promise<void> {
        const game = await this.getCurrentGame(services);
        if (!game || game.gameType !== "chef_battle" || game.phase !== "signup") {
            await interaction.reply({ content: "Signup is closed.", ephemeral: true });
            return;
        }
        if ((game.data.signups as string[]).includes(interaction.user.id)) {
            await interaction.reply({ content: "You're already signed up.", ephemeral: true });
            return;
        }

        await services.database.collections.waffleMinigames!.updateOne(
            { _id: game._id },
            { $addToSet: { "data.signups": interaction.user.id } }
        );

        await interaction.reply({ content: "You're signed up for Chef Battle. Watch your DMs.", ephemeral: true });
    }

    async handlePollVote(interaction: ButtonInteraction, option: string, services: Services): Promise<void> {
        const game = await this.getCurrentGame(services);
        if (!game || game.gameType !== "anonymous_poll" || game.phase !== "active") {
            await interaction.reply({ content: "This poll is no longer active.", ephemeral: true });
            return;
        }

        const votes = game.data.votes as Record<string, string[]>;
        const allVoters = Object.values(votes).flat();
        if (allVoters.includes(interaction.user.id)) {
            await interaction.reply({ content: "You've already voted.", ephemeral: true });
            return;
        }
        if (!votes[option]) {
            await interaction.reply({ content: "That option is invalid.", ephemeral: true });
            return;
        }

        await services.database.collections.waffleMinigames!.updateOne(
            { _id: game._id },
            { $addToSet: { [`data.votes.${option}`]: interaction.user.id } }
        );

        await interaction.reply({ content: `Voted for **${option}**.`, ephemeral: true });
    }

    async handleEntryVote(interaction: ButtonInteraction, entryIndex: number, services: Services): Promise<void> {
        const game = await this.getCurrentGame(services);
        if (!game || game.gameType !== "prompt_entry" || game.phase !== "voting") {
            await interaction.reply({ content: "Voting is closed.", ephemeral: true });
            return;
        }

        const entries: { userId: string; text: string }[] = game.data.entries;
        const allVoters = Object.values(game.data.votes as Record<string, string[]>).flat();
        if (allVoters.includes(interaction.user.id)) {
            await interaction.reply({ content: "You've already voted.", ephemeral: true });
            return;
        }

        const entry = entries[entryIndex - 1];
        if (!entry) {
            await interaction.reply({ content: "That entry does not exist.", ephemeral: true });
            return;
        }
        if (entry.userId === interaction.user.id) {
            await interaction.reply({ content: "You can't vote for your own entry.", ephemeral: true });
            return;
        }

        await services.database.collections.waffleMinigames!.updateOne(
            { _id: game._id },
            { $addToSet: { [`data.votes.${entryIndex}`]: interaction.user.id } }
        );

        await interaction.reply({ content: `Vote cast for entry #${entryIndex}.`, ephemeral: true });
    }

    async handleAllianceJoin(interaction: ButtonInteraction, services: Services): Promise<void> {
        const game = await this.getCurrentGame(services);
        if (!game || game.gameType !== "waffle_alliance" || game.phase !== "active") {
            await interaction.reply({ content: "No active Waffle Alliance to join.", ephemeral: true });
            return;
        }

        const butter: string[] = game.data.teams.butter;
        const syrup: string[] = game.data.teams.syrup;
        if (butter.includes(interaction.user.id) || syrup.includes(interaction.user.id)) {
            const team = butter.includes(interaction.user.id) ? "Butter" : "Syrup";
            await interaction.reply({ content: `You're already on Team ${team}.`, ephemeral: true });
            return;
        }

        const team: "butter" | "syrup" = butter.length <= syrup.length ? "butter" : "syrup";
        await services.database.collections.waffleMinigames!.updateOne(
            { _id: game._id },
            { $push: { [`data.teams.${team}`]: interaction.user.id } }
        );

        await interaction.reply({
            content: `You've joined Team ${team === "butter" ? "Butter 🧈" : "Syrup 🍁"}!`,
            ephemeral: true,
        });

        const updated = await services.database.collections.waffleMinigames!.findOne({ _id: game._id });
        if (updated) {
            await this.refreshAllianceMessage(updated);
        }
    }

    async handleAllianceScore(userId: string, wpEarned: number, services: Services): Promise<void> {
        if (wpEarned <= 0) return;

        const game = await this.getCurrentGame(services);
        if (!game || game.gameType !== "waffle_alliance" || game.phase !== "active") return;

        const butter: string[] = game.data.teams.butter;
        const syrup: string[] = game.data.teams.syrup;
        const team = butter.includes(userId) ? "butter" : syrup.includes(userId) ? "syrup" : null;
        if (!team) return;

        await services.database.collections.waffleMinigames!.updateOne(
            { _id: game._id },
            { $inc: { [`data.scores.${team}`]: wpEarned } }
        );
    }

    async triggerManual(gameType: GameType, services: Services): Promise<void> {
        const current = await this.getCurrentGame(services);
        if (current && current.status !== "resolved" && current.status !== "cancelled") {
            throw new Error("A minigame is already active.");
        }

        const gameId = await this.startSpecificGame(gameType, services);
        const tuning = await services.database.collections.waffleTuning!.findOne({ _id: "tuning" });
        const nextAt = Date.now() + this.getIntervalMs(tuning?.minigameIntervalMs);

        if (this.waffle.eventState) {
            this.waffle.eventState.currentMinigameId = gameId;
            this.waffle.eventState.nextMinigameAt = nextAt;
        }

        await services.database.collections.waffleEventState!.updateOne(
            { _id: "event_state" },
            { $set: { currentMinigameId: gameId, nextMinigameAt: nextAt } }
        );
    }

    async forceEndCurrent(services: Services): Promise<{ success: boolean; message: string }> {
        const game = await this.getCurrentGame(services);
        if (!game || game.status === "resolved" || game.status === "cancelled") {
            return { success: false, message: "There is no active minigame to end." };
        }
        if (game.status === "transitioning") {
            return { success: false, message: "That minigame is already transitioning." };
        }

        if (
            game.gameType === "anonymous_poll" ||
            game.gameType === "waffle_alliance" ||
            (game.gameType === "chef_battle" && game.phase === "voting") ||
            (game.gameType === "prompt_entry" && game.phase === "voting")
        ) {
            await services.database.collections.waffleMinigames!.updateOne(
                { _id: game._id, status: game.status, phase: game.phase },
                { $set: { phaseEndsAt: Date.now() - 1 } }
            );
            await this.progressGame({ ...game, phaseEndsAt: Date.now() - 1 }, services);
            return { success: true, message: `Force-ended ${game.gameType}.` };
        }

        await services.database.collections.waffleMinigames!.updateOne(
            { _id: game._id, status: game.status },
            { $set: { status: "cancelled", phase: "cancelled" } }
        );
        await this.editMinigameMessage(
            game.messageId,
            baseEmbed()
                .setTitle("⛔ Minigame Ended")
                .setDescription("Staff ended this minigame early."),
            []
        );
        await this.clearCurrentGame(services);
        return { success: true, message: `Cancelled ${game.gameType}.` };
    }

    private async getCurrentGame(services: Services): Promise<WaffleMinigame | null> {
        const currentId = this.waffle.eventState?.currentMinigameId;
        if (!currentId) return null;
        return services.database.collections.waffleMinigames!.findOne({ _id: currentId });
    }

    private getIntervalMs(overrideMs?: number): number {
        if (overrideMs != null) return overrideMs;
        return this.waffle.eventState?.final24h ? 15 * 60 * 1000 : MINIGAME_INTERVAL_MS;
    }

    private async startNextGame(services: Services): Promise<void> {
        const eventState = this.waffle.eventState;
        if (!eventState?.eventActive) return;

        const gameType = GAME_ROTATION[eventState.nextMinigameIndex % GAME_ROTATION.length];
        const gameId = await this.startSpecificGame(gameType, services);
        const tuning = await services.database.collections.waffleTuning!.findOne({ _id: "tuning" });
        const nextIndex = (eventState.nextMinigameIndex + 1) % GAME_ROTATION.length;
        const nextAt = Date.now() + this.getIntervalMs(tuning?.minigameIntervalMs);

        eventState.currentMinigameId = gameId;
        eventState.nextMinigameIndex = nextIndex;
        eventState.nextMinigameAt = nextAt;

        await services.database.collections.waffleEventState!.updateOne(
            { _id: "event_state" },
            { $set: { currentMinigameId: gameId, nextMinigameIndex: nextIndex, nextMinigameAt: nextAt } }
        );
    }

    private async startSpecificGame(gameType: GameType, services: Services): Promise<ObjectId> {
        const prompt = await this.getPrompt(gameType, services);
        switch (gameType) {
            case "chef_battle":
                return this.startChefBattle(prompt, services);
            case "anonymous_poll":
                return this.startAnonymousPoll(prompt, services);
            case "prompt_entry":
                return this.startPromptEntry(prompt, services);
            case "waffle_alliance":
                return this.startWaffleAlliance(services);
        }
    }

    private async progressGame(game: WaffleMinigame, services: Services): Promise<void> {
        const claimed = await services.database.collections.waffleMinigames!.updateOne(
            {
                _id: game._id,
                status: game.status,
                phase: game.phase,
                phaseEndsAt: { $lte: Date.now() },
            },
            {
                $set: {
                    status: "transitioning",
                    phase: `transitioning_${game.phase}`,
                },
            }
        );
        if (claimed.modifiedCount === 0) return;

        switch (game.gameType) {
            case "chef_battle":
                if (game.phase === "signup") {
                    await this.advanceChefBattleSignup(game, services);
                    return;
                }
                if (game.phase === "battle") {
                    await this.advanceChefBattleBattle(game, services);
                    return;
                }
                if (game.phase === "voting") {
                    await this.resolveChefBattle(game, services);
                }
                return;
            case "anonymous_poll":
                await this.resolvePoll(game, services);
                return;
            case "prompt_entry":
                if (game.phase === "submission") {
                    await this.advancePromptEntrySubmission(game, services);
                    return;
                }
                if (game.phase === "voting") {
                    await this.resolvePromptEntry(game, services);
                }
                return;
            case "waffle_alliance":
                await this.resolveAlliance(game, services);
                return;
        }
    }

    private async startChefBattle(prompt: string, services: Services): Promise<ObjectId> {
        const channel = await this.getCounterChannel();
        if (!channel) throw new Error("Counter channel not found.");

        const now = Date.now();
        const embed = baseEmbed()
            .setTitle("👨‍🍳 Chef Battle!")
            .setDescription(`**Prompt:** ${prompt}\n\nSign up to compete! Two chefs will be chosen to respond to this waffle prompt.\n\n*Signup window: 5 minutes.*`)
            .setFooter({ text: WAFFLE_FOOTER });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("waffle_minigame_chef_signup").setLabel("Sign Up!").setStyle(ButtonStyle.Primary)
        );

        const msg = await channel.send({ embeds: [embed], components: [row] });
        const result = await services.database.collections.waffleMinigames!.insertOne({
            gameType: "chef_battle",
            status: "signup",
            phase: "signup",
            startedAt: now,
            phaseEndsAt: now + CHEF_SIGNUP_MS,
            prompt,
            messageId: msg.id,
            data: { signups: [] as string[] },
        } as any);

        return result.insertedId;
    }

    private async advanceChefBattleSignup(game: WaffleMinigame, services: Services): Promise<void> {
        const signups: string[] = game.data.signups ?? [];
        if (signups.length < 2) {
            await services.database.collections.waffleMinigames!.updateOne(
                { _id: game._id, status: "transitioning", phase: "transitioning_signup" },
                { $set: { status: "cancelled", phase: "cancelled" } }
            );
            await this.editMinigameMessage(game.messageId, baseEmbed().setTitle("Chef Battle cancelled").setDescription("Not enough signups. Better luck next time!"), []);
            await this.clearCurrentGame(services);
            return;
        }

        const shuffled = [...signups].sort(() => Math.random() - 0.5);
        const [chefA, chefB] = [shuffled[0], shuffled[1]];

        await services.database.collections.waffleMinigames!.updateOne(
            { _id: game._id, status: "transitioning", phase: "transitioning_signup" },
            {
                $set: {
                    status: "battle",
                    phase: "battle",
                    phaseEndsAt: Date.now() + CHEF_BATTLE_MS,
                    "data.chefA": chefA,
                    "data.chefB": chefB,
                    "data.entries": {},
                },
            }
        );

        await this.notifyChefBattleParticipants(game.prompt, chefA, chefB);
        await this.editMinigameMessage(
            game.messageId,
            baseEmbed().setTitle("👨‍🍳 Chef Battle — Battle Phase!").setDescription(`**Prompt:** ${game.prompt}\n\nThe chefs have been chosen and are cooking up their entries.\n\n*Voting begins in 5 minutes.*`),
            []
        );
    }

    private async advanceChefBattleBattle(game: WaffleMinigame, services: Services): Promise<void> {
        const updated = await services.database.collections.waffleMinigames!.findOne({ _id: game._id });
        if (!updated) return;

        const chefA = updated.data.chefA as string;
        const chefB = updated.data.chefB as string;
        const entryA = updated.data.entries?.[chefA] ?? "(forfeit)";
        const entryB = updated.data.entries?.[chefB] ?? "(forfeit)";

        const channel = await this.getCounterChannel();
        if (!channel) return;

        const embed = baseEmbed()
            .setTitle("📜 Chef Battle — Vote!")
            .setDescription(`**Prompt:** ${updated.prompt}\n\nReact with 🅰️ for Entry A or 🅱️ for Entry B!`)
            .addFields(
                { name: "Entry A", value: entryA },
                { name: "Entry B", value: entryB }
            );

        const msg = await channel.send({ embeds: [embed] });
        await msg.react("🅰️");
        await msg.react("🅱️");

        await services.database.collections.waffleMinigames!.updateOne(
            { _id: updated._id, status: "transitioning", phase: "transitioning_battle" },
            {
                $set: {
                    status: "voting",
                    phase: "voting",
                    phaseEndsAt: Date.now() + CHEF_VOTING_MS,
                    messageId: msg.id,
                },
            }
        );
    }

    private async resolveChefBattle(game: WaffleMinigame, services: Services): Promise<void> {
        const refreshed = await services.database.collections.waffleMinigames!.findOne({ _id: game._id });
        if (!refreshed || refreshed.status === "resolved") return;
        const minigameWp = await this.getMinigameWpConfig(services);

        const channel = await this.getCounterChannel();
        const msg = channel && refreshed.messageId ? await channel.messages.fetch(refreshed.messageId).catch(() => null) : null;

        let aCount = 0;
        let bCount = 0;
        if (msg) {
            if (msg.partial) await msg.fetch().catch(() => null);
            const aReaction = msg.reactions.cache.get("🅰️");
            const bReaction = msg.reactions.cache.get("🅱️");
            if (aReaction?.partial) await aReaction.fetch().catch(() => null);
            if (bReaction?.partial) await bReaction.fetch().catch(() => null);
            const [aUsers, bUsers] = await Promise.all([
                aReaction?.users.fetch().catch(() => null),
                bReaction?.users.fetch().catch(() => null),
            ]);
            const aVoters = new Set((aUsers ? [...aUsers.values()] : []).filter(user => !user.bot).map(user => user.id));
            const bVoters = new Set((bUsers ? [...bUsers.values()] : []).filter(user => !user.bot).map(user => user.id));
            for (const userId of [...aVoters]) {
                if (bVoters.has(userId)) {
                    aVoters.delete(userId);
                    bVoters.delete(userId);
                }
            }
            aCount = aVoters.size;
            bCount = bVoters.size;
        }

        const chefA = refreshed.data.chefA as string;
        const chefB = refreshed.data.chefB as string;
        const chefAUser = await this.waffle.client.users.fetch(chefA).catch(() => null);
        const chefBUser = await this.waffle.client.users.fetch(chefB).catch(() => null);

        let description = `Votes: **Entry A** (${aCount}) vs **Entry B** (${bCount})`;
        if (aCount === bCount) {
            await this.waffle.glazeManager.applyMinigameGlaze(chefA, "blueberry_glaze", services);
            await this.waffle.glazeManager.applyMinigameGlaze(chefB, "blueberry_glaze", services);
            await this.awardWp(chefA, minigameWp.chefBattle.tie, services);
            await this.awardWp(chefB, minigameWp.chefBattle.tie, services);
            description += `\n\n🤝 Tie! **${chefAUser?.tag ?? chefA}** and **${chefBUser?.tag ?? chefB}** both get Blueberry Glaze and **${minigameWp.chefBattle.tie} WP**.`;
        } else {
            const winner = aCount > bCount ? chefA : chefB;
            const loser = winner === chefA ? chefB : chefA;
            const winnerUser = winner === chefA ? chefAUser : chefBUser;
            const loserUser = loser === chefA ? chefAUser : chefBUser;
            await this.waffle.glazeManager.applyMinigameGlaze(winner, "peanut_butter_glaze", services);
            await this.waffle.glazeManager.applyMinigameBurn(loser, "cold_waffle", services);
            await this.awardWp(winner, minigameWp.chefBattle.winner, services);
            await this.awardWp(loser, minigameWp.chefBattle.loser, services);
            description += `\n\n🥇 Winner: **${winnerUser?.tag ?? winner}** — Peanut Butter Glaze and **${minigameWp.chefBattle.winner} WP**!\n💀 Loser: **${loserUser?.tag ?? loser}** — Cold Waffle and **${minigameWp.chefBattle.loser} WP**.`;
        }

        await this.editMinigameMessage(
            refreshed.messageId,
            baseEmbed()
                .setTitle("🏆 Chef Battle — Results!")
                .setDescription(`**Prompt:** ${refreshed.prompt}\n\n${description}`)
                .addFields(
                    { name: `${chefAUser?.tag ?? chefA}'s Entry`, value: refreshed.data.entries?.[chefA] ?? "(forfeit)" },
                    { name: `${chefBUser?.tag ?? chefB}'s Entry`, value: refreshed.data.entries?.[chefB] ?? "(forfeit)" }
                ),
            []
        );

        await services.database.collections.waffleMinigames!.updateOne(
            { _id: refreshed._id, status: "transitioning", phase: "transitioning_voting" },
            { $set: { status: "resolved", phase: "resolved" } }
        );
        await this.clearCurrentGame(services);
    }

    private async startAnonymousPoll(prompt: string, services: Services): Promise<ObjectId> {
        const channel = await this.getCounterChannel();
        if (!channel) throw new Error("Counter channel not found.");

        const labels = ["A", "B", "C", "D", "E"];
        const parsed = this.parsePollPrompt(prompt);
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            ...parsed.options.map((_, index) => new ButtonBuilder()
                .setCustomId(`waffle_minigame_poll_${labels[index]}`)
                .setLabel(labels[index])
                .setStyle(ButtonStyle.Secondary))
        );

        const msg = await channel.send({
            embeds: [baseEmbed().setTitle("📊 Anonymous Poll!").setDescription(`**${parsed.question}**\n\n${parsed.options.map((option, index) => `${labels[index]}) ${option}`).join("\n")}\n\n*Poll closes in 25 minutes.*`)],
            components: [row],
        });

        const votes: Record<string, string[]> = {};
        parsed.options.forEach((_, index) => { votes[labels[index]] = []; });

        const result = await services.database.collections.waffleMinigames!.insertOne({
            gameType: "anonymous_poll",
            status: "active",
            phase: "active",
            startedAt: Date.now(),
            phaseEndsAt: Date.now() + POLL_VOTING_MS,
            prompt: parsed.question,
            messageId: msg.id,
            data: { options: parsed.options, votes },
        } as any);

        return result.insertedId;
    }

    private async resolvePoll(game: WaffleMinigame, services: Services): Promise<void> {
        const refreshed = await services.database.collections.waffleMinigames!.findOne({ _id: game._id });
        if (!refreshed || refreshed.status === "resolved") return;
        const minigameWp = await this.getMinigameWpConfig(services);

        const votes = refreshed.data.votes as Record<string, string[]>;
        const voteEntries = Object.entries(votes);
        const counts = voteEntries.map(([option, voters]) => ({ option, voters, count: voters.length }));
        const highest = Math.max(...counts.map(entry => entry.count));
        const lowest = Math.min(...counts.map(entry => entry.count));
        const winningOptions = counts.filter(entry => entry.count === highest);
        const losingOptions = counts.filter(entry => entry.count === lowest);
        const tied = highest === lowest;

        for (const entry of winningOptions) {
            for (const userId of entry.voters) {
                await this.waffle.glazeManager.applyMinigameGlaze(userId, "maple_glaze", services);
                await this.awardWp(userId, tied ? minigameWp.poll.tie : minigameWp.poll.winner, services);
            }
        }
        if (!tied) {
            for (const entry of losingOptions) {
                for (const userId of entry.voters) {
                    await this.waffle.glazeManager.applyMinigameBurn(userId, "soggy_bottom", services);
                    await this.awardWp(userId, minigameWp.poll.loser, services);
                }
            }
        }

        const breakdown = counts.map(entry => `**${entry.option}**: ${entry.count} vote${entry.count === 1 ? "" : "s"}`).join("\n");
        await this.editMinigameMessage(
            refreshed.messageId,
            baseEmbed()
                .setTitle("📊 Poll Results!")
                .setDescription(
                    tied
                        ? `**Question:** ${refreshed.prompt}\n\n${breakdown}\n\nIt's a tie across all options. Tied-option voters receive Maple Glaze and **${minigameWp.poll.tie} WP**.`
                        : `**Question:** ${refreshed.prompt}\n\n${breakdown}\n\nWinning option${winningOptions.length === 1 ? "" : "s"}: ${winningOptions.map(entry => entry.option).join(", ")}\nLosing option${losingOptions.length === 1 ? "" : "s"}: ${losingOptions.map(entry => entry.option).join(", ")}\n\nWinning voters receive **${minigameWp.poll.winner} WP**. Losing voters receive **${minigameWp.poll.loser} WP**.`
                ),
            []
        );

        await services.database.collections.waffleMinigames!.updateOne(
            { _id: refreshed._id, status: "transitioning", phase: "transitioning_active" },
            { $set: { status: "resolved", phase: "resolved" } }
        );
        await this.clearCurrentGame(services);
    }

    private async startPromptEntry(prompt: string, services: Services): Promise<ObjectId> {
        const channel = await this.getCounterChannel();
        if (!channel) throw new Error("Counter channel not found.");

        const msg = await channel.send({
            embeds: [baseEmbed().setTitle("✍️ Prompt & Entry!").setDescription(`**${prompt}**\n\nDM me your entry. The first 10 entries will be accepted.\n\n*Submission window: 10 minutes.*`)],
        });

        const result = await services.database.collections.waffleMinigames!.insertOne({
            gameType: "prompt_entry",
            status: "submission",
            phase: "submission",
            startedAt: Date.now(),
            phaseEndsAt: Date.now() + ENTRY_SUBMISSION_MS,
            prompt,
            messageId: msg.id,
            data: { entries: [] as { userId: string; text: string }[], votes: {} },
        } as any);

        return result.insertedId;
    }

    private async advancePromptEntrySubmission(game: WaffleMinigame, services: Services): Promise<void> {
        const refreshed = await services.database.collections.waffleMinigames!.findOne({ _id: game._id });
        if (!refreshed) return;

        const entries: { userId: string; text: string }[] = refreshed.data.entries;
        if (entries.length === 0) {
        await services.database.collections.waffleMinigames!.updateOne(
            { _id: refreshed._id, status: "transitioning", phase: "transitioning_submission" },
            { $set: { status: "cancelled", phase: "cancelled" } }
        );
            await this.editMinigameMessage(refreshed.messageId, baseEmbed().setTitle("Prompt & Entry cancelled").setDescription("Nobody submitted an entry."), []);
            await this.clearCurrentGame(services);
            return;
        }

        const votes: Record<string, string[]> = {};
        entries.forEach((_, index) => { votes[`${index + 1}`] = []; });

        await services.database.collections.waffleMinigames!.updateOne(
            { _id: refreshed._id, status: "transitioning", phase: "transitioning_submission" },
            { $set: { status: "voting", phase: "voting", phaseEndsAt: Date.now() + ENTRY_VOTING_MS, "data.votes": votes } }
        );

        const channel = await this.getCounterChannel();
        if (!channel) return;

        const rows: ActionRowBuilder<ButtonBuilder>[] = [];
        let row = new ActionRowBuilder<ButtonBuilder>();
        let count = 0;
        for (let index = 0; index < entries.length; index++) {
            if (count === 5) {
                rows.push(row);
                row = new ActionRowBuilder<ButtonBuilder>();
                count = 0;
            }
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`waffle_minigame_entry_${index + 1}`)
                    .setLabel(`${index + 1}`)
                    .setStyle(ButtonStyle.Secondary)
            );
            count++;
        }
        if (count > 0) rows.push(row);

        const msg = await channel.send({
            embeds: [baseEmbed().setTitle("🗳️ Vote for the Best Entry!").setDescription(`**Prompt:** ${refreshed.prompt}\n\n${entries.map((entry, index) => `**${index + 1}.** ${entry.text} — <@${entry.userId}>`).join("\n\n")}`)],
            components: rows,
        });

        await services.database.collections.waffleMinigames!.updateOne(
            { _id: refreshed._id },
            { $set: { messageId: msg.id } }
        );
    }

    private async resolvePromptEntry(game: WaffleMinigame, services: Services): Promise<void> {
        const refreshed = await services.database.collections.waffleMinigames!.findOne({ _id: game._id });
        if (!refreshed || refreshed.status === "resolved") return;
        const minigameWp = await this.getMinigameWpConfig(services);

        const entries: { userId: string; text: string }[] = refreshed.data.entries;
        const votes = refreshed.data.votes as Record<string, string[]>;
        const sorted = Object.entries(votes).sort(([, a], [, b]) => b.length - a.length);
        const winnerIndex = parseInt(sorted[0][0], 10) - 1;
        const winner = entries[winnerIndex]?.userId;

        if (winner) {
            await this.waffle.glazeManager.applyMinigameGlaze(winner, "peanut_butter_glaze", services);
            await this.awardWp(winner, minigameWp.promptEntry.winner, services);
        }
        for (const entry of entries) {
            if (entry.userId !== winner) {
                await this.waffle.glazeManager.applyMinigameBurn(entry.userId, "soggy_bottom", services);
                await this.awardWp(entry.userId, minigameWp.promptEntry.submitter, services);
            }
        }

        const winnerUser = winner ? await this.waffle.client.users.fetch(winner).catch(() => null) : null;
        await this.editMinigameMessage(
            refreshed.messageId,
            baseEmbed()
                .setTitle("🏆 Prompt & Entry Results!")
                .setDescription(`**Prompt:** ${refreshed.prompt}\n\nWinner: **${winnerUser?.tag ?? winner ?? "Nobody"}** with entry #${winnerIndex + 1} and **${minigameWp.promptEntry.winner} WP**!\nAll other submitters receive **${minigameWp.promptEntry.submitter} WP**.\n\n${sorted.map(([index, voters]) => `#${index}: ${voters.length} vote${voters.length === 1 ? "" : "s"}`).join("\n")}`),
            []
        );

        await services.database.collections.waffleMinigames!.updateOne(
            { _id: refreshed._id, status: "transitioning", phase: "transitioning_voting" },
            { $set: { status: "resolved", phase: "resolved" } }
        );
        await this.clearCurrentGame(services);
    }

    private async startWaffleAlliance(services: Services): Promise<ObjectId> {
        const channel = await this.getCounterChannel();
        if (!channel) throw new Error("Counter channel not found.");

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("waffle_minigame_alliance_join").setLabel("Join a Team!").setStyle(ButtonStyle.Primary)
        );

        const msg = await channel.send({
            embeds: [baseEmbed().setTitle("⚔️ Waffle Alliance!").setDescription("Join a team and earn WP for your side!\n\n**Team Butter** 🧈 vs **Team Syrup** 🍁\n\n*Click Join to be assigned a team!*\n\n*Event runs for 27 minutes.*")],
            components: [row],
        });

        const result = await services.database.collections.waffleMinigames!.insertOne({
            gameType: "waffle_alliance",
            status: "active",
            phase: "active",
            startedAt: Date.now(),
            phaseEndsAt: Date.now() + ALLIANCE_MS,
            prompt: "waffle_alliance",
            messageId: msg.id,
            data: {
                teams: { butter: [] as string[], syrup: [] as string[] },
                scores: { butter: 0, syrup: 0 },
            },
        } as any);

        return result.insertedId;
    }

    private async resolveAlliance(game: WaffleMinigame, services: Services): Promise<void> {
        const refreshed = await services.database.collections.waffleMinigames!.findOne({ _id: game._id });
        if (!refreshed || refreshed.status === "resolved") return;
        const minigameWp = await this.getMinigameWpConfig(services);

        const teams = refreshed.data.teams as { butter: string[]; syrup: string[] };
        const scores = refreshed.data.scores as { butter: number; syrup: number };
        const tied = scores.butter === scores.syrup;

        if (tied) {
            for (const userId of [...teams.butter, ...teams.syrup]) {
                await this.waffle.glazeManager.applyMinigameGlaze(userId, "strawberry_glaze", services);
                await this.awardWp(userId, minigameWp.alliance.tie, services);
            }
        } else {
            const winningTeam = scores.butter > scores.syrup ? "butter" : "syrup";
            const losingTeam = winningTeam === "butter" ? "syrup" : "butter";
            for (const userId of teams[winningTeam]) {
                await this.waffle.glazeManager.applyMinigameGlaze(userId, "chocolate_glaze", services);
                await this.awardWp(userId, minigameWp.alliance.winner, services);
            }
            for (const userId of teams[losingTeam]) {
                await this.waffle.glazeManager.applyMinigameBurn(userId, "cold_waffle", services);
                await this.awardWp(userId, minigameWp.alliance.loser, services);
            }
        }

        const description = tied
            ? `It's a **TIE**! (${scores.butter} WP each) — Everyone gets Strawberry Glaze and **${minigameWp.alliance.tie} WP**!`
            : `**Team ${scores.butter > scores.syrup ? "Butter 🧈" : "Syrup 🍁"} wins!** (${Math.max(scores.butter, scores.syrup)} vs ${Math.min(scores.butter, scores.syrup)} WP)\n\nWinners: Chocolate Glaze 🍫 and **${minigameWp.alliance.winner} WP**\nLosers: Cold Waffle ❄️ and **${minigameWp.alliance.loser} WP**`;
        await this.editMinigameMessage(refreshed.messageId, baseEmbed().setTitle("⚔️ Waffle Alliance — Results!").setDescription(description), []);

        await services.database.collections.waffleMinigames!.updateOne(
            { _id: refreshed._id, status: "transitioning", phase: "transitioning_active" },
            { $set: { status: "resolved", phase: "resolved" } }
        );
        await this.clearCurrentGame(services);
    }

    private async handleChefBattleDM(game: WaffleMinigame, message: Message, services: Services): Promise<boolean> {
        const chefA = game.data.chefA as string;
        const chefB = game.data.chefB as string;
        if (![chefA, chefB].includes(message.author.id)) return false;

        await services.database.collections.waffleMinigames!.updateOne(
            { _id: game._id, status: "battle", phase: "battle" },
            { $set: { [`data.entries.${message.author.id}`]: message.content } }
        );
        await message.reply("Entry received.");
        return true;
    }

    private async handlePromptEntryDM(game: WaffleMinigame, message: Message, services: Services): Promise<boolean> {
        const entries: { userId: string; text: string }[] = game.data.entries ?? [];
        const existingIndex = entries.findIndex(entry => entry.userId === message.author.id);
        if (existingIndex !== -1) {
            await services.database.collections.waffleMinigames!.updateOne(
                { _id: game._id, status: "submission", phase: "submission", "data.entries.userId": message.author.id },
                { $set: { "data.entries.$.text": message.content } }
            );
            await message.reply("Entry updated.");
            return true;
        }

        if (entries.length >= 10) {
            await message.reply("That round is full.");
            return true;
        }

        const insertResult = await services.database.collections.waffleMinigames!.updateOne(
            {
                _id: game._id,
                status: "submission",
                phase: "submission",
                "data.entries.9": { $exists: false },
            },
            { $push: { "data.entries": { userId: message.author.id, text: message.content } } }
        );
        if (insertResult.modifiedCount === 0) {
            await message.reply("That round is full.");
            return true;
        }
        await message.reply("Entry received.");
        return true;
    }

    private async notifyChefBattleParticipants(prompt: string, chefA: string, chefB: string): Promise<void> {
        for (const userId of [chefA, chefB]) {
            try {
                const user = await this.waffle.client.users.fetch(userId);
                const dm = await user.createDM();
                await dm.send({ embeds: [baseEmbed().setTitle("🍳 You've been chosen for Chef Battle!").setDescription(`**Prompt:** ${prompt}\n\nYou have **5 minutes** to DM me your entry.`)] });
            } catch {
                // DMs blocked
            }
        }
    }

    private async refreshAllianceMessage(game: WaffleMinigame): Promise<void> {
        const butter = (game.data.teams.butter as string[]).map(id => `<@${id}>`).join(", ") || "None";
        const syrup = (game.data.teams.syrup as string[]).map(id => `<@${id}>`).join(", ") || "None";
        await this.editMinigameMessage(
            game.messageId,
            baseEmbed().setTitle("⚔️ Waffle Alliance!").setDescription(
                `**Team Butter 🧈** (${game.data.scores.butter} WP): ${butter}\n\n**Team Syrup 🍁** (${game.data.scores.syrup} WP): ${syrup}\n\n*Click Join to be assigned a team!*`
            )
        );
    }

    private async awardWp(userId: string, amount: number, services: Services): Promise<void> {
        if (amount <= 0) return;
        await services.database.collections.waffleUsers!.updateOne(
            { userId },
            {
                $inc: {
                    current_wp: amount,
                    total_wp_earned: amount,
                },
                $setOnInsert: {
                    userId,
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

        if (this.waffle.eventState) {
            this.waffle.eventState.totalWpEarnedServerWide += amount;
        }

        await services.database.collections.waffleEventState!.updateOne(
            { _id: "event_state" },
            { $inc: { totalWpEarnedServerWide: amount } }
        );
    }

    private async getMinigameWpConfig(services: Services): Promise<MinigameWpConfig> {
        const tuning = await services.database.collections.waffleTuning!.findOne({ _id: "tuning" });
        return {
            chefBattle: {
                winner: tuning?.minigameWp?.chefBattle?.winner ?? MINIGAME_WP.chefBattle.winner,
                loser: tuning?.minigameWp?.chefBattle?.loser ?? MINIGAME_WP.chefBattle.loser,
                tie: tuning?.minigameWp?.chefBattle?.tie ?? MINIGAME_WP.chefBattle.tie,
            },
            poll: {
                winner: tuning?.minigameWp?.poll?.winner ?? MINIGAME_WP.poll.winner,
                loser: tuning?.minigameWp?.poll?.loser ?? MINIGAME_WP.poll.loser,
                tie: tuning?.minigameWp?.poll?.tie ?? MINIGAME_WP.poll.tie,
            },
            promptEntry: {
                winner: tuning?.minigameWp?.promptEntry?.winner ?? MINIGAME_WP.promptEntry.winner,
                submitter: tuning?.minigameWp?.promptEntry?.submitter ?? MINIGAME_WP.promptEntry.submitter,
            },
            alliance: {
                winner: tuning?.minigameWp?.alliance?.winner ?? MINIGAME_WP.alliance.winner,
                loser: tuning?.minigameWp?.alliance?.loser ?? MINIGAME_WP.alliance.loser,
                tie: tuning?.minigameWp?.alliance?.tie ?? MINIGAME_WP.alliance.tie,
            },
        };
    }

    private parsePollPrompt(prompt: string): { question: string; options: string[] } {
        const matched = DEFAULT_POLL_PROMPTS.find(entry => `${entry.prompt} ${entry.options.join(" ")}` === prompt);
        if (matched) {
            return { question: matched.prompt, options: matched.options };
        }

        const parts = prompt.split(/[A-E]\)/).map(part => part.trim()).filter(Boolean);
        if (parts.length >= 2) {
            return { question: parts[0], options: parts.slice(1) };
        }

        return {
            question: prompt,
            options: ["Option A", "Option B", "Option C", "Option D"],
        };
    }

    private async getPrompt(gameType: GameType, services: Services): Promise<string> {
        const eventState = this.waffle.eventState;
        if (!eventState) return "Make a waffle!";

        const promptGameType = gameType === "waffle_alliance" ? null : gameType as PromptGameType;
        if (promptGameType) {
            const queued = await services.database.collections.wafflePromptQueue!.findOne(
                { gameType: promptGameType },
                { sort: { addedAt: 1 } }
            );
            if (queued) {
                await services.database.collections.wafflePromptQueue!.deleteOne({ _id: queued._id });
                if (gameType === "anonymous_poll" && queued.options?.length) {
                    return `${queued.prompt} ${queued.options.map((option, optionIndex) => `${["A", "B", "C", "D", "E"][optionIndex]}) ${option}`).join(" ")}`;
                }
                return queued.prompt;
            }
        }

        if (gameType === "chef_battle") {
            return this.pickDefault(DEFAULT_CHEF_BATTLE_PROMPTS, eventState.usedDefaultPrompts.chef_battle, "chef_battle", services);
        }
        if (gameType === "anonymous_poll") {
            const index = this.pickDefaultIndex(DEFAULT_POLL_PROMPTS.length, eventState.usedDefaultPrompts.anonymous_poll);
            eventState.usedDefaultPrompts.anonymous_poll.push(index);
            await services.database.collections.waffleEventState!.updateOne(
                { _id: "event_state" },
                { $addToSet: { "usedDefaultPrompts.anonymous_poll": index } }
            );
            const poll = DEFAULT_POLL_PROMPTS[index];
            return `${poll.prompt} ${poll.options.map((option, optionIndex) => `${["A", "B", "C", "D", "E"][optionIndex]}) ${option}`).join(" ")}`;
        }
        return this.pickDefault(DEFAULT_PROMPT_ENTRY_PROMPTS, eventState.usedDefaultPrompts.prompt_entry, "prompt_entry", services);
    }

    private pickDefault(prompts: string[], used: number[], key: "chef_battle" | "prompt_entry", services: Services): string {
        let available = prompts.map((_, index) => index).filter(index => !used.includes(index));
        if (available.length === 0) {
            available = prompts.map((_, index) => index);
            this.waffle.eventState!.usedDefaultPrompts[key] = [];
            void services.database.collections.waffleEventState!.updateOne(
                { _id: "event_state" },
                { $set: { [`usedDefaultPrompts.${key}`]: [] } }
            );
        }

        const index = available[Math.floor(Math.random() * available.length)];
        this.waffle.eventState!.usedDefaultPrompts[key].push(index);
        void services.database.collections.waffleEventState!.updateOne(
            { _id: "event_state" },
            { $addToSet: { [`usedDefaultPrompts.${key}`]: index } }
        );
        return prompts[index];
    }

    private pickDefaultIndex(length: number, used: number[]): number {
        let available = Array.from({ length }, (_, index) => index).filter(index => !used.includes(index));
        if (available.length === 0) {
            available = Array.from({ length }, (_, index) => index);
        }
        return available[Math.floor(Math.random() * available.length)];
    }

    private async editMinigameMessage(messageId: string | null, embed: ReturnType<typeof baseEmbed>, components?: ActionRowBuilder<ButtonBuilder>[]): Promise<void> {
        if (!messageId) return;
        const channel = await this.getCounterChannel();
        if (!channel) return;
        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (!message) return;
        await message.edit({ embeds: [embed], components: components ?? [] }).catch(() => null);
    }

    private async clearCurrentGame(services: Services): Promise<void> {
        if (this.waffle.eventState) {
            this.waffle.eventState.currentMinigameId = null;
        }
        await services.database.collections.waffleEventState!.updateOne(
            { _id: "event_state" },
            { $set: { currentMinigameId: null } }
        );
    }

    private async getCounterChannel(): Promise<TextChannel | null> {
        const guild = this.waffle.getEventGuild();
        if (!guild) return null;
        return guild.channels.cache.get(waffleChannelIds.counter) as TextChannel ?? null;
    }
}
