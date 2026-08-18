import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    GuildMember,
    AutocompleteInteraction,
    ColorResolvable,
    EmbedBuilder,
} from "discord.js";
import { Services } from "../../Services";
import SlashCommand from "../SlashCommand";
import { createHash } from "crypto";
import { load as parse } from "cheerio";
import moment from "moment-timezone";
import { getAverageColor } from "fast-average-color-node";
import JSONData from "../../Assets/characterstat-data/list.json";

const API_ROOT = "https://blueypedia.fandom.com/rest.php/v1";

const RATING_LIST = [
    "S+",
    "S",
    "S-",
    "A+",
    "A",
    "A-",
    "B+",
    "B",
    "B-",
    "C+",
    "C",
    "C-",
    "D+",
    "D",
    "D-",
    "F+",
    "F",
    "F-",
    "∞",
];

const ATTRIBUTE_LIST = [
    "Strength",
    "Defense",
    "Dexterity",
    "Intelligence",
    "Wisdom",
    "Luck",
];

let characterLists = JSONData;

export default class CharacterStatCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("characterstat")
        .setDescription(
            "Check the stat for a Bluey character in a battle against other characters!",
        )
        .addStringOption((option) =>
            option
                .setName("character")
                .setDescription("Choose a Bluey character!")
                .setRequired(true)
                .setAutocomplete(true),
        )
        .addStringOption((option) =>
            option
                .setName("equip")
                .setDescription(
                    "Equip the character with what you want! Keep it PG though.",
                )
                .setRequired(true)
                .setMaxLength(256),
        ) as SlashCommandBuilder;

    async execute(
        interaction: ChatInputCommandInteraction,
        services: Services,
    ) {
        const character = interaction.options.getString("character");
        const equip = interaction.options.getString("equip");
        const hash = createHash("sha512");

        const pleaseWait = new EmbedBuilder()
            .setTitle("Please Wait...")
            .setColor(0xffff00)
            .setTimestamp();

        const generateEmbed = async (character: string, equip: string) => {
            const CHARACTER_NAME_PATH = ".pi-title";
            const CHARACTER_IMAGE_PATH = ".pi-image-thumbnail";

            const JSON_OUT = await fetch(
                `${API_ROOT}/page/${character}/with_html`,
                {
                    method: "GET",
                },
            ).then((res) => res.json());
            const RAW = JSON_OUT["html"];
            const $CHARACTER = parse(RAW);

            const IMAGE_URL = $CHARACTER(CHARACTER_IMAGE_PATH).attr("src");
            const IMAGE_COLOR = await getAverageColor(IMAGE_URL);

            let characterName = $CHARACTER(CHARACTER_NAME_PATH).text();
            characterName = characterName.trim();
            equip = equip.trim();

            hash.update(characterName.toLowerCase());
            hash.update(character);
            hash.update(equip.toLowerCase());

            const stat: { [x: string]: string } = {};

            for (let i of ATTRIBUTE_LIST) {
                hash.update(i);
                const sauce = hash.copy().digest();
                const num = sauce.reduce(
                    (accumulator, cur, index) => accumulator ^ cur ^ index,
                );

                stat[i] = RATING_LIST[num % RATING_LIST.length];
            }

            const embed = new EmbedBuilder()
                .setColor(IMAGE_COLOR.hex as ColorResolvable)
                .setTitle(`Character Stats!`)
                .setDescription(
                    `**Character: "${characterName}"**\n**Equipped with: "${equip}"**`,
                )
                .setImage(IMAGE_URL)
                .addFields(
                    Object.keys(stat).map((v) => ({
                        name: v,
                        value: stat[v],
                        inline: true,
                    })),
                )
                .setTimestamp();

            return embed;
        };

        try {
            await interaction.reply({
                embeds: [pleaseWait],
            });

            await interaction.editReply({
                embeds: [await generateEmbed(character, equip)],
            });
        } catch (error) {
            await interaction.editReply({
                embeds: [],
                content:
                    "Character not found! Are you sure you selected a valid character from the list?",
            });
        }
    }

    async autocomplete(
        interaction: AutocompleteInteraction,
        services: Services,
    ) {
        const focusedValue = interaction.options.getFocused();

        const filtered = characterLists
            .filter((choice) =>
                choice.text
                    .toLowerCase()
                    .trim()
                    .includes(focusedValue.toLowerCase().trim()),
            )
            .slice(0, 25);

        await interaction.respond(
            filtered.map((choice) => ({
                name: choice.text,
                value: choice.url,
            })),
        );
    }
}
