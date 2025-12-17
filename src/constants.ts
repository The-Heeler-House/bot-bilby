import config from "config"

export const roleIds = {
    helperInTraining: config.get<string>("roleIds.helperInTraining"),
    staff: config.get<string>("roleIds.staff"),
    helper: config.get<string>("roleIds.helper"),
    mod: config.get<string>("roleIds.mod"),
    leadership: config.get<string>("roleIds.leadership"),
    verifying: config.get<string>("roleIds.verifying"),
    newbie: config.get<string>("roleIds.newbie"),
    fan: config.get<string>("roleIds.fan")
}

export const channelIds = {
    offTopic: config.get<string>("channelIds.offTopic"),
    staff: config.get<string>("channelIds.staff"),
    bilby: config.get<string>("channelIds.bilby"),
    chatLog: config.get<string>("channelIds.chatLog"),
    mediaLog: config.get<string>("channelIds.mediaLog"),
    memberLog: config.get<string>("channelIds.memberLog"),
    reactionLog: config.get<string>("channelIds.reactionLog"),
    announcements: config.get<string>("channelIds.announcements")
}

export const channelCategoryIds = {
    staffPro: config.get<string>("channelCategoryIds.staffPro"),
    staffInfo: config.get<string>("channelCategoryIds.staffInfo"),
    leadership: config.get<string>("channelCategoryIds.leadership"),
}

export const devIds = config.get<string[]>("devIds")

export const THH_SERVER_ID = config.get<string>("serverId")

export const badWordFilter = {
    "match_all": ["fuck", "nigg", "fuk", "cunt", "cnut", "bitch", "dick", "d1ck", "pussy", "asshole", "b1tch", "b!tch", "blowjob", "c0ck", "hentai", "nigga", "nigger", "faggot", "vagina", "penis", "genital", "nlgga", "nlgger", "gringo", "chink", "porn", "p0rn", "shagger", "clit", "erotic", "ejaculate", "fellatio"],
    "match_exact": ["gyatt", "gyat", "nonce", "fetish", "shit", "ahegao", "anal", "arse", "ass", "arsehole", "arseholes", "arsenigga", "arsenigger", "arseniggers", "beaner", "bastard", "chink", "dyke", "fag", "vag", "tit", "tits", "titty", "tiddy", "titties", "tiddies", "coon", "c00n", "co0n", "coomer", "coom", "cum", "semen", "school shooting", "rape", "raped", "rapist", "raper", "r 34", "r34", "e621", "sex", "sexy", "sexual", "sext", "sexting", "slut", "sluts", "whore", "whores", "thot", "wanking", "wetback", "wetbacks", "jizz", "retard", "retarded", "beaners", "kaffir", "kaffirs", "lezzie", "wanker", "cock", "cocksucker", "cocksuckers", "cocks", "cums", "cumdump", "cumdumpster", "loli", "lolicon", "shota", "shotacon", "nigr", "ngr", "niga", "nigas", "niger", "nigers", "nigguh", "niguh", "gook", "gooky", "gooks", "punani", "poonani", "gringo", "gringos", "gringoz", "gringoes", "prick", "school shooter", "zipperhead", "zipperheads", "zipperheadz", "tacohead", "towelhead", "tacoheads", "towelheads", "pedophile", "paedophile", "pedos", "pedo", "testes", "testicles", "spic", "spick", "kike", "twat", "cooch", "coochie", "smegma", "nipple", "nipples", "neeples", "neeple", "taint", "twink", "twinks", "milf", "dilf", "douche", "douchebag", "douches", "tard", "smut", "orgasm", "orgasms", "orgasmed", "stripper", "strip club", "stripclub", "vulva", "dildo", "dild0", "d1ldo", "d1ld0", "dildos", "bukkake", "fleshlight", "buttplug", "butt plug", "bondage", "masturbate", "masturbating", "masturbation", "negro", "molest", "molested", "blow job", "blowjob", "carpet muncher", "carpetmuncher", "chode", "jackoff", "jack off", "jerkoff", "jerk off", "jerking off", "jacking off", "scrote", "scrotum", "kys", "kill yourself", "kill your self", "maga", "necrophile", "necrophilia", "child predator", "smd", "yiff", "merde", "puta", "cabron", "cojone", "cojones", "chinga", "chingar", "chingchong", "ching chong", "mierda", "putain", "connard", "cyka", "blyat", "xyn", "perra", "zorra", "guarra", "asquerosa", "maricon", "marica"]
}