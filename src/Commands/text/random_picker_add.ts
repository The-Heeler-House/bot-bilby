import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, Message, MessageFlags, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds, channelIds } from "../../constants";
import { randomUUID } from "crypto";

export default class RandomPickerAddCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("random picker add")
        .setDescription("Adds a random picker (aka. giveaway) to the current channel.")
        .addAllowedRoles(roleIds.mod)
        .addStringArgument("message", "The message in the picker.")
        .addStringArgument("winning_message", "Winning message.")
        .addNumberArgument("duration", "Duration to run the picker (in seconds).")
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        const pickerId = randomUUID()
        const beginTime = Math.round(Date.now() / 1000)
        await services.database.collections.randomPicker.insertOne({
            picker_id: pickerId,
            duration: Number(args["duration"]),
            winning_message: args["winning_message"],
            enrollments: []
        })

        const embedMaker = async () => {
            const cnt = await services.database.collections.randomPicker.aggregate([ { $match: { picker_id: pickerId } }, { $project: { length: { $size: "$enrollments" } } } ]).toArray()
            return new EmbedBuilder()
                .setTitle("Random Winner Picker!")
                .setDescription(`${args["message"]}\n\nNumber of people who entered: ${cnt[0]["length"]}\nTime left: <t:${beginTime + Number(args["duration"])}:R>`)
                .setColor(0xFFFFFF)
        }

        if (!message.channel.isSendable()) return
        const pollMessage = await message.channel.send({
            embeds: [
                await embedMaker()
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("enter")
                            .setLabel("Enter!")
                            .setStyle(ButtonStyle.Primary)
                    )
            ]
        })

        const buttonCollector = pollMessage.createMessageComponentCollector(
            {
                componentType: ComponentType.Button,
                time: Number(args["duration"]) * 1000
            }
        )

        buttonCollector.on("collect", async i => {
            if (i.customId != "enter") return

            if (await services.database.collections.randomPicker.findOne({ enrollments: i.user.id })) {
                await i.reply({
                    content: "Maximum entry reached!",
                    flags: [ MessageFlags.Ephemeral ]
                })
                return
            }

            await services.database.collections.randomPicker.updateOne({
                picker_id: pickerId,
            }, {
                $push: { enrollments: i.user.id }
            })

            await pollMessage.edit({
                embeds: [ await embedMaker() ]
            })
            await i.reply({
                content: "You have entered successfully!",
                flags: [ MessageFlags.Ephemeral ]
            })
        })

        buttonCollector.on("end", async i => {
            const result = await services.database.collections.randomPicker.findOne({ picker_id: pickerId })
            const winner = result.enrollments[Math.floor(Math.random() * result.enrollments.length)]

            await pollMessage.edit({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Winner!")
                        .setDescription(`Congratulation <@${winner}>!\n${result.winning_message}`)
                ],
                components: []
            })
            await pollMessage.reply(`<@${winner}>`)
            await services.database.collections.randomPicker.deleteOne({ picker_id: pickerId })
        })
    }
}