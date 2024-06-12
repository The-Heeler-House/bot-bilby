import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder,
    AuditLogOptionsType,
} from "discord.js";
import { Services } from "../../Services";
import SlashCommand from "../SlashCommand";
import rplaceAlliance, { Template } from "../../Services/Database/models/rplaceAlliance";
import { createCanvas, loadImage, ImageData } from "canvas";
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
                .addAttachmentOption((option) =>
                    option
                        .setName("source")
                        .setDescription("The image link of the template.")
                        .setRequired(true)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("x")
                        .setDescription("The X coordinate of the template.")
                        .setRequired(true)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("y")
                        .setDescription("The Y coordinate of the template.")
                        .setRequired(true)
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
                .addAttachmentOption((option) =>
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
                        .setName("group")
                        .setDescription("The name of the template group.")
                        .setRequired(true)
                        .setChoices(
                            { name: "Bluey", value: "bluey" },
                            { name: "Bluey and Allies", value: "allies" },
                            { name: "Bluey and P3ACE", value: "p3ace"}
                        )
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
            const templateImage = interaction.options.getAttachment("source");

            if (templateImage && templateImage.contentType !== "image/png") {
                await interaction.reply({
                    content: "For quality assurance, only PNG images are supported.",
                    ephemeral: true,
                });
                return;
            }

            const template: Template = {
                name: interaction.options.getString("name"),
                source: templateImage.url,
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

            const templateImage = interaction.options.getAttachment("source");

            if (templateImage && templateImage.contentType !== "image/png") {
                await interaction.reply({
                    content: "For quality assurance, only PNG images are supported.",
                    ephemeral: true,
                });
                return;
            }

            const newTemplate = {
                name: interaction.options.getString("name"),
                source:
                    (templateImage && templateImage.url) || template.source,
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
            const topleft = { x: 1, y: 1 };
            // read all the templates, and render them on a 1000px by 1000px transparent canvas, where the top left pixel is 1, 1.
            const templates = await services.database.collections.rplaceTemplates.find().toArray() as unknown as Template[];

            const canvas = createCanvas(1000, 1000);
            const ctx = canvas.getContext("2d");

            if (interaction.options.getString("group") === "allies") {
                const alliances = await services.database.collections.rplaceAlliances.find().toArray() as unknown as rplaceAlliance[];
                for (const alliance of alliances) {
                    for (const template of alliance.templates) {
                        const buffer = await fetch(template.source).then((res) => res.buffer());
                        const converted = await sharp(buffer).toFormat('png').toBuffer();
                        const img = await loadImage(converted);
                        ctx.drawImage(img, template.x - topleft.x, template.y - topleft.y);
                    }
                }
            }

            if (interaction.options.getString("group") === "p3ace") {
                const p3ace = await services.database.collections.rplaceAlliances.findOne<rplaceAlliance>({ name: "P3ACE" });
                if (!p3ace) {
                    await interaction.reply({
                        content: "P3ACE alliance not found.",
                        ephemeral: true,
                    });
                    return;
                }
                for (const template of p3ace.templates) {
                    const buffer = await fetch(template.source).then((res) => res.buffer());
                    const converted = await sharp(buffer).toFormat('png').toBuffer();
                    const img = await loadImage(converted);
                    ctx.drawImage(img, template.x - topleft.x, template.y - topleft.y);
                }
            }

            for (const template of templates) {
                const buffer = await fetch(template.source).then((res) => res.buffer());
                const converted = await sharp(buffer).toFormat('png').toBuffer();
                const img = await loadImage(converted);
                ctx.drawImage(img, template.x - topleft.x, template.y - topleft.y);
            }

            const buffer = canvas.toBuffer();

            const attachment = new AttachmentBuilder(buffer, { name: "rplace-templates.png" });

            switch(interaction.options.getString("group")) {
                case "bluey":
                    await interaction.reply({ files: [attachment], content: `# Combined Bluey r/Place templates.` });
                    break;
                case "allies":
                    await interaction.reply({ files: [attachment], content: `# Combined Bluey and Allied r/Place templates.` });
                    break;
                case "p3ace":
                    await interaction.reply({ files: [attachment], content: `# Combined Bluey and P3ACE r/Place templates.` });
                    break;
            }
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
        
        const buffer = await fetch(template.source).then((res) => res.buffer());
        const converted = await sharp(buffer).toFormat('png').toBuffer();
        const img = await loadImage(converted);
        const width = img.width;
        const height = img.height;

        const highres = new AttachmentBuilder(scaledbuffer, { name: `${templates.indexOf(template)}.png` });

        media.push(highres);

        const templateEmbed = new EmbedBuilder()
            .setColor(0x72bfed)
            .setTitle(template.name)
            .setDescription(
                coord + `\nWidth: \`${width}\` Height: \`${height}\`` + `\nImage Source: [Link](${template.source})`
            )
            .setFooter({
                text: template.custom ? "Custom Template" : "Endu Template",
            })
            .setImage(`attachment://${templates.indexOf(template)}.png`)
            .setThumbnail(template.source);

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

    // get imagedata form buffer
    const img = await loadImage(converted);
    
    // Get the original width and height
    const originalWidth = img.width;
    const originalHeight = img.height;
        
    const canvas = createCanvas(originalWidth, originalHeight);
    
    // Get the 2D context of the canvas
    const context = canvas.getContext('2d');
        
    // Draw the original image onto the canvas with quadrupled dimensions
    context.drawImage(img, 0, 0, originalWidth, originalHeight);
        
    // Get the modified image data
    const modifiedImageData = context.getImageData(0, 0, originalWidth, originalHeight);
    
    // Directly manipulate the image data to quadruple the width and height
    const modifiedWidth = modifiedImageData.width;
    const modifiedHeight = modifiedImageData.height;
    const modifiedData = modifiedImageData.data;

    const scale = 4;
    const newImageData = new Uint8ClampedArray(modifiedWidth * modifiedHeight * 4 * scale * scale);

    if (newImageData.length > 16000000) {
        return buffer;
    }
    
    for (let y = 0; y < modifiedHeight; y++) {
        for (let x = 0; x < modifiedWidth; x++) {
            const sourceIndex = (y * modifiedWidth + x) * 4;
            const targetIndex = ((y * modifiedWidth * scale * scale) + (x * scale)) * 4;
            
            for (let i = 0; i < scale; i++) {
                for (let j = 0; j < scale; j++) {
                    for (let k = 0; k < 4; k++) {
                        newImageData[targetIndex + i * scale + k + modifiedWidth * scale * scale * j] = modifiedData[sourceIndex + k];
                    }
                }
            }
        }
    }
        
    // Update the modified image data with the quadrupled width and height
    const newRetImageData = new ImageData(newImageData, modifiedWidth * scale, modifiedHeight * scale);
    
    const newCanvas = createCanvas(modifiedWidth * scale, modifiedHeight * scale);
    const newContext = newCanvas.getContext('2d');
    newContext.putImageData(newRetImageData, 0, 0);

    const newbuffer = newCanvas.toBuffer();

    return newbuffer;
}