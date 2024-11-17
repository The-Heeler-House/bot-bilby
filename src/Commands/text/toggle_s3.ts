import { Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class ToggleS3Command extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("toggle s3")
        .setDescription("Toggles the S3 container used for storing the attachments.")
        .addAllowedRoles(roleIds.staff)
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        let useS3 = !services.state.state.useS3;

        services.state.state.useS3 = useS3;
        services.state.save();

        await message.reply(`Successfully **${useS3 ? "enabled" : "disabled"}** the S3 container.`);
    }
}