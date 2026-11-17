import config from "config";

export const roleIds = {
    helperInTraining: config.get<string>("roleIds.helperInTraining"),
    staff: config.get<string>("roleIds.staff"),
    helper: config.get<string>("roleIds.helper"),
    mod: config.get<string>("roleIds.mod"),
    leadership: config.get<string>("roleIds.leadership"),
    headMod: config.get<string>("roleIds.headMod"),
    admin: config.get<string>("roleIds.admin"),
    newbie: config.get<string>("roleIds.newbie"),
    fan: config.get<string>("roleIds.fan"),
};

export const channelIds = {
    offTopic: config.get<string>("channelIds.offTopic"),
    staff: config.get<string>("channelIds.staff"),
    bilby: config.get<string>("channelIds.bilby"),
    chatLog: config.get<string>("channelIds.chatLog"),
    mediaLog: config.get<string>("channelIds.mediaLog"),
    memberLog: config.get<string>("channelIds.memberLog"),
    reactionLog: config.get<string>("channelIds.reactionLog"),
    announcements: config.get<string>("channelIds.announcements"),
    leadershipPings: config.get<string>("channelIds.leadershipPings"),
};

export const channelCategoryIds = {
    staffPro: config.get<string>("channelCategoryIds.staffPro"),
    staffInfo: config.get<string>("channelCategoryIds.staffInfo"),
    leadership: config.get<string>("channelCategoryIds.leadership"),
};

export const devIds = config.get<string[]>("devIds");

export const THH_SERVER_ID = config.get<string>("serverId");

/**
 * How long data derived from Discord may be kept outside of Discord, in days.
 *
 * This bounds the archived media bucket and the tracked message snapshots in
 * the state file. It is the retention window published in PRIVACY.md and
 * declared on our privileged intent request, so changing it here means
 * changing it in both of those places too.
 */
export const DATA_RETENTION_DAYS = 30;
