import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds } from "../../constants";

export default class TogglePagingCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("toggle page ping")
        .setDescription("Toggles whether the executor is pinged for Bot Bilby errors.")
        .addAllowedRoles(roleIds.staff)
        .addAllowedUsers("763377551963717653", "186730180872634368")
        .allowInDMs(false);

    async execute(message: Message, args: string[], services: Services) {
        if (services.state.state.pagedUsers.includes(message.author.id)) {
            services.state.state.pagedUsers = services.state.state.pagedUsers.filter(userid => userid != message.author.id);

            await message.reply("You will no longer be pinged (paged) for Bot Bilby errors.");
        } else {
            services.state.state.pagedUsers.push(message.author.id);

            await message.reply("You will now be pinged (paged) for Bot Bilby errors.");
        }
    }
}