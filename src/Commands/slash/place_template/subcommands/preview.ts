import { CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";
import { getFullTemplateURL } from "../../../../Helper/PlaceURLHelper";

export default class PlaceTemplatePreviewSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("preview")
        .setDescription("Previews the current template.")

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        let id = services.state.state.place.current_template_id;

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
                    color: 2326507,
                    image: {
                        url: getFullTemplateURL(id)
                    }
                }
            ]
        });
    }
}