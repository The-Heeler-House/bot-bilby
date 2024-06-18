import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";
import { getFullTemplateURL } from "../../../../Helper/PlaceURLHelper";

export default class PlaceTemplatePreviewSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("preview")
        .setDescription("Previews the current template.")
        .addStringOption(option =>
            option.setName("template")
                .setDescription("The template to preview.")
                .setRequired(true)
                .setChoices([
                    {
                        name: "Bluey Standalone",
                        value: "bluey"
                    },
                    {
                        name: "Bluey & Allies",
                        value: "bluey_allies"
                    }
                ])
        )

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        let id = "00000";
        let template = interaction.options.getString("template", true) as "bluey" | "bluey_allies";

        switch (template) {
            case "bluey":
                id = services.state.state.place.current_template_id.standalone
                break;
            case "bluey_allies":
                id = services.state.state.place.current_template_id.allies
                break;
        }
        
        await interaction.reply({
            embeds: [
                {
                    title: `Template - Iteration #${id}`,
                    fields: [
                        {
                            name: "Width",
                            value: services.state.state.place.width.toString(),
                            inline: true
                        },
                        {
                            name: "Height",
                            value: services.state.state.place.height.toString(),
                            inline: true
                        },
                        {
                            name: "Offset X",
                            value: services.state.state.place.x_offset.toString(),
                            inline: true
                        },
                        {
                            name: "Offset Y",
                            value: services.state.state.place.y_offset.toString(),
                            inline: true
                        }
                    ],
                    color: 2918143,
                    image: {
                        url: getFullTemplateURL(template, id)
                    }
                }
            ]
        });
    }
}