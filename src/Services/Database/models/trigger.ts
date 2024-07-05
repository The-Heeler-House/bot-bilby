export default interface Trigger {
    trigger: string,
    response: string,
    cooldown: number,
    meta: {
        uses: number
    }
}