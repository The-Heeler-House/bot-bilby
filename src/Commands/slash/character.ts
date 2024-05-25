import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    EmbedBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from "discord.js"
import { Services } from "../../Services"
import SlashCommand from "../SlashCommand"
import { load as parse } from "cheerio"

export default class CharacterCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("character")
        .setDescription("Find more information about a character!")

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
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

        let currentPageIndex = 0 // start from 0
        const MAX_DROPDOWN_DISPLAY = 25
        const NUM_PAGES = Math.ceil(LIST_OF_CHARACTERS.length / MAX_DROPDOWN_DISPLAY) // start from 1

        const INITIAL_EMBED = new EmbedBuilder()
            .setTitle("Nothing Selected!")
            .setDescription(
                "Choose a character in the dropdown below to view the detail.\n" +
                "Use the arrow below to view more characters in the dropdown.\n"
            )
            .setColor(0x3f4aa1)
            .setTimestamp()
            .setFooter({ text: "Bot Bilby" })

        const generateCharacterEmbed = async (url: string) => {
            const CHARACTER_NAME_PATH = "main .page-header #firstHeading"
            const CHARACTER_DATA_PATH = ".pi-item.pi-data.pi-item-spacing.pi-border-color[data-source='$source'] > .pi-data-value.pi-font"
            const CHARACTER_IMAGE_PATH = ".pi-item.pi-image a"
            const CHARACTER_DATA = ["breed", "gender", "age"]

            const CHARACTER_PAGE = await fetch(url)
            const $CHARACTER = parse(await CHARACTER_PAGE.text())

            var data: { [source: string]: string } = {}

            for (const i of CHARACTER_DATA) {
                const SCRAPED_DATA = $CHARACTER(CHARACTER_DATA_PATH.replace("$source", i))
                data[i] = SCRAPED_DATA.find("br").replaceWith("\n").end().text()
                data[i] = data[i].replace(/\[.*\]/, "")
                data[i] = data[i].replace(/\[.*\]/, "")
            }

            return new EmbedBuilder()
                .setColor(0x3f4aa1)
                .setTitle($CHARACTER(CHARACTER_NAME_PATH).text())
                .setURL(url)
                .addFields([
                    {
                        name: "Breed",
                        value: data["breed"],
                        inline: true
                    },
                    {
                        name: "Gender",
                        value: data["gender"],
                        inline: true
                    },
                    {
                        name: "Age",
                        value: data["age"],
                        inline: true
                    }
                ])
                .setImage($CHARACTER(CHARACTER_IMAGE_PATH).attr("href"))
                .setTimestamp()
                .setFooter({ text: 'Fetched from Blueypedia by Bot Bilby' })
        }

        const generateDropdownItems = () => LIST_OF_CHARACTERS
            .slice(
                MAX_DROPDOWN_DISPLAY * currentPageIndex,
                MAX_DROPDOWN_DISPLAY * (currentPageIndex + 1)
            )
            .map(v =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(v.text)
                    .setValue(v.url)
            )

        const generateDropdown = () => new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("characters")
                    .setPlaceholder("Select a character!")
                    .addOptions(...generateDropdownItems())
            )

        const generateButtonRow = (disabled?: boolean) => new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("previous")
                    .setLabel("Previous")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(disabled ?? currentPageIndex == 0),
                new ButtonBuilder()
                    .setCustomId("page_num")
                    .setLabel(`Page: ${currentPageIndex + 1} / ${NUM_PAGES}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId("next")
                    .setLabel("Next")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(disabled ?? currentPageIndex == NUM_PAGES - 1),
            )

        const MESSAGE = await interaction.reply({
            embeds: [INITIAL_EMBED],
            components: [generateDropdown(), generateButtonRow()]
        })

        const BUTTON_COLLECTOR = MESSAGE.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.user.id == interaction.user.id,
            time: 120_000
        })

        BUTTON_COLLECTOR.on("collect", async e => {
            switch (e.customId) {
                case "previous":
                    currentPageIndex -= 1
                    break
                case "next":
                    currentPageIndex += 1
                    break
            }

            await e.update({
                embeds: [INITIAL_EMBED],
                components: [generateDropdown(), generateButtonRow()]
            })
        })

        const MENU_COLLECTOR = MESSAGE.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id == interaction.user.id,
            time: 30_000
        })

        MENU_COLLECTOR.on("collect", async e => {
            if (e.customId != "characters") return
            await e.update({
                embeds: [await generateCharacterEmbed(BLUEYPEDIA_URL + e.values[0])],
                components: []
            })
        })
    }
}