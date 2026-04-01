import { EmbedBuilder } from "discord.js";

export const WAFFLE_COLOR = 0xD4A017;
export const WAFFLE_COLOR_GREEN = 0x57F287;
export const WAFFLE_COLOR_RED = 0xED4245;
export const WAFFLE_FOOTER = "The Waffle House — Bob Bilby";

export function baseEmbed(): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(WAFFLE_COLOR)
        .setFooter({ text: WAFFLE_FOOTER });
}

export function discoveryEmbed(methodName: string, points: number): EmbedBuilder {
    const positive = points >= 0;
    return new EmbedBuilder()
        .setColor(positive ? WAFFLE_COLOR_GREEN : WAFFLE_COLOR_RED)
        .setTitle(methodName)
        .setDescription(`${positive ? "+" : ""}${points} WP`)
        .setFooter({ text: WAFFLE_FOOTER });
}

export function milestoneEmbed(milestone: number, totalEarned: number): EmbedBuilder {
    const messages: Record<number, string> = {
        1000:   "You've earned **1,000 WP** total. Not bad! The waffle gods are watching.",
        5000:   "**5,000 WP** earned. You are a regular at The Waffle House now.",
        15000:  "**15,000 WP**. The waffles are evolving. They know your name.",
        40000:  "**40,000 WP**. You have surpassed the concept of breakfast. You ARE the waffle.",
        100000: "**100,000 WP**. THE WAFFLE SINGULARITY. WHAT HAVE YOU DONE. WHAT HAVE YOU BECOME.",
    };
    return new EmbedBuilder()
        .setColor(WAFFLE_COLOR)
        .setTitle("🧇 Waffle Milestone!")
        .setDescription(messages[milestone] ?? `You've reached **${milestone.toLocaleString()} WP** earned. Incredible.`)
        .setFooter({ text: WAFFLE_FOOTER });
}

export function glazeNotifyEmbed(glazeName: string, durationMs: number): EmbedBuilder {
    const mins = Math.round(durationMs / 60000);
    return new EmbedBuilder()
        .setColor(WAFFLE_COLOR_GREEN)
        .setTitle(`✨ ${glazeName} applied!`)
        .setDescription(`You've been glazed! Your waffle points are boosted for **${mins} minutes**.`)
        .setFooter({ text: WAFFLE_FOOTER });
}

export function burnNotifyEmbed(burnName: string, durationMs: number): EmbedBuilder {
    const mins = Math.round(durationMs / 60000);
    return new EmbedBuilder()
        .setColor(WAFFLE_COLOR_RED)
        .setTitle(`🔥 ${burnName} applied!`)
        .setDescription(`Oof. Your waffles are burning. Debuffed for **${mins} minutes**.`)
        .setFooter({ text: WAFFLE_FOOTER });
}

export function spawnEmbed(cardName: string, cardEmoji: string, rarity: string, challengeDesc: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(WAFFLE_COLOR)
        .setTitle(`${cardEmoji} A wild card appeared!`)
        .setDescription(`**${cardName}** (${rarity})\n\n${challengeDesc}`)
        .setFooter({ text: `${WAFFLE_FOOTER} • 5 minutes to claim` });
}

export function spawnTimeoutEmbed(cardName: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(0x95A5A6)
        .setTitle("Card unclaimed!")
        .setDescription(`**${cardName}** went unclaimed and has expired.`)
        .setFooter({ text: WAFFLE_FOOTER });
}

export function spawnWinnerEmbed(cardName: string, cardEmoji: string, winnerTag: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(WAFFLE_COLOR_GREEN)
        .setTitle(`${cardEmoji} Card claimed!`)
        .setDescription(`**${cardName}** has been claimed by **${winnerTag}**!`)
        .setFooter({ text: WAFFLE_FOOTER });
}

export function leaderboardEmbed(entries: { rank: number; tag: string; score: number }[]): EmbedBuilder {
    const lines = entries.map(e => `**${e.rank}.** ${e.tag} — ${e.score.toLocaleString()} WP`).join("\n");
    return new EmbedBuilder()
        .setColor(WAFFLE_COLOR)
        .setTitle("🧇 Waffle House Leaderboard")
        .setDescription(lines || "No one on the leaderboard yet!")
        .setFooter({ text: WAFFLE_FOOTER });
}

export function formatDuration(ms: number): string {
    if (ms <= 0) return "expired";
    const totalSecs = Math.floor(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}
