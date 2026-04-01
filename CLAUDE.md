# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build         # Clean dist/, copy assets, run tsc
npm run bot-unix      # Build + run on macOS/Linux
npm run bot-windows   # Build + run on Windows
```

No test or lint scripts are configured.

## Environment

Requires a `.env` file with:
- `TOKEN` — Discord bot token
- `PREFIX` — Text command prefix
- `MONGO_URL` — MongoDB connection string
- `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` — MinIO/S3 credentials
- `API_PORT` — BilbyAPI HTTP port (default 8080)

Server-specific Discord IDs (role IDs, channel IDs, dev user IDs) live in [config/default.json](config/default.json).

## Architecture

Bot Bilby is a Discord bot for "The Heeler House" server built with discord.js v14, TypeScript, MongoDB, and MinIO.

**Startup flow:** `index.ts` creates the Discord client, initializes all services, then hands off to `EventManager` and `CommandPreprocessor`.

### Plugin Systems

Both commands and events are auto-discovered from their directories — just drop a file in the right folder and it's registered:

- **Slash commands** → `src/Commands/slash/` — extend `SlashCommand`
- **Text commands** → `src/Commands/text/` — extend `TextCommand` (prefix-based, used for admin/mod)
- **Events** → `src/Events/events/` — extend `BotEvent`

The `CommandPreprocessor` (`src/Commands/index.ts`) handles routing, permission checks, and blacklist enforcement. `EventManager` (`src/Events/index.ts`) dynamically registers all event handlers.

### Services (`src/Services/`)

Services are initialized once and injected into commands/events:

| Service | Purpose |
|---|---|
| `Database` | MongoDB wrapper; exposes typed collection accessors |
| `S3` | MinIO wrapper for file storage |
| `State` | In-memory state (active games, cooldowns, etc.) |
| `Pager` | Sends crash/error notifications to a Discord channel |
| `BilbyAPI` | Express HTTP server exposing bot data |

### Key Patterns

- **Permissions**: `src/Helper/PermissionHelper.ts` — role-based + user-based access; configured via `constants.ts` and `config/default.json`
- **Directives**: `src/Helper/DirectiveHelper.ts` — parses structured arguments out of text command messages
- **Error handling**: Uncaught exceptions are caught globally and routed through `Pager` to notify devs in Discord
- **Custom events**: The event system supports non-Discord events (e.g., `ManualFire`) in addition to discord.js built-ins

### Database Collections

`botCharacters`, `triggers`, `muteroulette`, `guess`, `guessWho`, `oldGuessWho`, `keepyUppy`, `mutemeData`, `commandBlacklist`, `spamDetection`
