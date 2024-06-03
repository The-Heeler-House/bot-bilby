import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
} from "discord.js";
import { Services } from "../../Services";
import SlashCommand from "../SlashCommand";
import rplaceAlliance, {
    Template,
} from "../../Services/Database/models/rplaceAlliance";

export default class rPlaceCommand extends SlashCommand {
    public data = new SlashCommandBuilder()
        .setName("alliances")
        .setDescription("r/Place Alliance management commands.")
        .addSubcommand((command) =>
            command
                .setName("create")
                .setDescription("Create an r/Place alliance.")
                .addStringOption((option) =>
                    option
                        .setName("faction")
                        .setDescription("The name of the faction.")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("invite")
                        .setDescription("The invite link of the faction.")
                        .setRequired(true)
                )
                .addUserOption((option) =>
                    option
                        .setName("theirdiplo")
                        .setDescription("The main diplomat from their faction.")
                        .setRequired(true)
                )
                .addUserOption((option) =>
                    option
                        .setName("ourdiplo")
                        .setDescription("The main diplomat from our faction.")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("template")
                        .setDescription(
                            "The Endu/Osu template link of the faction."
                        )
                        .setRequired(false)
                )
        )
        .addSubcommand((command) =>
            command
                .setName("edit")
                .setDescription("Edit an r/Place alliance.")
                .addStringOption((option) =>
                    option
                        .setName("faction")
                        .setDescription("The name of the faction.")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("invite")
                        .setDescription("The invite link of the faction.")
                        .setRequired(false)
                )
                .addUserOption((option) =>
                    option
                        .setName("theirdiplo")
                        .setDescription("The main diplomat from their faction.")
                        .setRequired(false)
                )
                .addUserOption((option) =>
                    option
                        .setName("ourdiplo")
                        .setDescription("The main diplomat from our faction.")
                        .setRequired(false)
                )
                .addStringOption((option) =>
                    option
                        .setName("template")
                        .setDescription(
                            "The Endu/Osu template link of the faction."
                        )
                        .setRequired(false)
                )
        )
        .addSubcommand((command) =>
            command
                .setName("delete")
                .setDescription("Delete an r/Place alliance.")
                .addStringOption((option) =>
                    option
                        .setName("faction")
                        .setDescription("The name of the faction.")
                        .setRequired(true)
                )
        )
        .addSubcommand((command) =>
            command
                .setName("info")
                .setDescription("Get information on an r/Place alliance.")
                .addStringOption((option) =>
                    option
                        .setName("faction")
                        .setDescription("The name of the faction.")
                        .setRequired(true)
                )
        )
        .addSubcommand((command) =>
            command.setName("list").setDescription("List all alliances.")
        )
        .addSubcommand((command) =>
            command
                .setName("customadd")
                .setDescription("Add a custom r/Place template.")
                .addStringOption((option) =>
                    option
                        .setName("faction")
                        .setDescription("The name of the faction.")
                        .setRequired(true)
                )
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
        .addSubcommand((command) =>
            command
                .setName("customdelete")
                .setDescription("Delete a custom r/Place template.")
                .addStringOption((option) =>
                    option
                        .setName("faction")
                        .setDescription("The name of the faction.")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("name")
                        .setDescription("The name of the template.")
                        .setRequired(true)
                )
        )
        .addSubcommand((command) =>
            command
                .setName("customedit")
                .setDescription("Edit a custom r/Place template.")
                .addStringOption((option) =>
                    option
                        .setName("faction")
                        .setDescription("The name of the faction.")
                        .setRequired(true)
                )
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
        ) as SlashCommandBuilder;

    async execute(
        interaction: ChatInputCommandInteraction,
        services: Services
    ) {
        if (interaction.options.getSubcommandGroup() === "alliances") {
            if (interaction.options.getSubcommand() === "create") {
                const templates = await parseEndu(
                    interaction.options.getString("template"),
                    interaction.options.getString("faction"),
                    services
                ).catch(() => {
                    interaction.reply({
                        content:
                            "Failed to parse link. Check if the template is Endu compliant.",
                        ephemeral: true,
                    });
                    return;
                });

                const invite = await interaction.client
                    .fetchInvite(interaction.options.getString("invite"))
                    .catch(() => {
                        interaction.reply({
                            content: "Failed to fetch. Bad Invite.",
                            ephemeral: true,
                        });
                        return;
                    });

                if (!invite) {
                    interaction.reply({
                        content: "Failed to fetch. Bad Invite.",
                        ephemeral: true,
                    });
                    return;
                }

                const alliance: rplaceAlliance = {
                    name: interaction.options.getString("faction"),
                    templates: templates || [],
                    enduTemplate: interaction.options.getString("template"),
                    inviteUrl: invite.url,
                    theirDiplos: [interaction.options.getUser("theirdiplo").id],
                    ourDiplos: [interaction.options.getUser("ourdiplo").id],
                    ticket: interaction.channelId,
                };

                await services.database.collections.rplaceAlliances.insertOne(
                    alliance
                );

                const embed = await embedAlliance(alliance, interaction);

                await interaction.reply({
                    content: `Alliance with faction \`${alliance.name}\` created.`,
                    embeds: embed,
                });
            } else if (interaction.options.getSubcommand() === "edit") {
                const alliance =
                    await services.database.collections.rplaceAlliances.findOne<rplaceAlliance>(
                        { name: interaction.options.getString("faction") }
                    );

                if (!alliance) {
                    await interaction.reply({
                        content: `Alliance with faction \`${interaction.options.getString(
                            "faction"
                        )}\` not found.`,
                        ephemeral: true,
                    });
                    return;
                }

                const templates = await parseEndu(
                    interaction.options.getString("template"),
                    alliance.name,
                    services
                ).catch(() => {
                    interaction.reply({
                        content:
                            "Failed to parse link. Check if the template is Endu compliant.",
                        ephemeral: true,
                    });
                    return;
                });

                const invite = await interaction.client
                    .fetchInvite(interaction.options.getString("invite"))
                    .catch(() => {
                        interaction.reply({
                            content: "Failed to fetch. Bad invite.",
                            ephemeral: true,
                        });
                        return;
                    });

                const newAlliance: rplaceAlliance = {
                    name: alliance.name,
                    templates: templates || alliance.templates,
                    enduTemplate:
                        interaction.options.getString("template") ||
                        alliance.enduTemplate,
                    inviteUrl: (invite && invite.url) || alliance.inviteUrl,
                    theirDiplos: [
                        interaction.options.getUser("theirdiplo")?.id ||
                            alliance.theirDiplos[0],
                    ],
                    ourDiplos: [
                        interaction.options.getUser("ourdiplo")?.id ||
                            alliance.ourDiplos[0],
                    ],
                    ticket: interaction.channelId || alliance.ticket,
                };

                await services.database.collections.rplaceAlliances.updateOne(
                    { name: alliance.name },
                    { $set: newAlliance }
                );

                const embed = await embedAlliance(newAlliance, interaction);

                await interaction.reply({
                    content: `Alliance with faction \`${alliance.name}\` edited.`,
                    embeds: embed,
                });
            } else if (interaction.options.getSubcommand() === "delete") {
                const alliance =
                    await services.database.collections.rplaceAlliances.findOne<rplaceAlliance>(
                        { name: interaction.options.getString("faction") }
                    );

                if (!alliance) {
                    await interaction.reply({
                        content: `Alliance with faction \`${interaction.options.getString(
                            "faction"
                        )}\` not found.`,
                        ephemeral: true,
                    });
                    return;
                }

                await services.database.collections.rplaceAlliances.deleteOne({
                    name: alliance.name,
                });

                await interaction.reply({
                    content: `Alliance with faction \`${alliance.name}\` deleted.`,
                });
            } else if (interaction.options.getSubcommand() === "info") {
                const alliance =
                    await services.database.collections.rplaceAlliances.findOne<rplaceAlliance>(
                        { name: interaction.options.getString("faction") }
                    );

                if (!alliance) {
                    await interaction.reply({
                        content: `Alliance with faction \`${interaction.options.getString(
                            "faction"
                        )}\` not found.`,
                        ephemeral: true,
                    });
                    return;
                }

                const embed = await embedAlliance(alliance, interaction);

                await interaction.reply({ embeds: embed });
            } else if (interaction.options.getSubcommand() === "list") {
                const alliances =
                    await services.database.collections.rplaceAlliances
                        .find()
                        .toArray();

                const embed = new EmbedBuilder()
                    .setColor(0x72bfed)
                    .setTitle("Bluey's r/Place Alliances")
                    .setDescription(
                        `${
                            alliances
                                .map((alliance) => "`" + alliance.name + "`")
                                .join(", ") ||
                            "No alliances found. Add one with `/rplace alliance create`."
                        }`
                    );

                await interaction.reply({ embeds: [embed] });
            } else if (interaction.options.getSubcommand() === "customadd") {
                const alliance =
                    await services.database.collections.rplaceAlliances.findOne<rplaceAlliance>(
                        { name: interaction.options.getString("faction") }
                    );

                if (!alliance) {
                    await interaction.reply({
                        content: `Alliance with faction \`${interaction.options.getString(
                            "faction"
                        )}\` not found.`,
                        ephemeral: true,
                    });
                    return;
                }

                const template: Template = {
                    name: interaction.options.getString("name"),
                    source: interaction.options.getString("source"),
                    x: interaction.options.getInteger("x"),
                    y: interaction.options.getInteger("y"),
                    custom: true,
                };

                alliance.templates.push(template);

                await services.database.collections.rplaceAlliances.updateOne(
                    { name: alliance.name },
                    { $set: alliance }
                );

                const embed = await embedAlliance(alliance, interaction);

                await interaction.reply({
                    content: `Custom template \`${template.name}\` added to alliance with faction \`${alliance.name}\`.`,
                    embeds: embed,
                });
            } else if (interaction.options.getSubcommand() === "customdelete") {
                const alliance =
                    await services.database.collections.rplaceAlliances.findOne<rplaceAlliance>(
                        { name: interaction.options.getString("faction") }
                    );

                if (!alliance) {
                    await interaction.reply({
                        content: `Alliance with faction \`${interaction.options.getString(
                            "faction"
                        )}\` not found.`,
                        ephemeral: true,
                    });
                    return;
                }

                const template = alliance.templates.find(
                    (t) => t.name === interaction.options.getString("name")
                );

                if (!template) {
                    await interaction.reply({
                        content: `Template with name \`${interaction.options.getString(
                            "name"
                        )}\` not found.`,
                        ephemeral: true,
                    });
                    return;
                }

                if (template.custom === false) {
                    await interaction.reply({
                        content: `Template with name \`${interaction.options.getString(
                            "name"
                        )}\` is not a custom template.`,
                        ephemeral: true,
                    });
                    return;
                }

                alliance.templates.splice(
                    alliance.templates.indexOf(template),
                    1
                );

                await services.database.collections.rplaceAlliances.updateOne(
                    { name: alliance.name },
                    { $set: alliance }
                );

                const embed = await embedAlliance(alliance, interaction);

                await interaction.reply({
                    content: `Custom template \`${template.name}\` deleted from alliance with faction \`${alliance.name}\`.`,
                    embeds: embed,
                });
            } else if (interaction.options.getSubcommand() === "customedit") {
                const alliance =
                    await services.database.collections.rplaceAlliances.findOne<rplaceAlliance>(
                        { name: interaction.options.getString("faction") }
                    );

                if (!alliance) {
                    await interaction.reply({
                        content: `Alliance with faction \`${interaction.options.getString(
                            "faction"
                        )}\` not found.`,
                        ephemeral: true,
                    });
                    return;
                }

                const template = alliance.templates.find(
                    (t) => t.name === interaction.options.getString("name")
                );

                if (!template) {
                    await interaction.reply({
                        content: `Template with name \`${interaction.options.getString(
                            "name"
                        )}\` not found.`,
                        ephemeral: true,
                    });
                    return;
                }

                if (template.custom === false) {
                    await interaction.reply({
                        content: `Template with name \`${interaction.options.getString(
                            "name"
                        )}\` is not a custom template.`,
                        ephemeral: true,
                    });
                    return;
                }

                const newTemplate = {
                    name: interaction.options.getString("name"),
                    source:
                        interaction.options.getString("source") ||
                        template.source,
                    x: interaction.options.getInteger("x") || template.x,
                    y: interaction.options.getInteger("y") || template.y,
                    custom: true,
                };

                alliance.templates[alliance.templates.indexOf(template)] =
                    newTemplate;

                await services.database.collections.rplaceAlliances.updateOne(
                    { name: alliance.name },
                    { $set: alliance }
                );

                const embed = await embedAlliance(alliance, interaction);

                await interaction.reply({
                    content: `Custom template \`${template.name}\` edited in alliance with faction \`${alliance.name}\`.`,
                    embeds: embed,
                });
            } else {
                await interaction.reply({
                    content: "Invalid subcommand.",
                    ephemeral: true,
                });
            }
        }
    }
}

// TODO: support for more then 10 embeds
async function embedAlliance(
    alliance: rplaceAlliance,
    interaction: ChatInputCommandInteraction
) {
    const invite = await interaction.client.fetchInvite(alliance.inviteUrl);

    const embeds: EmbedBuilder[] = [];
    const embed = new EmbedBuilder()
        .setColor(0x72bfed)
        .setTitle("Alliance Info")
        .setDescription(
            `Faction Name: \`${alliance.name}\`\nServer Invite: [${invite.code}](${invite.url})\nTicket Channel: <#${alliance.ticket}>`
        )
        .setFields([
            {
                name: "Their Diplomats",
                value: alliance.theirDiplos
                    .map((diplo) => `<@${diplo}>`)
                    .join(", "),
                inline: true,
            },
            {
                name: "Our Diplomats",
                value: alliance.ourDiplos
                    .map((diplo) => `<@${diplo}>`)
                    .join(", "),
                inline: true,
            },
        ])
        .setThumbnail(invite.guild.iconURL());

    embeds.push(embed);

    for (const template of alliance.templates) {
        const coord = `Coordinates: [\`(${template.x}, ${template.y})\`](https://www.reddit.com/r/place/&cx=${template.x}&cy=${template.y})`;

        const templateEmbed = new EmbedBuilder()
            .setColor(0x72bfed)
            .setTitle(template.name)
            .setDescription(
                template.custom
                    ? coord
                    : `Endu Template: [Link](${alliance.enduTemplate})\n${coord}`
            )
            .setFooter({
                text: template.custom ? "Custom Template" : "Endu Template",
            })
            .setImage(template.source);

        embeds.push(templateEmbed);

        if (embeds.length === 10) {
            break;
        }
    }

    if (embeds.length === 1) {
        const emptyEmbed = new EmbedBuilder()
            .setColor(0x72bfed)
            .setDescription(
                "No templates found. Add an Endu template with `/rplace alliance edit` or a custom template with `/rplace alliance customadd`."
            );
    }

    return embeds;
}

async function parseEndu(endu: string, faction: string, services: Services) {
    const response = await fetch(endu)
        .then((response) => {
            return response.json();
        })
        .catch(() => {
            return;
        });

    if (!response) {
        return;
    }

    const unparsedTemplates = response.templates;
    const templates: Template[] = [];

    for (const template of unparsedTemplates) {
        templates.push({
            name: template.name,
            source: template.sources[0],
            x: template.x,
            y: template.y,
            custom: false,
        });
    }

    // fetch custom templates
    const alliance =
        await services.database.collections.rplaceAlliances.findOne<rplaceAlliance>(
            { name: faction }
        );

    if (!alliance) {
        return templates;
    }

    for (const template of alliance.templates) {
        if (template.custom) {
            templates.push(template);
        }
    }

    return templates;
}
