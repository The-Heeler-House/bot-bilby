import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { Services } from "../../Services";
import SlashCommand from "../SlashCommand";
import { AUTHOR_FIELD } from "../constants";

export default class BoredCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("changelog")
        .setDescription("See what's new with Bot Bilby.")

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
        const VERSION = "4.0.0"
        const DATE = new Date(2024, 5, 28)
        const CHANGES = [
            "- Complete recode from the ground up.",
            " - The recode improves Bilby's stability immensely, no more random crashing",
            " - This also allows Bilby to be fitted with features specifically for events.",
            "- Redesigned `muteme` command output.",
            " - We thank you for using the Heeler House's detox service.",
            "- Redesigned `8ball`, `bingo` and `hangman` commands",
            " - We've also added more words to `hangman`. Good luck!",
            "- Removed `music` and `friends` commands.",
            " - These 2 commands have extra barrier of entry with the recode. They will return soon!"
        ]

        const changelogEmbed = new EmbedBuilder()
            .setAuthor(AUTHOR_FIELD)
            .setTitle(`Version ${VERSION} changelog`)
            .setColor(0x72bfed)
            .setTimestamp(DATE)
            .setDescription(CHANGES.join("\n"))
            .setFooter({
                text: "Bot Bilby Contributors"
            })

        await interaction.reply({
            embeds: [changelogEmbed]
        });
    }
}