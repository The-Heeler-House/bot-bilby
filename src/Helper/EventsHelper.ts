import { THH_SERVER_ID } from "../constants";

export function isTHHorDevServer(guildId: string) {
    return guildId == THH_SERVER_ID
}