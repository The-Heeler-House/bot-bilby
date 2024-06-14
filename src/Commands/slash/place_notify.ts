import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Services } from "../../Services";
import SlashCommand from "../SlashCommand";
import * as logger from "../../logger";

export default class PlaceNotifyCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("notify")
        .setDescription("Sends a notification out to all overlay users.")
        .addStringOption(option => 
            option.setName("level")
                .setDescription("The importance of the notification. Critical sends a sound notification.")
                .addChoices([
                    {
                        name: "Low",
                        value: "low"
                    },
                    {
                        name: "High",
                        value: "high"
                    },
                    {
                        name: "Critical",
                        value: "critical"
                    }
                ])
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName("text")
                .setDescription("The text of the notification.")
                .setRequired(true)
        )

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
        let level = interaction.options.getString("level", true);
        let text = interaction.options.getString("text", true);

        await interaction.deferReply();

        try {
            await services.placeRealtime.publish("bluey", "notifications", {
                level,
                text,
                date: new Date().toISOString()
            });
            await services.placeRealtime.publish("bluey_allies", "notifications", {
                level,
                text,
                date: new Date().toISOString()
            });
            await interaction.editReply(`Successfully sent the following notification out with level \`${level}\`.\n\`\`\`\n${text}\n\`\`\``);
        } catch (error) {
            logger.error("Encountered an error while trying to send out notification to BlueyPlace clients. See error below.\n",error.stack);
            await interaction.editReply(`Failed to send the notification out. Please try again.`);
        }
    }
}