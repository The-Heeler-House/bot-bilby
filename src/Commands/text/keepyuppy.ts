import { Attachment, AttachmentBuilder, Message } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import path from "path";
import keepyUppyMap from "../../Assets/keepyuppy-data/map.json"
import sharp from "sharp";

/**
    state:
        \- off ground (implied)
        \- missed (almost_on_ground)
        \- blow balloon (blown_by_fan)
        \- land on cup

    boop -> 95% balloon out of ground, 5% missed
    fan -> 80% blow balloon, 20% balloon out of ground

    boop | (missed) -> 50% balloon out of ground, 50% pop
    boop | (blow balloon) -> 40% balloon out of ground, 45% land on cup, 15% pop
    boop | (land on cup) -> 85% balloon out of ground, 15% pop

    fan | (missed) -> boop | (missed)
    fan | (blow balloon) -> 60% fan, 10% do nothing, 30% pop
    fan | (land on cup) -> 85% pop, 15% do nothing
 */

const keepyUppyGameData = path.join(__dirname, "../../Assets/keepyuppy-data")
const randomChoice = function<T>(arr: T[]) {
    return arr[Math.floor(Math.random() * arr.length)]
}

export default class KeepyUppyCommand extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("kp")
        .setDescription("Keepy Uppy!")
        .addStringArgument("action", "Specify action to do.")
        .allowInDMs(false);

    async execute(message: Message, args: { [key: string]: string }, services: Services) {
        const keepyUppyCollection = services.database.collections.keepyUppy

        const keepyUppyDbData = await keepyUppyCollection.findOne({ channel: message.channelId })
        if (!keepyUppyDbData) return

        const respond_boop = async () => {
            await keepyUppyCollection.updateOne({ channel: message.channelId }, { $set: { "balloon_state": "off_ground" } })
            let msg = ""
            switch (keepyUppyDbData.balloon_state) {
                case "off_ground":
                    msg = "*boop*"
                    break
                case "almost_on_ground":
                    msg = "*boop*\nPhew! That was close."
                    break
                case "blown_by_fan":
                    msg = "*boop*\nCatched!"
                    break
            }
            await message.reply({
                content: msg,
                files: [
                    new AttachmentBuilder(
                        await sharp(`${keepyUppyGameData}/${randomChoice<string>(keepyUppyMap.boop)}`)
                            .resize(160, 160, { fit: "inside" })
                            .toBuffer(),
                        { name: "boop.png" }
                    )
                ]
            })
        }

        const respond_missed = async () => {
            await keepyUppyCollection.updateOne({ channel: message.channelId }, { $set: { "balloon_state": "almost_on_ground" } })
            await message.reply({
                content: "Oh no! You missed, and it's falling to the ground!",
                files: [
                    new AttachmentBuilder(
                        await sharp(`${keepyUppyGameData}/${randomChoice<string>(keepyUppyMap.on_air)}`)
                            .resize(160, 160, { fit: "inside" })
                            .toBuffer(),
                        { name: "missed.png" }
                    )
                ]
            })
        }

        const respond_pop = async () => {
            await keepyUppyCollection.updateOne({ channel: message.channelId }, {
                $set: {
                    "balloon_state": "popped",
                    "currentStreak": 0
                },
                $max: {
                    "longestStreak": keepyUppyDbData.currentStreak
                }
            })
            await message.reply({
                content: "https://tenor.com/view/bluey-keepy-uppy-balloon-family-bingo-gif-19219146",
            })
            await message.reply(`Game over! This balloon has managed to survive a total of ${keepyUppyDbData.currentStreak}. Longest streak set was ${Math.max(keepyUppyDbData.currentStreak, keepyUppyDbData.longestStreak)}. To restart, run \`kp restart\``)
        }

        const respond_land_on_cup = async () => {
            await keepyUppyCollection.updateOne({ channel: message.channelId }, { $set: { "balloon_state": "land_on_cup" } })
            await message.reply({
                content: "*plop*\nBalloon has managed to land on a cup! Quick, boop it before someone blow a fan on it! But be careful, cause your boop can also make it fall down!",
                files: [
                    new AttachmentBuilder(
                        await sharp(`${keepyUppyGameData}/${randomChoice<string>(keepyUppyMap.on_cup)}`)
                            .resize(160, 160, { fit: "inside" })
                            .toBuffer(),
                        { name: "on_cup.png" }
                    )
                ]
            })
        }

        const respond_blow = async () => {
            await keepyUppyCollection.updateOne({ channel: message.channelId }, { $set: { "balloon_state": "blown_by_fan" } })
            await message.reply({
                content: "*woosh*\nBalloon has flown into a different place!",
                files: [
                    new AttachmentBuilder(
                        await sharp(`${keepyUppyGameData}/${randomChoice<string>(keepyUppyMap.fan)}`)
                            .resize(160, 160, { fit: "inside" })
                            .toBuffer(),
                        { name: "fan.png" }
                    )
                ]
            })
        }

        const respond_fail_blow = async () => {
            await message.reply({
                content: "Woops, the fan just lost power! Balloon is in the same position!",
            })
        }

        const action_boop = async () => {
            const chance = Math.random()
            switch (keepyUppyDbData.balloon_state) {
                case "off_ground":
                    if (chance < 0.95) await respond_boop()
                    else await respond_missed()
                    break
                case "almost_on_ground":
                    if (chance < 0.5) await respond_boop()
                    else await respond_pop()
                    break
                case "blown_by_fan":
                    if (chance < 0.4) await respond_boop()
                    else if (chance < 0.85) respond_land_on_cup()
                    else await respond_pop()
                    break
                case "land_on_cup":
                    if (chance < 0.85) await respond_boop()
                    else await respond_pop()
                    break
                case "popped":
                    break
            }
        }

        const action_fan = async () => {
            const chance = Math.random()
            switch (keepyUppyDbData.balloon_state) {
                case "off_ground":
                    if (chance < 0.8) await respond_blow()
                    else await respond_fail_blow()
                    break
                case "almost_on_ground":
                    if (chance < 0.5) await respond_boop()
                    else await respond_pop()
                    break
                case "blown_by_fan":
                    if (chance < 0.6) await respond_blow()
                    else if (chance < 0.7) await respond_fail_blow()
                    else await respond_pop()
                    break
                case "land_on_cup":
                    if (chance < 0.85) await respond_pop()
                    else await respond_fail_blow()
                    break
                case "popped":
                    break
            }
        }

        await keepyUppyCollection.updateOne({ channel: message.channelId }, { $inc: { currentStreak: 1 } })
        switch (args["action"].toLowerCase().trim().normalize()) {
            case "boop":
                await action_boop()
                break
            case "fan":
                await action_fan()
                break
            case "restart":
                if (keepyUppyDbData.balloon_state != "popped") {
                    await message.reply("You cannot restart an ongoing session!")
                } else {
                    await keepyUppyCollection.updateOne({ channel: message.channelId }, { $set: { "balloon_state": "off_ground" } })
                    await respond_boop()
                }
                break
            default:
                await message.reply("No action or invalid action specified! Use `kp boop` to boop the balloon and `kp fan` to use the fan.")
                break
        }
    }
}