import {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    ColorResolvable,
    EmbedBuilder,
    SlashCommandBuilder
} from "discord.js"
import { Services } from "../../Services"
import SlashCommand from "../SlashCommand"
import { load as parse } from "cheerio"
import { getAverageColor } from "fast-average-color-node"

export default class CharacterCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("character")
        .setDescription("Find more information about a character!")
        .addStringOption(option =>
            option.setName("character")
                .setDescription("The character you want to know more about.")
                .setRequired(true)
                .setAutocomplete(true))

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
        const BLUEYPEDIA_URL = "https://blueypedia.fandom.com"
        const OPTION = interaction.options.getString("character")

        const generateCharacterEmbed = async (url: string) => {
            const CHARACTER_NAME_PATH = "main .page-header #firstHeading"
            const CHARACTER_DATA_PATH = ".pi-item.pi-data.pi-item-spacing.pi-border-color[data-source='$source'] > .pi-data-value.pi-font"
            const CHARACTER_IMAGE_PATH = ".pi-item.pi-image a"
            const CHARACTER_DATA = ["breed", "gender", "age"]

            const CHARACTER_PAGE = await fetch(url)
            const $CHARACTER = parse(await CHARACTER_PAGE.text())

            const IMAGE_URL = $CHARACTER(CHARACTER_IMAGE_PATH).attr("href")
            const IMAGE_COLOR = await getAverageColor(IMAGE_URL)

            var data: { [source: string]: string } = {}

            for (const i of CHARACTER_DATA) {
                const SCRAPED_DATA = $CHARACTER(CHARACTER_DATA_PATH.replace("$source", i))
                data[i] = SCRAPED_DATA.find("br").replaceWith("\n").end().text()
                data[i] = data[i].replace(/\[.*\]/, "")
                data[i] = data[i].replace(/\[.*\]/, "")
            }

            const embed = new EmbedBuilder()
                .setColor(IMAGE_COLOR.hex as ColorResolvable)
                .setTitle($CHARACTER(CHARACTER_NAME_PATH).text())
                .setURL(url)
                .setImage(IMAGE_URL)
                .setTimestamp()
                .setFooter({ text: 'Fetched from Blueypedia by Bot Bilby' })
            
            if (data["breed"]){ embed.addFields([{name: "Breed", value: data["breed"], inline: true}])};
            if (data["gender"]){ embed.addFields([{name: "Gender", value: data["gender"], inline: true}])};
            if (data["age"]){ embed.addFields([{name: "Age", value: data["age"], inline: true}])};
            
            return embed
        }
        
        try {
            await interaction.reply({
                embeds: [await generateCharacterEmbed(BLUEYPEDIA_URL + OPTION)],
                components: []
            })
        } catch (error) {
            await interaction.reply({
                content: "Character not found! Are you sure you selected a valid character from the list?",
                ephemeral: true
            })
        } 
    }
    
    async autocomplete(interaction: AutocompleteInteraction, services: Services) {
        const BLUEYPEDIA_URL = "https://blueypedia.fandom.com"
        const CHARACTER_CATEGORY_URL = `${BLUEYPEDIA_URL}/wiki/Category:Characters`

        const CHARACTER_LIST_PAGE = await fetch(CHARACTER_CATEGORY_URL)
        const $CHAR_LIST = parse(await CHARACTER_LIST_PAGE.text())

        const EXCLUDED_PAGE = [
            "Heeler family"
        ]
        const LIST_OF_CHARACTERS = $CHAR_LIST("main #content .category-page__members .category-page__member a.category-page__member-link")
            .map(function () {
                return {text: $CHAR_LIST(this).text(), url: $CHAR_LIST(this).attr("href")}
            })
            .toArray()
            .filter(v => !v.text.startsWith("Category:"))
            .filter(v => !EXCLUDED_PAGE.includes(v.text))
        
        const focusedValue = interaction.options.getFocused();

        const filtered = LIST_OF_CHARACTERS.filter(choice => choice.text.toLowerCase().startsWith(focusedValue))
            .slice(0, 25);

        await interaction.respond(
			filtered.map(choice => ({ name: choice.text, value: choice.url }))
		);
    }
}