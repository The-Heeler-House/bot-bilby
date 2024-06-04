import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder,
} from "discord.js";
import { Services } from "../../Services";
import SlashCommand from "../SlashCommand";
import { Template } from "../../Services/Database/models/rplaceAlliance";
import { createCanvas, loadImage } from "canvas";
import sharp from "sharp";
import fetch from "node-fetch";

export default class rPlaceTemplatesCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("template")
        .setDescription("r/place Bluey templates management commands.")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("list")
                .setDescription("List all current Bluey r/Place templates")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add")
                .setDescription("add a new Bluey r/Place template")
                .addStringOption((option) =>
                    option
                        .setName("name")
                        .setDescription("The name of the template.")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("source")
                        .setDescription("The image link of the template.")
                        .setRequired(false)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("x")
                        .setDescription("The X coordinate of the template.")
                        .setRequired(false)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("y")
                        .setDescription("The Y coordinate of the template.")
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("edit")
                .setDescription("Edit a Bluey r/Place template")
                .addStringOption((option) =>
                    option
                        .setName("name")
                        .setDescription("The name of the template.")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("source")
                        .setDescription("The image link of the template.")
                        .setRequired(false)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("x")
                        .setDescription("The X coordinate of the template.")
                        .setRequired(false)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("y")
                        .setDescription("The Y coordinate of the template.")
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("delete")
                .setDescription("Delete a Bluey r/Place template")
                .addStringOption((option) =>
                    option
                        .setName("name")
                        .setDescription("The name of the template.")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("render")
                .setDescription(
                    "Render an r/Place template group with the canvas."
                )
                .addStringOption((option) =>
                    option
                        .setName("name")
                        .setDescription("The name of the template group.")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        ) 
        .addSubcommand((subcommand) =>
            subcommand
                .setName("export")
                .setDescription("Export Bluey's r/Place templates to an Endu JSON file.")
        ) as SlashCommandBuilder;
    async execute(
        interaction: ChatInputCommandInteraction,
        services: Services
    ) {
        if (interaction.options.getSubcommand() === "list") {
            const templates = await services.database.collections.rplaceTemplates.find().toArray() as unknown as Template[];

            if (templates.length === 0) {
                await interaction.reply({ content: "No templates found. Add a template with `/templates add`." });
                return;
            }

            const result = await embedTemplates(templates, interaction);

            await interaction.reply({ embeds: result.embeds, files: result.media });
        } else if (interaction.options.getSubcommand() === "add") {
            const template: Template = {
                name: interaction.options.getString("name"),
                source: interaction.options.getString("source"),
                x: interaction.options.getInteger("x"),
                y: interaction.options.getInteger("y"),
                custom: true,
            };

            await services.database.collections.rplaceTemplates.insertOne(template);
            const templates = await services.database.collections.rplaceTemplates.find().toArray() as unknown as Template[];

            const result = await embedTemplates(templates, interaction);

            await interaction.reply({
                content: `Custom template \`${template.name}\` added to Bluey's template list.`,
                embeds: result.embeds,
                files: result.media,
            });
        } else if (interaction.options.getSubcommand() === "edit") {
            const template = await services.database.collections.rplaceTemplates.findOne<Template>({ name: interaction.options.getString("name") });

            if (!template) {
                await interaction.reply({
                    content: `Template with name \`${interaction.options.getString(
                        "name"
                    )}\` not found.`,
                    ephemeral: true,
                });
                return;
            }

            const newTemplate = {
                name: interaction.options.getString("name"),
                source:
                    interaction.options.getString("source") || template.source,
                x: interaction.options.getInteger("x") || template.x,
                y: interaction.options.getInteger("y") || template.y,
                custom: true,
            };

            await services.database.collections.rplaceTemplates.updateOne(
                { name: interaction.options.getString("name") },
                { $set: newTemplate }
            );

            const templates = await services.database.collections.rplaceTemplates.find().toArray() as unknown as Template[];

            const result = await embedTemplates(templates, interaction);

            await interaction.reply({
                content: `Custom template \`${template.name}\` edited from Bluey's template list.`,
                embeds: result.embeds,
                files: result.media,
            });

        } else if (interaction.options.getSubcommand() === "delete") {
            const template = await services.database.collections.rplaceTemplates.findOne<Template>({ name: interaction.options.getString("name") });

            if (!template) {
                await interaction.reply({
                    content: `Template with name \`${interaction.options.getString(
                        "name"
                    )}\` not found.`,
                    ephemeral: true,
                });
                return;
            }

            await services.database.collections.rplaceTemplates.deleteOne({ name: interaction.options.getString("name") });

            const templates = await services.database.collections.rplaceTemplates.find().toArray() as unknown as Template[];

            const result = await embedTemplates(templates, interaction);

            await interaction.reply({
                content: `Custom template \`${template.name}\` removed from Bluey's template list.`,
                embeds: result.embeds,
                files: result.media,
            });
        } else if (interaction.options.getSubcommand() === "render") {
            interaction.reply("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
        } else if (interaction.options.getSubcommand() === "export") {
            interaction.reply("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
        }
    }
}

async function embedTemplates(
    templates: Template[],
    interaction: ChatInputCommandInteraction
) {
    const invite = await interaction.client.fetchInvite("https://discord.gg/blueyheeler");

    const embeds: EmbedBuilder[] = [];
    const media: AttachmentBuilder[] = [];

    const embed = new EmbedBuilder()
        .setColor(0x72bfed)
        .setTitle("Our r/Place Alliance")
        .setDescription(
            `Faction Name: \`Bluey\`\nServer Invite: [${invite.code}](${invite.url})\nEndu Template: [Link](https://www.youtube.com/watch?v=dQw4w9WgXcQ)`
        )
        .setThumbnail(invite.guild.iconURL());

    embeds.push(embed);

    for (const template of templates) {
        const coord = `Coordinates: [\`(${template.x}, ${template.y})\`](https://www.reddit.com/r/place/&cx=${template.x}&cy=${template.y})`;

        const scaledbuffer = await quadPixels(template.source)
        const highres = new AttachmentBuilder(scaledbuffer, { name: `${templates.indexOf(template)}.png` });

        media.push(highres);

        const templateEmbed = new EmbedBuilder()
            .setColor(0x72bfed)
            .setTitle(template.name)
            .setDescription(coord)
            .setFooter({
                text: template.custom ? "Custom Template" : "Endu Template",
            })
            .setThumbnail(template.source)
            .setImage(`attachment://${templates.indexOf(template)}.png`);

        embeds.push(templateEmbed);

        if (embeds.length === 10) {
            break;
        }
    }

    if (embeds.length === 1) {
        const emptyEmbed = new EmbedBuilder()
            .setColor(0x72bfed)
            .setDescription(
                "No templates found. Add an Endu template with `/template add`."
            );

        embeds.push(emptyEmbed);
    }

    return { embeds, media };
}

async function quadPixels(image: string) {
    // Convert the image string to a buffer

    const buffer = await fetch(image).then((res) => res.buffer());

    const converted = await sharp(buffer).toFormat('png').toBuffer();

    // Load the image into a canvas
    const img = await loadImage(converted);

    const canvas = createCanvas(img.width * 8, img.height * 8);
    const ctx = canvas.getContext('2d');

    // Disable image smoothing to prevent interpolation
    ctx.imageSmoothingEnabled = false;

    // Draw the image onto the canvas at the quadrupled size
    ctx.drawImage(img, 0, 0, img.width * 8, img.height * 8);

    // Convert the canvas to a Buffer and save to file
    const newbuffer = canvas.toBuffer();

    return newbuffer;
}