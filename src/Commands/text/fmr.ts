import { Message, MessageFlags } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class PingCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("fmr")
        .addAllowedRoles(roleIds.mod)
        .allowInDMs(false);

    async execute(
        message: Message,
        args: { [key: string]: string },
        services: Services,
    ) {
        const moderationRules =
            await message.guild?.autoModerationRules.fetch();
        if (!moderationRules) return;
        await message.reply({
            files: [
                {
                    attachment: Buffer.from(
                        JSON.stringify(moderationRules.toJSON(), null, 4),
                        "utf-8",
                    ),
                    name: "moderationRules.json",
                },
            ],
            content: "dumped",
        });
    }
}
