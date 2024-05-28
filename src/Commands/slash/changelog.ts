import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { Services } from "../../Services";
import SlashCommand from "../SlashCommand";
import { randomInt } from "crypto";

export default class BoredCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("changelog")
        .setDescription("See what's new with Bot Bilby.")

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
        const VERSION = "4.0.1"
        const DATE = new Date(2024, 5, 28)
        const CHANGES = [
            "- Complete recode from the ground up.",
            " - The recode improves Bilby's stability immensly, no more random crashing",
            " - This also allows Bilby to be fitted with features specifically for events.",
            "- Redesigned `muteme` command output.",
            " - We thank you for using the Heeler House's detox servvice.",
            "- Redesigned `8ball`, `bingo` and `hangman` commands",
            " - We've also added more words to `hangman`. Good luck!",
            "- Removed `music` and `friends` commands.",
            " - These 2 commands have extra barrier of entry with the recode. They will return soon!"
        ]

        const changelogEmbed = new EmbedBuilder()
            .setTitle(`Version ${VERSION} changelog`)
            .setColor(0x72bfed)
            .setTimestamp(DATE)
            .setAuthor({
                name: "Bot Bilby",
                url: "https://discord.com/blueyheeler",
                iconURL: "https://cdn.discordapp.com/avatars/537583059348750336/22e5087eb405782afccab3e635c7df91.png?size=64"
            })
            .setDescription(CHANGES.join("\n"))
            .setFooter({
                text: "Bot Bilby Contributors"
            })

        await interaction.reply({
            embeds: [changelogEmbed]
        });
    }
}