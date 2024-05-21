import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Services } from "../../Services";
import SlashCommand from "../SlashCommand";
import { randomInt } from "crypto";

export default class ExampleCommand extends SlashCommand {
    public data = (new SlashCommandBuilder()
        .setName("fortune")
        .setDescription("Check your or someone else's fortune!")
        .addMentionableOption(option =>
            option.setName("person")
                .setDescription("[OPTIONAL] The person whose fortune you want to check.")
                .setRequired(false)
        )) as SlashCommandBuilder;

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
        const FORTUNES = [
            'I slipped on ma’ beans! Try again.',
            'Whackadoo! Excellent Luck.',
            'Good Luck.',
            'Average Luck.',
            'Aw Biscuits! Bad Luck.',
            'Whackadoo! Good news will come to you by mail.',
            '（　´_ゝ`）ﾌｰﾝ.',
            'ｷﾀ━━━━━━(ﾟ∀ﾟ)━━━━━━ !!!!',
            'You will meet a dark handsome stranger.',
            'Better not tell you now.',
            'Outlook good.',
            'Aw Biscuits! Very Bad Luck.',
            'For real life? Godly Luck.'
        ]
        const SELECTED = FORTUNES[randomInt(0, FORTUNES.length)]
        const TARGET = interaction.options.getMentionable("person")

        var output = ""
        if (TARGET == null) {
            output = `Your fortune: ${SELECTED}`
        } else {
            output = `${TARGET}'s fortune: ${SELECTED}`
        }

        await interaction.reply({
            content: output
        })
    }
}