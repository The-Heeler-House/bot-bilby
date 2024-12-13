import {EmbedBuilder, Message } from "discord.js";
import { Services } from "../../Services";
import os from "os";
import TextCommand, { TextCommandBuilder } from "../TextCommand";

function displayTime(date: number) {
    var s = Math.floor(date / 1000),
        m = Math.floor(s / 60),
        h = Math.floor(m / 60),
        d = Math.floor(h / 24)

    var result = "", result_arr = [
        `${d} days`,
        `${h % 24} hours`,
        `${m % 60} minutes`,
        `${s % 60} seconds`,
    ]

    result = result_arr.slice(0, result_arr.length - 1).join(", ")
        + ((result_arr.length > 1) ? " and " : "")
        + result_arr[result_arr.length - 1]

    return result
}

function getCPUUsage(): Promise<{idle: number, total: number}> {
    return new Promise((res, rej) => {
        const getStat = () => { return {
            idle: os.cpus().map(v => v.times.idle).reduce((a, b) => a + b),
            total: os.cpus().map(v =>
                v.times.user +
                v.times.nice +
                v.times.irq +
                v.times.sys +
                v.times.idle
            ).reduce((a, b) => a + b)
        }}

        const prevStat = getStat()

        setTimeout(() => {
            const newStat = getStat()
            res({
                idle: newStat.idle - prevStat.idle,
                total: newStat.total - prevStat.total
            })
        }, 1000)
    })
}

export default class StatusCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("status")
        .setDescription("Get the current status of the bot and the server.")

    async execute(message: Message, args: { [key: string]: string }, services: Services): Promise<void> {
        const serverUsedMem = Math.round((os.totalmem() - os.freemem()) / 1024 / 1024)
        const serverTotalMem = Math.round(os.totalmem() / 1024 / 1024)
        const processUsedMem = Math.round(process.memoryUsage().rss / 1024 / 1024)
        const cpu = await getCPUUsage()

        const OUTPUT = [
            "- **Bot Status:**",
            `  - Currently running: \`NodeJS v${process.versions.node} (module version ${process.versions.modules})\``,
            `  - Bot uptime: \`${displayTime(process.uptime() * 1000)}\``,
            `  - Memory usage: \`${processUsedMem}MB\``,
            "- **Server Status:**",
            `  - Server uptime: \`${displayTime(os.uptime() * 1000)}\``,
            `  - CPU usage: \`${((1 - cpu.idle / cpu.total) * 100).toFixed(2)}%\``,
            `  - Memory usage: \`${serverUsedMem}MB / ${serverTotalMem}MB\``
        ]

        const UPTIME_EMBED = new EmbedBuilder()
            .setColor(0x72bfed)
            .setDescription(OUTPUT.join("\n"))
            .setTimestamp()

        await message.reply({
            embeds: [UPTIME_EMBED],
        })
    }
}