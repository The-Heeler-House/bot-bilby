import { Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds, channelIds } from "../../constants";
import { StockSetting, stocks } from "../../Services/Database/models/april2025";

export default class April2025Command extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("admin2025")
        .setDescription("Admin dashboard for april2025.")
        .addAllowedRoles(roleIds.staff)
        .addStringArgument("ticker", "The ticker of the stock to edit", false)
        .addImplicitStringArgument("setting", "The setting to edit", false)
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        let channel = await message.channel as TextChannel;        

        const stock = await services.database.collections.settings.findOne({ ticker: args.ticker as stocks });
        console.log(args.setting)
        if (!stock || args.setting == undefined) {
            // just show the current settings
            let stockSettings = await services.database.collections.settings.find().toArray();
            let settings = stockSettings.map(stock => {
                return `## \`$${stock.ticker}\`\n${Object.entries(stock)
                    .filter(([key]) => key !== "_id" && key !== "ticker")
                    .map(([key, value]) => `${key}: **${value}**`)
                    .join("\n")}`;
            });

            const helpMessage = `Edit a stock setting by using: \`bilby, admin2025 <ticker> <setting> <value>\``;
            await channel.send(settings.join("\n\n") + "\n\n" + helpMessage);
            return;
        }   
        let number = args.setting.split(" ")[1]
        const value = parseFloat(number);

        const setting = args.setting.split(" ")[0] as keyof StockSetting;

        if (!stock) {
            await channel.send("Invalid ticker.");
        }

        if (isNaN(value)) {
            await channel.send("Value must be a number.");
        }

        if (!Object.keys(stock).includes(setting)) {
            await channel.send("Invalid setting.");
        }

        await services.database.collections.settings.updateOne({ ticker: args.ticker as stocks }, { $set: { [setting]: value } });
        await channel.send(`Set **${setting}** for \`$${args.ticker}\` to **${value}**.`);
    }
}