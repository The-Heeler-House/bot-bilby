import {
    Collection,
    EmbedBuilder,
} from "discord.js";
import { channelIds, THH_SERVER_ID, waffleChannelIds } from "../../../constants";

let nextId = 1;

function genId(prefix: string): string {
    nextId += 1;
    return `${prefix}_${nextId}`;
}

export class FakeDMChannel {
    public sent: any[] = [];

    async send(payload: any) {
        this.sent.push(payload);
        return payload;
    }
}

export class FakeUser {
    public dmChannel = new FakeDMChannel();
    public bot = false;
    public username: string;

    constructor(public id: string, username?: string) {
        this.username = username ?? `user_${id}`;
    }

    get tag(): string {
        return `${this.username}#0001`;
    }

    async createDM() {
        return this.dmChannel;
    }
}

export class FakeGuildMember {
    public roles: { cache: Collection<string, { id: string }> };
    public permissions: { has: (permission: string) => boolean };
    public moderatable = true;
    public timeoutMs: number | null = null;

    constructor(public user: FakeUser, roleIds: string[] = [], private admin = false) {
        this.roles = {
            cache: new Collection(roleIds.map(roleId => [roleId, { id: roleId }])),
        };
        this.permissions = {
            has: (permission: string) => permission === "Administrator" && this.admin,
        };
    }

    async timeout(ms: number) {
        this.timeoutMs = ms;
    }
}

export class FakeReaction {
    public partial = false;
    public users = {
        fetch: async () => this.userCache,
    };

    constructor(public emoji: { name: string }, public count = 1, public userCache = new Collection<string, FakeUser>()) {}

    async fetch() {
        return this;
    }
}

export class FakeMessage {
    public id = genId("msg");
    public reactions = { cache: new Collection<string, FakeReaction>() };
    public attachments = new Map();
    public embeds: EmbedBuilder[] = [];
    public partial = false;
    public member: FakeGuildMember | null = null;
    public editedPayloads: any[] = [];

    constructor(
        public channel: FakeTextChannel | FakeDMTextChannel,
        public author: FakeUser,
        public content = "",
        embeds: EmbedBuilder[] = [],
    ) {
        this.channelId = channel.id;
        this.guildId = channel.guild?.id ?? null;
        this.guild = channel.guild ?? null;
        this.embeds = embeds;
    }

    public channelId: string;
    public guildId: string | null;
    public guild: FakeGuild | null;

    async react(emoji: string) {
        const existing = this.reactions.cache.get(emoji);
        if (existing) {
            existing.count += 1;
            existing.userCache.set(this.channel.guild.client.ensureUser("bot").id, this.channel.guild.client.ensureUser("bot"));
        } else {
            const botUser = this.channel.guild.client.ensureUser("bot");
            this.reactions.cache.set(emoji, new FakeReaction({ name: emoji }, 1, new Collection([[botUser.id, botUser]])));
        }
        return this;
    }

    async edit(payload: any) {
        if (payload.content != null) this.content = payload.content;
        if (payload.embeds) this.embeds = payload.embeds;
        this.editedPayloads.push(payload);
        return this;
    }

    async fetch() {
        return this;
    }

    async reply(payload: any) {
        return this.channel.send(typeof payload === "string" ? { content: payload } : payload);
    }
}

export class FakeMessageManager {
    public cache = new Collection<string, FakeMessage>();

    async fetch(id: string) {
        return this.cache.get(id) ?? null;
    }
}

export class FakeTextChannel {
    public messages = new FakeMessageManager();
    public sentPayloads: any[] = [];

    constructor(public id: string, public guild: FakeGuild) {}

    async send(payload: any) {
        this.sentPayloads.push(payload);
        const botUser = this.guild.client.ensureUser("bot");
        botUser.bot = true;
        const message = new FakeMessage(this, botUser, payload.content ?? "", payload.embeds ?? []);
        this.messages.cache.set(message.id, message);
        return message;
    }
}

export class FakeDMTextChannel extends FakeTextChannel {
    constructor(id: string) {
        super(id, null as any);
        this.guild = null as any;
    }

    async send(payload: any) {
        this.sentPayloads.push(payload);
        const botUser = new FakeUser("bot", "bot");
        botUser.bot = true;
        const message = new FakeMessage(this, botUser, payload.content ?? "", payload.embeds ?? []);
        this.messages.cache.set(message.id, message);
        return message;
    }
}

export class FakeGuild {
    public channels: { cache: Collection<string, FakeTextChannel> };

    constructor(public id: string, public client: FakeClient) {
        this.channels = { cache: new Collection() };
    }
}

export class FakeClient {
    public users = {
        cache: new Collection<string, FakeUser>(),
        fetch: async (id: string) => this.ensureUser(id),
    };
    public guilds = { cache: new Collection<string, FakeGuild>() };

    ensureUser(id: string): FakeUser {
        let user = this.users.cache.get(id);
        if (!user) {
            user = new FakeUser(id);
            if (id === "bot") user.bot = true;
            this.users.cache.set(id, user);
        }
        return user;
    }
}

type InteractionReplyState = {
    replyPayload: any | null;
    replied: boolean;
    deferred: boolean;
};

function buildOptions(config: {
    subcommand?: string;
    subcommandGroup?: string;
    strings?: Record<string, string>;
    integers?: Record<string, number>;
    users?: Record<string, FakeUser>;
    focused?: string;
}) {
    return {
        getSubcommandGroup: (required?: boolean) => config.subcommandGroup ?? (required ? "" : null),
        getSubcommand: () => config.subcommand ?? "",
        getString: (name: string, required?: boolean) => config.strings?.[name] ?? (required ? "" : null),
        getInteger: (name: string, required?: boolean) => config.integers?.[name] ?? (required ? 0 : null),
        getUser: (name: string, required?: boolean) => config.users?.[name] ?? (required ? null : null),
        getFocused: () => config.focused ?? "",
    };
}

export function createFakeDiscordEnvironment() {
    const client = new FakeClient();
    const guild = new FakeGuild(THH_SERVER_ID, client);
    client.guilds.cache.set(guild.id, guild);

    const channelIdsToCreate = [
        waffleChannelIds.house,
        waffleChannelIds.counter,
        waffleChannelIds.noWaffle,
        waffleChannelIds.blueyTalk,
        channelIds.offTopic,
    ];
    for (const id of channelIdsToCreate) {
        guild.channels.cache.set(id, new FakeTextChannel(id, guild));
    }

    return { client, guild };
}

export function createFakeMessage(env: ReturnType<typeof createFakeDiscordEnvironment>, config: {
    userId: string;
    channelId: string;
    content: string;
    roleIds?: string[];
    admin?: boolean;
}) {
    const user = env.client.ensureUser(config.userId);
    const channel = env.guild.channels.cache.get(config.channelId)!;
    const message = new FakeMessage(channel, user, config.content);
    message.member = new FakeGuildMember(user, config.roleIds ?? [], config.admin ?? false);
    channel.messages.cache.set(message.id, message);
    return message;
}

export function addUserReaction(message: FakeMessage, emoji: string) {
    const existing = message.reactions.cache.get(emoji);
    const user = message.channel.guild.client.ensureUser(genId("reactor"));
    if (existing) {
        existing.count += 1;
        existing.userCache.set(user.id, user);
    } else {
        const users = new Collection<string, FakeUser>();
        users.set(user.id, user);
        message.reactions.cache.set(emoji, new FakeReaction({ name: emoji }, 2, users));
    }
}

export function createFakeDirectMessage(env: ReturnType<typeof createFakeDiscordEnvironment>, config: {
    userId: string;
    content: string;
}) {
    const user = env.client.ensureUser(config.userId);
    const channel = new FakeDMTextChannel(genId("dm"));
    const message = new FakeMessage(channel, user, config.content);
    message.member = null;
    return message;
}

export function createChatInputInteraction(env: ReturnType<typeof createFakeDiscordEnvironment>, config: {
    userId: string;
    commandName?: string;
    subcommand?: string;
    subcommandGroup?: string;
    strings?: Record<string, string>;
    integers?: Record<string, number>;
    users?: Record<string, FakeUser>;
    roleIds?: string[];
    admin?: boolean;
}) {
    const user = env.client.ensureUser(config.userId);
    const replyState: InteractionReplyState = { replyPayload: null, replied: false, deferred: false };
    const replyMessage = new FakeMessage(env.guild.channels.cache.get(waffleChannelIds.house)!, env.client.ensureUser("bot"), "");

    return {
        user,
        member: new FakeGuildMember(user, config.roleIds ?? [], config.admin ?? false),
        commandName: config.commandName ?? "waffle",
        options: buildOptions(config),
        replied: false,
        deferred: false,
        async reply(payload: any) {
            replyState.replyPayload = payload;
            replyState.replied = true;
            if (payload?.embeds) replyMessage.embeds = payload.embeds;
            if (payload?.content) replyMessage.content = payload.content;
            return replyMessage;
        },
        async editReply(payload: any) {
            replyState.replyPayload = payload;
            if (payload?.embeds) replyMessage.embeds = payload.embeds;
            if (payload?.content) replyMessage.content = payload.content;
            return replyMessage;
        },
        async fetchReply() {
            return replyMessage;
        },
        async deferReply() {
            replyState.deferred = true;
        },
        get replyPayload() {
            return replyState.replyPayload;
        },
    };
}

export function createButtonInteraction(env: ReturnType<typeof createFakeDiscordEnvironment>, config: {
    userId: string;
    customId: string;
    message?: FakeMessage;
    roleIds?: string[];
    admin?: boolean;
}) {
    const user = env.client.ensureUser(config.userId);
    return {
        user,
        customId: config.customId,
        message: config.message ?? new FakeMessage(env.guild.channels.cache.get(waffleChannelIds.house)!, env.client.ensureUser("bot"), ""),
        member: new FakeGuildMember(user, config.roleIds ?? [], config.admin ?? false),
        async reply(payload: any) {
            this.replyPayload = payload;
            return payload;
        },
        async update(payload: any) {
            this.updatePayload = payload;
            return payload;
        },
        async showModal(modal: any) {
            this.modal = modal;
        },
        replyPayload: null as any,
        updatePayload: null as any,
        modal: null as any,
    };
}

export function createModalSubmitInteraction(env: ReturnType<typeof createFakeDiscordEnvironment>, config: {
    userId: string;
    customId: string;
    fields: Record<string, string>;
}) {
    const user = env.client.ensureUser(config.userId);
    return {
        user,
        customId: config.customId,
        fields: {
            getTextInputValue: (key: string) => config.fields[key] ?? "",
        },
        async reply(payload: any) {
            this.replyPayload = payload;
            return payload;
        },
        replyPayload: null as any,
    };
}
