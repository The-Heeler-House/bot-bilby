import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { Services } from "../../Services";
import SlashCommand from "../SlashCommand";
import * as logger from "../../logger";

export default class MuterouletteCommand extends SlashCommand {
    public disabledTime = new Date(0);

    public data = new SlashCommandBuilder()
        .setName("muteroulette")
        .setDescription("Try your luck at the muteroulette!")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("play")
                .setDescription("Roll the dice and chance fate!")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("stats")
                .setDescription("View your muteroulette stats!")
                .addMentionableOption((option) =>
                    option
                        .setName("person")
                        .setDescription(
                            "The person who's stats you want to check. OPTIONAL."
                        )
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("leaders")
                .setDescription("View the muteroulette leaderboard!")
        ) as SlashCommandBuilder;
    
    async execute(
        interaction: ChatInputCommandInteraction,
        services: Services
    ) {

    }
}