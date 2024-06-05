import { THH_SERVER_ID } from "../constants";

export function isTHHorDevServer(guildId: string) {
    return (process.env.DEVELOPMENT_GUILD ?? "") != "" ?
        (guildId == process.env.DEVELOPMENT_GUILD) :
        (guildId == THH_SERVER_ID)
}