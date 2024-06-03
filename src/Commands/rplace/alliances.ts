import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { Services } from "../../Services";
import rplaceAlliance, { Template } from "../../Services/Database/models/rplaceAlliance";

async function createAlliance(interaction: ChatInputCommandInteraction, services: Services) {
    const templates = await parseEndu(interaction.options.getString("template"), interaction.options.getString("faction"), services)
        .catch(() => {
            interaction.reply({ content: "Failed to parse link. Check if the template is Endu compliant.", ephemeral: true });
            return;
        });

    const invite = await interaction.client.fetchInvite(interaction.options.getString("invite"))
        .catch(() => {
            interaction.reply({ content: "Failed to fetch. Bad Invite.", ephemeral: true });
            return;
        });

    if (!invite) {
        interaction.reply({ content: "Failed to fetch. Bad Invite.", ephemeral: true });
        return;
    }
    
    const alliance : rplaceAlliance = {
        name: interaction.options.getString("faction"),
        templates: templates || [],
        enduTemplate: interaction.options.getString("template"),
        inviteUrl: invite.url,
        theirDiplos: [interaction.options.getUser("theirdiplo").id],
        ourDiplos: [interaction.options.getUser("ourdiplo").id],
        ticket: interaction.channelId
    }

    await services.database.collections.rplaceAlliances.insertOne(alliance);

    const embed = await embedAlliance(alliance, interaction);

    await interaction.reply({ content: `Alliance with faction \`${alliance.name}\` created.`, embeds: embed });
}

async function editAlliance(interaction: ChatInputCommandInteraction, services: Services) {
    const alliance = await services.database.collections.rplaceAlliances.findOne<rplaceAlliance>({ name: interaction.options.getString("faction") });

    if (!alliance) {
        await interaction.reply({ content: `Alliance with faction \`${interaction.options.getString("faction")}\` not found.`, ephemeral: true });
        return;
    }

    const templates = await parseEndu(interaction.options.getString("template"), alliance.name, services)
        .catch(() => {
            interaction.reply({ content: "Failed to parse link. Check if the template is Endu compliant.", ephemeral: true });
            return;
        });

    const invite = await interaction.client.fetchInvite(interaction.options.getString("invite"))
        .catch(() => {
            interaction.reply({ content: "Failed to fetch. Bad invite.", ephemeral: true });
            return;
        });
    
    const newAlliance : rplaceAlliance = {
        name: alliance.name,
        templates: templates || alliance.templates,
        enduTemplate: interaction.options.getString("template") || alliance.enduTemplate,
        inviteUrl: (invite && invite.url) || alliance.inviteUrl,
        theirDiplos: [interaction.options.getUser("theirdiplo")?.id || alliance.theirDiplos[0]],
        ourDiplos: [interaction.options.getUser("ourdiplo")?.id || alliance.ourDiplos[0]],
        ticket: interaction.channelId || alliance.ticket
    }

    await services.database.collections.rplaceAlliances.updateOne({ name: alliance.name }, { $set: newAlliance });

    const embed = await embedAlliance(newAlliance, interaction);

    await interaction.reply({ content: `Alliance with faction \`${alliance.name}\` edited.`, embeds: embed });

}

async function deleteAlliance(interaction: ChatInputCommandInteraction, services: Services) {
    const alliance = await services.database.collections.rplaceAlliances.findOne<rplaceAlliance>({ name: interaction.options.getString("faction") });

    if (!alliance) {
        await interaction.reply({ content: `Alliance with faction \`${interaction.options.getString("faction")}\` not found.`, ephemeral: true });
        return;
    }

    await services.database.collections.rplaceAlliances.deleteOne({ name: alliance.name });

    await interaction.reply({ content: `Alliance with faction \`${alliance.name}\` deleted.` });
}

async function infoAlliance(interaction: ChatInputCommandInteraction, services: Services) {
    const alliance = await services.database.collections.rplaceAlliances.findOne<rplaceAlliance>({ name: interaction.options.getString("faction") });

    if (!alliance) {
        await interaction.reply({ content: `Alliance with faction \`${interaction.options.getString("faction")}\` not found.`, ephemeral: true });
        return;
    }

    const embed = await embedAlliance(alliance, interaction);

    await interaction.reply({ embeds: embed });
}

async function listAlliances(interaction: ChatInputCommandInteraction, services: Services) {
    const alliances = await services.database.collections.rplaceAlliances.find().toArray();

    const embed = new EmbedBuilder()
        .setColor(0x72bfed)
        .setTitle("Bluey's r/Place Alliances")
        .setDescription(`${alliances.map(alliance => "\`"+ alliance.name +"\`").join(", ") || "No alliances found. Add one with `/rplace alliance create`."}`);

    await interaction.reply({ embeds: [embed] });
}

async function addCustomTemplate(interaction: ChatInputCommandInteraction, services: Services) {
    const alliance = await services.database.collections.rplaceAlliances.findOne<rplaceAlliance>({ name: interaction.options.getString("faction") });

    if (!alliance) {
        await interaction.reply({ content: `Alliance with faction \`${interaction.options.getString("faction")}\` not found.`, ephemeral: true });
        return;
    }

    const template : Template = {
        name: interaction.options.getString("name"),
        source: interaction.options.getString("source"),
        x: interaction.options.getInteger("x"),
        y: interaction.options.getInteger("y"),
        custom: true
    }

    alliance.templates.push(template);

    await services.database.collections.rplaceAlliances.updateOne({ name: alliance.name }, { $set: alliance });

    const embed = await embedAlliance(alliance, interaction);

    await interaction.reply({ content: `Custom template \`${template.name}\` added to alliance with faction \`${alliance.name}\`.`, embeds: embed });
}

async function deleteCustomTemplate(interaction: ChatInputCommandInteraction, services: Services) {
    const alliance = await services.database.collections.rplaceAlliances.findOne<rplaceAlliance>({ name: interaction.options.getString("faction") });

    if (!alliance) {
        await interaction.reply({ content: `Alliance with faction \`${interaction.options.getString("faction")}\` not found.`, ephemeral: true });
        return;
    }

    const template = alliance.templates.find(t => t.name === interaction.options.getString("name"));

    if (!template) {
        await interaction.reply({ content: `Template with name \`${interaction.options.getString("name")}\` not found.`, ephemeral: true });
        return;
    }

    if (template.custom === false) {
        await interaction.reply({ content: `Template with name \`${interaction.options.getString("name")}\` is not a custom template.`, ephemeral: true });
        return;
    }

    alliance.templates.splice(alliance.templates.indexOf(template), 1);

    await services.database.collections.rplaceAlliances.updateOne({ name: alliance.name }, { $set: alliance });

    const embed = await embedAlliance(alliance, interaction);

    await interaction.reply({ content: `Custom template \`${template.name}\` deleted from alliance with faction \`${alliance.name}\`.`, embeds: embed });
}

async function editCustomTemplate(interaction: ChatInputCommandInteraction, services: Services) {
    const alliance = await services.database.collections.rplaceAlliances.findOne<rplaceAlliance>({ name: interaction.options.getString("faction") });

    if (!alliance) {
        await interaction.reply({ content: `Alliance with faction \`${interaction.options.getString("faction")}\` not found.`, ephemeral: true });
        return;
    }

    const template = alliance.templates.find(t => t.name === interaction.options.getString("name"));

    if (!template) {
        await interaction.reply({ content: `Template with name \`${interaction.options.getString("name")}\` not found.`, ephemeral: true });
        return;
    }

    if (template.custom === false) {
        await interaction.reply({ content: `Template with name \`${interaction.options.getString("name")}\` is not a custom template.`, ephemeral: true });
        return;
    }

    const newTemplate = {
        name: interaction.options.getString("name"),
        source: interaction.options.getString("source") || template.source,
        x: interaction.options.getInteger("x") || template.x,
        y: interaction.options.getInteger("y") || template.y,
        custom: true
    }

    alliance.templates[alliance.templates.indexOf(template)] = newTemplate;

    await services.database.collections.rplaceAlliances.updateOne({ name: alliance.name }, { $set: alliance });

    const embed = await embedAlliance(alliance, interaction);

    await interaction.reply({ content: `Custom template \`${template.name}\` edited in alliance with faction \`${alliance.name}\`.`, embeds: embed });
}

// TODO: support for more then 10 embeds
async function embedAlliance(alliance: rplaceAlliance, interaction: ChatInputCommandInteraction) {
    const invite = await interaction.client.fetchInvite(alliance.inviteUrl)

    const embeds : EmbedBuilder[] = [];
    const embed = new EmbedBuilder()
        .setColor(0x72bfed)
        .setTitle("Alliance Info")
        .setDescription(`Faction Name: \`${alliance.name}\`\nServer Invite: [${invite.code}](${invite.url})\nTicket Channel: <#${alliance.ticket}>`)
        .setFields([{
            name: "Their Diplomats",
            value: alliance.theirDiplos.map(diplo => `<@${diplo}>`).join(", "),
            inline: true
        }, {
            name: "Our Diplomats",
            value: alliance.ourDiplos.map(diplo => `<@${diplo}>`).join(", "),
            inline: true
        }])
        .setThumbnail(invite.guild.iconURL());
    
    embeds.push(embed);

    for (const template of alliance.templates) {
        const coord = `Coordinates: [\`(${template.x}, ${template.y})\`](https://www.reddit.com/r/place/&cx=${template.x}&cy=${template.y})`

        const templateEmbed = new EmbedBuilder()
            .setColor(0x72bfed)
            .setTitle(template.name)
            .setDescription(template.custom ? coord : `Endu Template: [Link](${alliance.enduTemplate})\n${coord}`)
            .setFooter({
                text: template.custom ? "Custom Template" : "Endu Template"
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
            .setDescription("No templates found. Add an Endu template with `/rplace alliance edit` or a custom template with `/rplace alliance customadd`.");
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
    const templates : Template[] = [];

    for (const template of unparsedTemplates) {
        templates.push({
            name: template.name,
            source: template.sources[0],
            x: template.x,
            y: template.y,
            custom: false
        });
    }

    // fetch custom templates
    const alliance = await services.database.collections.rplaceAlliances.findOne<rplaceAlliance>({ name: faction });

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

export {
    createAlliance,
    editAlliance,
    deleteAlliance,
    infoAlliance,
    listAlliances,
    addCustomTemplate,
    deleteCustomTemplate,
    editCustomTemplate
}