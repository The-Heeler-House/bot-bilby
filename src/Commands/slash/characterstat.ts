import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember, AutocompleteInteraction, ColorResolvable, EmbedBuilder } from "discord.js";
import { Services } from "../../Services";
import SlashCommand from "../SlashCommand";
import { createHash } from "crypto";
import { load as parse } from "cheerio"
import moment from "moment-timezone"
import { getAverageColor } from "fast-average-color-node"

const BLUEYPEDIA_URL = "https://blueypedia.fandom.com"
const CHARACTER_CATEGORY_URL = `${BLUEYPEDIA_URL}/wiki/Category:Characters`
const REFRESH_AFTER = 15 * 60

const RATING_LIST = [
    "S+", "S", "S-", "A+", "A", "A-",
    "B+", "B", "B-", "C+", "C", "C-",
    "D+", "D", "D-", "F+", "F", "F-",
    "∞"
]

const ATTRIBUTE_LIST = ["Strength", "Defense", "Dexterity", "Intelligence", "Wisdom", "Luck"]

let characterLists = []
let lastFetch = moment("1970-01-01T12:00:00Z")

async function getData() {
    const now = moment()
    const time_diff = moment.duration(now.diff(lastFetch)).asSeconds()
    if (time_diff >= REFRESH_AFTER) {
        lastFetch = moment()
    } else return

    const charListPage = await fetch(CHARACTER_CATEGORY_URL)
    const $charList = parse(await charListPage.text())

    const EXCLUDED_PAGE = [
        "Heeler family"
    ]

    characterLists = $charList("main #content .category-page__members .category-page__member a.category-page__member-link")
        .map(function () {
            return {text: $charList(this).text(), url: $charList(this).attr("href")}
        })
        .toArray()
        .filter(v => !v.text.startsWith("Category:"))
        .filter(v => !EXCLUDED_PAGE.includes(v.text))
}

export default class FortuneCommand extends SlashCommand {
    public data = (new SlashCommandBuilder()
        .setName("characterstat")
        .setDescription("Check the stat for a Bluey character in a battle against other characters!")
        .addStringOption(option =>
            option.setName("character")
                .setDescription("Choose a Bluey character!")
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName("equip")
                .setDescription("Equip the character with what you want! Keep it PG though.")
                .setRequired(true)
                .setMaxLength(256)
        )) as SlashCommandBuilder;

    async execute(interaction: ChatInputCommandInteraction, services: Services) {
        const character = interaction.options.getString("character")
        const equip = interaction.options.getString("equip")
        const hash = createHash("sha512")

        const generateEmbed = async (character: string, equip: string) => {
            const CHARACTER_NAME_PATH = "main .page-header #firstHeading"
            const CHARACTER_IMAGE_PATH = ".pi-item.pi-image a"

            const CHARACTER_PAGE = await fetch(BLUEYPEDIA_URL + character)
            const $CHARACTER = parse(await CHARACTER_PAGE.text())

            const IMAGE_URL = $CHARACTER(CHARACTER_IMAGE_PATH).attr("href")
            const IMAGE_COLOR = await getAverageColor(IMAGE_URL)

            let characterName = $CHARACTER(CHARACTER_NAME_PATH).text()
            characterName = characterName.trim()
            equip = equip.trim()

            hash.update($CHARACTER.text())
            hash.update(characterName.toLowerCase())
            hash.update(character)
            hash.update(equip.toLowerCase())

            const stat: { [x: string]: string } = {}

            for (let i of ATTRIBUTE_LIST) {
                hash.update(i)
                const sauce = hash.copy().digest()
                const num = sauce.reduce((accumulator, cur, index) => accumulator ^ cur ^ index)

                stat[i] = RATING_LIST[num % RATING_LIST.length]
            }

            const embed = new EmbedBuilder()
                .setColor(IMAGE_COLOR.hex as ColorResolvable)
                .setTitle(`Character Stats!`)
                .setDescription(`**Character: "${characterName}"**\n**Equipped with: "${equip}"**`)
                .setImage(IMAGE_URL)
                .addFields(
                    Object.keys(stat).map(v => ({name: v, value: stat[v], inline: true}))
                )
                .setTimestamp()

            return embed
        }

        try {
            await interaction.reply({
                embeds: [await generateEmbed(character, equip)],
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
        await getData()
        const focusedValue = interaction.options.getFocused();

        const filtered = characterLists.filter(choice =>
            choice.text
                .toLowerCase()
                .trim()
                .includes(focusedValue.toLowerCase().trim()))
            .slice(0, 25)

        await interaction.respond(
            filtered.map(choice => ({ name: choice.text, value: choice.url }))
        )
    }
}