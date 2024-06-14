import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";

export default class PlaceAnalyticsSetIdSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("set_id")
        .setDescription("Maps your BlueyPlace ID to your Discord account, allowing Bilby to get your personal analytics.")
        .addStringOption(option =>
            option.setName("id")
                .setDescription("The BlueyPlace ID to assign to your Discord account")
                .setRequired(true)
        )

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        await interaction.reply("not yet implemented");
    }
}