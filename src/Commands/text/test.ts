import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class HideCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("test")
        .setDescription("Testing command for development!")
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        console.log(await services.analytics.getGlobal());
        console.log(await services.analytics.getTemplate("bluey"));
        console.log(await services.analytics.getUser("bluey", "87b6bc6b-1d86-4dbc-b3ab-8d80e18c9b4b"));
    }
}