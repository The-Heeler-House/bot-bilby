import * as devConstants from '../testingIds.json';

export const roleIds = {
    helperInTraining: devConstants.roleIds.helperInTraining || "1102308206430134312",
    staff: devConstants.roleIds.staff || "1073391142881722400",
    helper: devConstants.roleIds.helper || "1079592438819205130",
    mod: devConstants.roleIds.mod || "960044331572547654",
    leadership: devConstants.roleIds.leadership || "1073388656183742514",
    verifying: devConstants.roleIds.verifying || "1011128096520417380",
    newbie: devConstants.roleIds.newbie || "1272596845540933713",
    fan: devConstants.roleIds.fan || "961101330141814815"
}

export const channelIds = {
    offTopic: devConstants.channelIds.offTopic || "962936076404686859",
    staff: devConstants.channelIds.staff || "1263106351878508657",
    bilby: devConstants.channelIds.bilby || "966921162804301824",
    chatLog: devConstants.channelIds.chatLog || "961201095038873630",
    mediaLog: devConstants.channelIds.mediaLog || "1098673855809204294",
    reactionLog: devConstants.channelIds.reactionLog || "1241199271022301266",
    announcements: devConstants.channelIds.announcements || "961056736398172200"
}

export const devIds = devConstants.devIds || [ "186730180872634368", "763377551963717653", "640921495245422632" ];

export const THH_SERVER_ID = "959534476520730724"

export const badWordRegex = /(.*fuck.*)|(.*nigg.*)|(.*fuk.*)|(.*cunt.*)|(.*cnut.*)|(.*bitch.*)|(.*dick.*)|(.*d1ck.*)|(.*pussy.*)|(.*asshole.*)|(.*b1tch.*)|(.*b!tch.*)|(.*blowjob.*)|(.*c0ck.*)|(.*hentai.*)|(.*nigga.*)|(.*nigger.*)|(.*faggot.*)|(.*vagina.*)|(.*penis.*)|(.*genital.*)|(.*nlgga.*)|(.*nlgger.*)|(.*gringo.*)|(.*chink.*)|(.*porn.*)|(.*p0rn.*)|(.*shagger.*)|(.*clit.*)|(.*erotic.*)|(.*ejaculate.*)|(.*fellatio.*)|(gyatt)|(gyat)|(nonce)|(fetish)|(shit)|(ahegao)|(anal)|(arse)|(ass)|(arsehole)|(arseholes)|(arsenigga)|(arsenigger)|(arseniggers)|(beaner)|(bastard)|(chink)|(dyke)|(fag)|(vag)|(tit)|(tits)|(titty)|(tiddy)|(titties)|(tiddies)|(coon)|(c00n)|(co0n)|(coomer)|(coom)|(cum)|(semen)|(school shooting)|(rape)|(raped)|(rapist)|(raper)|(r 34)|(r34)|(e621)|(sex)|(sexy)|(sexual)|(sext)|(sexting)|(slut)|(sluts)|(whore)|(whores)|(thot)|(wanking)|(wetback)|(wetbacks)|(jizz)|(retard)|(retarded)|(beaners)|(kaffir)|(kaffirs)|(lezzie)|(wanker)|(cock)|(cocksucker)|(cocksuckers)|(cocks)|(cums)|(cumdump)|(cumdumpster)|(loli)|(lolicon)|(shota)|(shotacon)|(nigr)|(ngr)|(niga)|(nigas)|(niger)|(nigers)|(nigguh)|(niguh)|(gook)|(gooky)|(gooks)|(punani)|(poonani)|(gringo)|(gringos)|(gringoz)|(gringoes)|(prick)|(school shooter)|(zipperhead)|(zipperheads)|(zipperheadz)|(tacohead)|(towelhead)|(tacoheads)|(towelheads)|(pedophile)|(paedophile)|(pedos)|(pedo)|(testes)|(testicles)|(spic)|(spick)|(kike)|(twat)|(cooch)|(coochie)|(smegma)|(nipple)|(nipples)|(neeples)|(neeple)|(taint)|(twink)|(twinks)|(milf)|(dilf)|(douche)|(douchebag)|(douches)|(tard)|(smut)|(orgasm)|(orgasms)|(orgasmed)|(stripper)|(strip club)|(stripclub)|(vulva)|(dildo)|(dild0)|(d1ldo)|(d1ld0)|(dildos)|(bukkake)|(fleshlight)|(buttplug)|(butt plug)|(bondage)|(masturbate)|(masturbating)|(masturbation)|(negro)|(molest)|(molested)|(blow job)|(blowjob)|(carpet muncher)|(carpetmuncher)|(chode)|(jackoff)|(jack off)|(jerkoff)|(jerk off)|(jerking off)|(jacking off)|(scrote)|(scrotum)|(kys)|(kill yourself)|(kill your self)|(maga)|(necrophile)|(necrophilia)|(child predator)|(smd)|(yiff)|(merde)|(puta)|(cabron)|(cojone)|(cojones)|(chinga)|(chingar)|(chingchong)|(ching chong)|(mierda)|(putain)|(connard)|(cyka)|(blyat)|(xyn)|(perra)|(zorra)|(guarra)|(asquerosa)|(maricon)|(marica)/m