import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Services } from "../../Services";
import SlashCommand from "../SlashCommand";
import { randomInt } from "crypto";

export default class BoredCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("changelog")
        .setDescription("See what's new with Bot Bilby.")

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
        await interaction.reply({
            "embeds": [
                {
                    "title": "Version 4.0.0 changelog",
                    "color": 0x72bfed,
                    "timestamp": "Thu May 23 2024 00:00:00 GMT+0100 (British Summer Time)",
                    "author": {
                        "name": "Bot Bilby",
                        "url": "https://discord.com/blueyheeler",
                        "icon_url": "https://cdn.discordapp.com/avatars/537583059348750336/22e5087eb405782afccab3e635c7df91.png?size=64"
                    },
                    "description": "- Complete recode from the ground up.\n - The recode improves Bilby's stability immensly, no more random crashing\n - This also allows Bilby to be fitted with features specifically for events.\n- Redesigned `muteme` command output.\n - We thank you for using the Heeler House's detox servvice.\n- Redesigned `8ball`, `bingo` and `hangman` commands\n - We've also added more words to `hangman`. Good luck!\n- Removed `music` and `friends` commands.\n - These 2 commands have extra barrier of entry with the recode. They will return soon!",
                    "footer": {
                        "text": "Bot Bilby Contributors"
                    }
                }
            ]
        });
    }
}