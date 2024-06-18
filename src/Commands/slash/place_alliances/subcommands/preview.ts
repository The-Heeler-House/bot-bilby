import { AttachmentBuilder, AutocompleteInteraction, CacheType, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import SlashSubCommand from "../../../SlashSubCommand";
import { Services } from "../../../../Services";
import PlaceAlliance from "../../../../Services/Database/models/placeAlliance";
import { BuiltTemplate, BuiltTemplates, buildSingleAllyTemplate, missingArtworkText } from "../../../../Helper/PlaceHelper";

export default class PlaceAlliancesPreviewSubCommand extends SlashSubCommand {
    public data = new SlashCommandSubcommandBuilder()
        .setName("preview")
        .setDescription("Preview an ally's template template.")
        .addStringOption(option =>
            option.setName("ally")
                .setDescription("The ally of who's template to preview.")
                .setAutocomplete(true)
                .setRequired(true)
        )

    async execute(interaction: ChatInputCommandInteraction<CacheType>, services: Services) {
        await interaction.deferReply();
        let alliance = await services.database.collections.place.alliances.findOne({ name: `${interaction.options.getString("ally", true)}` }) as unknown as PlaceAlliance;

        if (alliance == null) {
            await interaction.editReply(`Could not find an alliance called ${interaction.options.getString("ally", true)}`);
            return;
        }

        buildSingleAllyTemplate(alliance, services.state.state.place, async (data: BuiltTemplates) => {
            let template = data.allies[0] as BuiltTemplate;

            await interaction.editReply({
                embeds: [
                    {
                        title: `Template preview - ${alliance.name}`,
                        color: 2918143,
                        fields: [
                            {
                                name: "Source URL",
                                value: alliance.url
                            }
                        ],
                        image: {
                            url: "attachment://template.png"
                        }
                    }
                ],
                files: [
                    new AttachmentBuilder(Buffer.from(template.template.buffer.data), {
                        name: "template.png"
                    })
                ]
            });
        });
    }
    
    async autocomplete(interaction: AutocompleteInteraction<CacheType>, services: Services): Promise<void> {
        let alliances = await services.database.collections.place.alliances.find().toArray() as unknown as PlaceAlliance[];
        await interaction.respond(alliances.filter(alliance => alliance.name.startsWith(interaction.options.getString("ally", true))).map(choice => ({ name: choice.name, value: choice.name })));
    }
}