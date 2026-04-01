import {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    GuildMember,
    SlashCommandBuilder,
} from "discord.js";
import { ObjectId } from "mongodb";
import SlashCommand from "../SlashCommand";
import { Services } from "../../Services";
import { roleIds } from "../../constants";
import { baseEmbed, leaderboardEmbed } from "../../Services/WaffleHouse/util/embeds";
import { GLAZES, BURNS } from "../../Services/WaffleHouse/data/glazes";
import { CardRarity, DEFAULT_DROP_WEIGHTS, INFUSION_LEVELS } from "../../Services/WaffleHouse/data/cards";
import { SCORING_METHODS } from "../../Services/WaffleHouse/data/methods";
import TestHarness from "../../Services/WaffleHouse/testing/TestHarness";

const STAFF_GAME_TYPES = ["chef_battle", "anonymous_poll", "prompt_entry", "waffle_alliance"] as const;

export default class WaffleStaffCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("wafflestaff")
        .setDescription("Staff Waffle House controls")
        .addSubcommand(sub => sub.setName("stats").setDescription("View event stats"))
        .addSubcommand(sub => sub.setName("frenchtoast").setDescription("View the French Toast leaderboard"))
        .addSubcommand(sub =>
            sub.setName("spawn")
                .setDescription("Manually trigger a card spawn")
                .addStringOption(option => option.setName("rarity").setDescription("Optional rarity")
                    .addChoices(
                        { name: "common", value: "common" },
                        { name: "uncommon", value: "uncommon" },
                        { name: "rare", value: "rare" },
                        { name: "epic", value: "epic" },
                        { name: "legendary", value: "legendary" },
                    ))
                .addStringOption(option => option.setName("type").setDescription("Optional pool type")
                    .addChoices(
                        { name: "base", value: "base" },
                        { name: "topping", value: "topping" },
                        { name: "special", value: "special" },
                    )))
        .addSubcommand(sub =>
            sub.setName("minigame")
                .setDescription("Trigger a specific minigame")
                .addStringOption(option => option.setName("type").setDescription("Game type").setRequired(true)
                    .addChoices(...STAFF_GAME_TYPES.map(v => ({ name: v, value: v })))))
        .addSubcommand(sub =>
            sub.setName("glaze")
                .setDescription("Manually apply a glaze or burn")
                .addUserOption(option => option.setName("user").setDescription("Target user").setRequired(true))
                .addStringOption(option => option.setName("effect").setDescription("Effect id").setRequired(true).setAutocomplete(true)))
        .addSubcommandGroup(group =>
            group.setName("prompts")
                .setDescription("Prompt queue")
                .addSubcommand(sub =>
                    sub.setName("add")
                        .setDescription("Add a queued prompt")
                        .addStringOption(option => option.setName("game_type").setDescription("Game type").setRequired(true)
                            .addChoices(
                                { name: "chef_battle", value: "chef_battle" },
                                { name: "anonymous_poll", value: "anonymous_poll" },
                                { name: "prompt_entry", value: "prompt_entry" },
                            ))
                        .addStringOption(option => option.setName("prompt").setDescription("Prompt").setRequired(true))
                        .addStringOption(option => option.setName("options").setDescription("Poll options separated by |")))
                .addSubcommand(sub =>
                    sub.setName("remove")
                        .setDescription("Remove a queued prompt")
                        .addStringOption(option => option.setName("id").setDescription("Prompt id").setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName("list")
                        .setDescription("List queued prompts")
                        .addStringOption(option => option.setName("game_type").setDescription("Optional game type filter")
                            .addChoices(
                                { name: "chef_battle", value: "chef_battle" },
                                { name: "anonymous_poll", value: "anonymous_poll" },
                                { name: "prompt_entry", value: "prompt_entry" },
                            ))))
        .addSubcommandGroup(group =>
            group.setName("tune")
                .setDescription("Live tuning")
                .addSubcommand(sub =>
                    sub.setName("set")
                        .setDescription("Set a tuning override")
                        .addStringOption(option => option.setName("parameter").setDescription("Dot path parameter").setRequired(true))
                        .addStringOption(option => option.setName("value").setDescription("JSON value").setRequired(true)))
                .addSubcommand(sub => sub.setName("list").setDescription("List tuning overrides"))
                .addSubcommand(sub =>
                    sub.setName("reset")
                        .setDescription("Reset one tuning override")
                        .addStringOption(option => option.setName("parameter").setDescription("Dot path parameter").setRequired(true))))
        .addSubcommandGroup(group =>
            group.setName("test")
                .setDescription("Run Waffle House diagnostics")
                .addSubcommand(sub => sub.setName("smoke").setDescription("Run a fast sandbox smoke test"))
                .addSubcommand(sub => sub.setName("full").setDescription("Run the full sandbox diagnostic suite"))
                .addSubcommand(sub =>
                    sub.setName("cleanup")
                        .setDescription("Cleanup sandbox test data")
                        .addStringOption(option => option.setName("run_id").setDescription("Specific test run id"))
                        .addIntegerOption(option => option.setName("older_than_hours").setDescription("Cleanup runs older than this many hours")))
                .addSubcommand(sub => sub.setName("report").setDescription("Show recent Waffle test runs")))
        .addSubcommandGroup(group =>
            group.setName("end")
                .setDescription("Force-end active Waffle House systems")
                .addSubcommand(sub => sub.setName("minigame").setDescription("Force-end the current minigame")))
        .addSubcommand(sub => sub.setName("final24h").setDescription("Toggle Final 24 Hours mode"))
        .addSubcommand(sub => sub.setName("eventactive").setDescription("Toggle the Waffle House event on or off"))
        .addSubcommand(sub => sub.setName("endevent").setDescription("Show the final event summary")) as SlashCommandBuilder;

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
        if (!this.isStaff(interaction.member)) {
            await interaction.reply({ content: "Staff only.", ephemeral: true });
            return;
        }

        const subGroup = interaction.options.getSubcommandGroup(false);
        const sub = interaction.options.getSubcommand();

        if (subGroup === "prompts") {
            await this.handlePrompts(interaction, sub, services);
            return;
        }
        if (subGroup === "tune") {
            await this.handleTune(interaction, sub, services);
            return;
        }
        if (subGroup === "test") {
            await this.handleTest(interaction, sub, services);
            return;
        }
        if (subGroup === "end") {
            await this.handleEnd(interaction, sub, services);
            return;
        }

        switch (sub) {
            case "stats": {
                const top = await services.waffleHouse.leaderboardManager.getTopN(5, services);
                const totalCards = await services.database.collections.waffleCards!.countDocuments();
                const auctionPool = await services.database.collections.waffleAuctions!.countDocuments({ status: "pooled" });
                await interaction.reply({
                    embeds: [
                        baseEmbed()
                            .setTitle("🧇 Waffle Staff Stats")
                            .addFields(
                                { name: "Waffles Consumed", value: `${services.waffleHouse.eventState?.totalWpEarnedServerWide ?? 0}`, inline: true },
                                { name: "Cards in Existence", value: `${totalCards}`, inline: true },
                                { name: "Auction Pool", value: `${auctionPool}`, inline: true },
                            ),
                        leaderboardEmbed(top.map((entry, index) => ({ rank: index + 1, tag: entry.tag, score: entry.score }))),
                    ],
                    ephemeral: true,
                });
                return;
            }
            case "frenchtoast": {
                const entries = await services.database.collections.waffleFrenchToast!.find({ count: { $gt: 0 } }).sort({ count: -1 }).limit(10).toArray();
                const lines = entries.map((entry, index) => `**${index + 1}.** <@${entry.userId}> — ${entry.count}`).join("\n");
                await interaction.reply({ embeds: [baseEmbed().setTitle("🍞 French Toast Offenders").setDescription(lines || "No offenders.")], ephemeral: true });
                return;
            }
            case "spawn": {
                if (!services.waffleHouse.configIsReady()) {
                    await interaction.reply({ content: "Waffle House config still has placeholder IDs.", ephemeral: true });
                    return;
                }
                const rarity = interaction.options.getString("rarity", false) as CardRarity | null;
                const type = interaction.options.getString("type", false) as "base" | "topping" | "special" | null;
                try {
                    await services.waffleHouse.cardManager.triggerManualSpawn(services, rarity ?? undefined, type ?? undefined);
                    await interaction.reply({ content: "Manual spawn triggered.", ephemeral: true });
                } catch (error) {
                    const message = error instanceof Error ? error.message : "Couldn't trigger a manual spawn.";
                    await interaction.reply({ content: message, ephemeral: true });
                }
                return;
            }
            case "minigame": {
                const type = interaction.options.getString("type", true) as typeof STAFF_GAME_TYPES[number];
                try {
                    await services.waffleHouse.minigameManager.triggerManual(type, services);
                    await interaction.reply({ content: `Triggered ${type}.`, ephemeral: true });
                } catch (error) {
                    const message = error instanceof Error ? error.message : "Couldn't trigger that minigame.";
                    await interaction.reply({ content: message, ephemeral: true });
                }
                return;
            }
            case "glaze": {
                const user = interaction.options.getUser("user", true);
                const effect = interaction.options.getString("effect", true);
                const effectSummary = await this.describeEffect(effect, services);
                if (GLAZES.some(glaze => glaze.id === effect)) {
                    await services.waffleHouse.glazeManager.applyGlaze(user.id, effect, services);
                } else {
                    await services.waffleHouse.glazeManager.applyBurn(user.id, effect, services);
                }
                await interaction.reply({ content: `Applied ${effectSummary} to ${user.tag}.`, ephemeral: true });
                return;
            }
            case "final24h": {
                const nextValue = !(services.waffleHouse.eventState?.final24h ?? false);
                await services.waffleHouse.setFinal24h(nextValue, services);
                await interaction.reply({ content: `Final 24h mode ${nextValue ? "enabled" : "disabled"}.`, ephemeral: true });
                return;
            }
            case "eventactive": {
                const nextValue = !(services.waffleHouse.eventState?.eventActive ?? false);
                if (nextValue && !services.waffleHouse.configIsReady()) {
                    await interaction.reply({ content: "Waffle House config still has placeholder IDs.", ephemeral: true });
                    return;
                }
                await services.waffleHouse.setEventActive(nextValue, services);
                await interaction.reply({ content: `Waffle House event ${nextValue ? "enabled" : "disabled"}.`, ephemeral: true });
                return;
            }
            case "endevent": {
                const top = await services.waffleHouse.leaderboardManager.getTopN(5, services);
                const totalCards = await services.database.collections.waffleCards!.countDocuments();
                const auctionPool = await services.database.collections.waffleAuctions!.countDocuments({ status: "pooled" });
                await interaction.reply({
                    embeds: [
                        baseEmbed()
                            .setTitle("🧇 Final Event Summary")
                            .addFields(
                                { name: "Waffles Consumed", value: `${services.waffleHouse.eventState?.totalWpEarnedServerWide ?? 0}` },
                                { name: "Cards in Existence", value: `${totalCards}`, inline: true },
                                { name: "Auction Pool", value: `${auctionPool}`, inline: true },
                            ),
                        leaderboardEmbed(top.map((entry, index) => ({ rank: index + 1, tag: entry.tag, score: entry.score }))),
                    ],
                    ephemeral: true,
                });
                return;
            }
        }
    }

    async autocomplete(interaction: AutocompleteInteraction, services: Services) {
        if (interaction.commandName !== "wafflestaff") return;
        const focused = interaction.options.getFocused().toLowerCase();
        const tuning = await services.database.collections.waffleTuning!.findOne({ _id: "tuning" });
        const choices = [...GLAZES, ...BURNS]
            .map(effect => ({
                name: this.effectChoiceLabel(effect, tuning, services.waffleHouse.eventState?.final24h ?? false),
                value: effect.id,
            }))
            .filter(choice => choice.name.toLowerCase().includes(focused) || choice.value.includes(focused))
            .slice(0, 25);
        await interaction.respond(choices);
    }

    private async handlePrompts(interaction: ChatInputCommandInteraction, sub: string, services: Services) {
        switch (sub) {
            case "add": {
                const gameType = interaction.options.getString("game_type", true) as "chef_battle" | "anonymous_poll" | "prompt_entry";
                const prompt = interaction.options.getString("prompt", true);
                const optionsRaw = interaction.options.getString("options", false);
                const options = optionsRaw
                    ? optionsRaw.split("|").map(option => option.trim()).filter(Boolean)
                    : undefined;
                if (gameType === "anonymous_poll" && options && (options.length < 2 || options.length > 5)) {
                    await interaction.reply({ content: "Anonymous polls need between 2 and 5 options.", ephemeral: true });
                    return;
                }
                const result = await services.database.collections.wafflePromptQueue!.insertOne({
                    gameType,
                    prompt,
                    options,
                    addedBy: interaction.user.id,
                    addedAt: Date.now(),
                } as any);
                await interaction.reply({ content: `Queued prompt ${result.insertedId.toString()}.`, ephemeral: true });
                return;
            }
            case "remove": {
                const id = interaction.options.getString("id", true);
                await services.database.collections.wafflePromptQueue!.deleteOne({ _id: new ObjectId(id) });
                await interaction.reply({ content: "Prompt removed.", ephemeral: true });
                return;
            }
            case "list": {
                const gameType = interaction.options.getString("game_type", false) as "chef_battle" | "anonymous_poll" | "prompt_entry" | null;
                const prompts = await services.database.collections.wafflePromptQueue!.find(gameType ? { gameType } : {}).sort({ addedAt: 1 }).toArray();
                const lines = prompts.map(prompt => {
                    const options = prompt.options?.length ? ` | ${prompt.options.join(" / ")}` : "";
                    return `**${prompt._id?.toString()}** [${prompt.gameType}] ${prompt.prompt}${options}`;
                }).join("\n");
                await interaction.reply({ embeds: [baseEmbed().setTitle("📋 Prompt Queue").setDescription(lines || "Queue is empty.")], ephemeral: true });
                return;
            }
        }
    }

    private async handleTune(interaction: ChatInputCommandInteraction, sub: string, services: Services) {
        switch (sub) {
            case "set": {
                const parameter = interaction.options.getString("parameter", true);
                const value = interaction.options.getString("value", true);
                let parsed: any = value;
                try { parsed = JSON.parse(value); } catch { /* keep string */ }
                await services.database.collections.waffleTuning!.updateOne(
                    { _id: "tuning" },
                    { $set: { [parameter]: parsed } },
                    { upsert: true }
                );
                await interaction.reply({ content: `Set tuning override \`${parameter}\`.`, ephemeral: true });
                return;
            }
            case "list": {
                const tuning = await services.database.collections.waffleTuning!.findOne({ _id: "tuning" });
                const defaults = {
                    methodPoints: Object.fromEntries(SCORING_METHODS.map(method => [method.id, method.points])),
                    methodCooldowns: Object.fromEntries(SCORING_METHODS.map(method => [method.id, method.cooldownMs])),
                    dropRateWeights: DEFAULT_DROP_WEIGHTS,
                    specialDropRateMultiplier: 0.25,
                    glazeMultipliers: Object.fromEntries(GLAZES.map(glaze => [glaze.id, glaze.multiplier])),
                    glazeDurations: Object.fromEntries(GLAZES.map(glaze => [glaze.id, glaze.durationMs])),
                    glazeTriggerRanges: Object.fromEntries(GLAZES.map(glaze => [glaze.id, glaze.triggerRange])),
                    burnPenalties: Object.fromEntries(BURNS.map(burn => [burn.id, burn.penalty])),
                    burnDurations: Object.fromEntries(BURNS.map(burn => [burn.id, burn.durationMs])),
                    burnTriggerRanges: Object.fromEntries(BURNS.map(burn => [burn.id, burn.triggerRange])),
                    infusionCosts: Object.fromEntries(INFUSION_LEVELS.map((level, index) => [`${index + 1}`, level.cost])),
                    infusionBurnRisks: Object.fromEntries(INFUSION_LEVELS.map((level, index) => [`${index + 1}`, level.burnRisk])),
                    spawnThresholdRange: "day-based: early 250-450, mid 180-320, late/final 120-220",
                    auctionRefreshMs: 30 * 60 * 1000,
                    minigameIntervalMs: 30 * 60 * 1000,
                };
                const embeds = this.buildTuneEmbeds(defaults, tuning);
                await interaction.reply({
                    embeds,
                    ephemeral: true,
                });
                return;
            }
            case "reset": {
                const parameter = interaction.options.getString("parameter", true);
                await services.database.collections.waffleTuning!.updateOne(
                    { _id: "tuning" },
                    { $unset: { [parameter]: "" } },
                    { upsert: true }
                );
                await interaction.reply({ content: `Reset tuning override \`${parameter}\`.`, ephemeral: true });
                return;
            }
        }
    }

    private async handleTest(interaction: ChatInputCommandInteraction, sub: string, services: Services) {
        switch (sub) {
            case "smoke":
            case "full": {
                await interaction.reply({
                    embeds: [TestHarness.progressEmbed(sub, [], "Booting sandbox test run...")],
                    ephemeral: false,
                });
                try {
                    await TestHarness.run(sub, services, interaction.user.id, interaction.channelId, async embed => {
                        await interaction.editReply({ embeds: [embed] });
                    });
                } catch (error) {
                    const message = error instanceof Error ? error.message : "Waffle diagnostics failed to start.";
                    await interaction.editReply({ embeds: [baseEmbed().setTitle("🧪 Waffle Test Failed").setDescription(message)] });
                }
                return;
            }
            case "cleanup": {
                const runId = interaction.options.getString("run_id", false) ?? undefined;
                const olderThanHours = interaction.options.getInteger("older_than_hours", false) ?? undefined;
                const cleaned = await TestHarness.cleanup(services, runId, olderThanHours);
                await interaction.reply({ content: `Cleaned ${cleaned} Waffle House test run(s).`, ephemeral: true });
                return;
            }
            case "report": {
                const runs = await TestHarness.recentRuns(services);
                const lines = runs.map(run => {
                    const failureCount = run.failures.length;
                    return `**${run.testRunId}** | ${run.mode} | ${run.status} | failures: ${failureCount} | cleanup: ${run.cleanupStatus}`;
                }).join("\n");
                await interaction.reply({
                    embeds: [baseEmbed().setTitle("🧪 Recent Waffle Test Runs").setDescription(lines || "No test runs recorded.")],
                    ephemeral: true,
                });
                return;
            }
        }
    }

    private async handleEnd(interaction: ChatInputCommandInteraction, sub: string, services: Services) {
        switch (sub) {
            case "minigame": {
                const result = await services.waffleHouse.minigameManager.forceEndCurrent(services);
                await interaction.reply({ content: result.message, ephemeral: true });
                return;
            }
        }
    }

    private buildTuneEmbeds(defaults: Record<string, unknown>, tuning: Record<string, unknown> | null) {
        const embeds = [
            baseEmbed()
                .setTitle("🎛️ Tuning Board")
                .setDescription("Defaults and overrides are split across multiple embeds so nothing gets cut off."),
        ];

        const defaultChunks = this.chunkJsonForEmbeds(defaults);
        defaultChunks.forEach((chunk, index) => {
            embeds.push(
                baseEmbed()
                    .setTitle(`Defaults ${defaultChunks.length > 1 ? `${index + 1}/${defaultChunks.length}` : ""}`.trim())
                    .setDescription(`\`\`\`json\n${chunk}\n\`\`\``)
            );
        });

        const overrideChunks = tuning ? this.chunkJsonForEmbeds(tuning) : ["No overrides set."];
        overrideChunks.forEach((chunk, index) => {
            embeds.push(
                baseEmbed()
                    .setTitle(`Overrides ${overrideChunks.length > 1 ? `${index + 1}/${overrideChunks.length}` : ""}`.trim())
                    .setDescription(chunk === "No overrides set." ? chunk : `\`\`\`json\n${chunk}\n\`\`\``)
            );
        });

        return embeds.slice(0, 10);
    }

    private async describeEffect(effectId: string, services: Services): Promise<string> {
        const tuning = await services.database.collections.waffleTuning!.findOne({ _id: "tuning" });
        const final24h = services.waffleHouse.eventState?.final24h ?? false;
        const glaze = GLAZES.find(entry => entry.id === effectId);
        if (glaze) {
            const multiplier = tuning?.glazeMultipliers?.[glaze.id] ?? glaze.multiplier;
            const durationMs = (tuning?.glazeDurations?.[glaze.id] ?? glaze.durationMs) * (final24h ? 2 : 1);
            return `${glaze.name} (${this.formatMultiplier(multiplier)}, ${this.formatMinutes(durationMs)})`;
        }

        const burn = BURNS.find(entry => entry.id === effectId);
        if (burn) {
            const penalty = tuning?.burnPenalties?.[burn.id] ?? burn.penalty;
            const durationMs = (tuning?.burnDurations?.[burn.id] ?? burn.durationMs) * (final24h ? 2 : 1);
            return `${burn.name} (${this.formatPenalty(penalty)}, ${this.formatMinutes(durationMs)})`;
        }

        return effectId;
    }

    private effectChoiceLabel(
        effect: (typeof GLAZES)[number] | (typeof BURNS)[number],
        tuning: Record<string, any> | null,
        final24h: boolean,
    ): string {
        if ("multiplier" in effect) {
            const multiplier = tuning?.glazeMultipliers?.[effect.id] ?? effect.multiplier;
            const durationMs = (tuning?.glazeDurations?.[effect.id] ?? effect.durationMs) * (final24h ? 2 : 1);
            const suffix = effect.final24hOnly ? " | final24 only" : "";
            return `${effect.name} | ${this.formatMultiplier(multiplier)} | ${this.formatMinutes(durationMs)}${suffix}`.slice(0, 100);
        }

        const penalty = tuning?.burnPenalties?.[effect.id] ?? effect.penalty;
        const durationMs = (tuning?.burnDurations?.[effect.id] ?? effect.durationMs) * (final24h ? 2 : 1);
        const suffix = effect.final24hOnly ? " | final24 only" : "";
        return `${effect.name} | ${this.formatPenalty(penalty)} | ${this.formatMinutes(durationMs)}${suffix}`.slice(0, 100);
    }

    private formatMultiplier(multiplier: number): string {
        return `+${multiplier}x`;
    }

    private formatPenalty(penalty: number): string {
        return `-${penalty}x`;
    }

    private formatMinutes(durationMs: number): string {
        const totalMinutes = Math.round(durationMs / 60000);
        if (totalMinutes % 60 === 0) {
            return `${totalMinutes / 60}h`;
        }
        if (totalMinutes > 60) {
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${hours}h ${minutes}m`;
        }
        return `${totalMinutes}m`;
    }

    private chunkJsonForEmbeds(value: unknown, maxChunkLength = 3800): string[] {
        const json = JSON.stringify(value, null, 2);
        if (json.length <= maxChunkLength) return [json];

        const lines = json.split("\n");
        const chunks: string[] = [];
        let current = "";

        for (const line of lines) {
            const next = current.length === 0 ? line : `${current}\n${line}`;
            if (next.length > maxChunkLength && current.length > 0) {
                chunks.push(current);
                current = line;
            } else {
                current = next;
            }
        }

        if (current.length > 0) {
            chunks.push(current);
        }

        return chunks;
    }

    private isStaff(member: GuildMember | any): boolean {
        if (!member) return false;
        const roleIdsList: string[] = member.roles?.cache
            ? Array.from(member.roles.cache.keys())
            : Array.isArray(member.roles)
                ? member.roles
                : [];
        const hasRole = roleIdsList.includes(roleIds.staff) || roleIdsList.includes(roleIds.mod);
        const hasAdmin = typeof member.permissions?.has === "function"
            ? member.permissions.has("Administrator")
            : false;
        return hasRole || hasAdmin;
    }
}
