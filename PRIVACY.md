# Privacy Policy

**Last updated: 8 November 2026**

Bot Bilby ("the bot") is the moderation and community bot for [The Heeler House](https://discord.gg/blueyheeler) Discord server. It is operated by The Heeler House staff and is not offered for installation in other servers. This document explains what data the bot handles, why it handles it, where that data is kept, and how to have it removed.

## Scope

The bot only processes data from The Heeler House server and a private development server used by its maintainers. Every command and event handler checks the server ID and stops immediately for any other server. The bot ignores messages sent by other bots, and it does not act on direct messages — the only DM it ever sends is the notice given to an account turned away by the account-age gate.

## What the bot processes, and why

### Message content and attachments

In channels that are not on the staff-maintained exclusion list, the bot reads message content in order to:

- run prefix text commands used by moderators and admins;
- match moderator-configured keyword triggers and post the configured response;
- score messages for spam and raid detection (posting rate, message length, and whether a message is attachment-only) and alert staff when a threshold is crossed;
- archive attachments so that a moderator can review media after it has been deleted or edited away;
- resolve Discord message links that moderators post in the staff channel, so staff can follow a moderation case.

### Membership events

When someone joins, the bot reads the account's creation date to apply the account-age gate, and assigns the newcomer role. Accounts below the configured minimum age are sent an explanatory DM, removed from the server, and recorded in the staff member-log channel.

### Roles and public profile

For members holding the leadership, moderator, or helper roles, the bot reads display name, avatar, and highest role in order to publish the staff roster on the community website.

### Presence

The bot reads member presence status only to count how many members are currently online. The count is used for the community website's activity figures and for staff to follow the server's growth and engagement over time.

## What is stored, where, and for how long

All infrastructure is self-hosted by The Heeler House staff.

| Data | Where | Retention |
| --- | --- | --- |
| Message attachments from non-excluded channels | Self-hosted MinIO/S3 | 30 days, enforced by a storage lifecycle rule |
| Snapshots of messages linked by staff in the staff channel | `state.json` on the bot host | 30 days, pruned hourly |
| Configuration: keyword triggers, spam thresholds, bot characters, game state | Self-hosted MongoDB | Until changed or deleted by staff |
| Message content generally | Not stored | Processed in memory and discarded |
| Presence / online status | Not stored | Reduced to an aggregate count, cached in memory for 60 seconds |
| Member lists, roles, profiles | Not stored | Read per request, cached in memory for 60 seconds |

Data held outside Discord is encrypted at rest. Access to the bot host, the database, and the media storage is limited to the bot's maintainers and The Heeler House leadership.

## What we do not do

- We do not sell, rent, or share any of this data with third parties.
- We do not use message content, or any other data the bot receives, to train machine learning or AI models.
- We do not run advertising or third-party analytics against it.
- We do not track individual members' presence, status, or activity, and we never store or publish per-user presence data.

## What the public API exposes

The bot serves a small read-only HTTP API that powers the community website. It exposes only the server's total member count, the aggregate number of members currently online, the public staff roster, and upcoming server events. It exposes no message content and no data about individual regular members.

## Opting out, and requesting deletion

Members of The Heeler House may ask staff to be excluded from the bot's data handling. On request, staff will stop archiving your attachments, delete archived media you have posted, and remove stored message snapshots that refer to you.

To make a request, contact the staff team in the server: **https://discord.gg/blueyheeler**

## Changes to this policy

If the bot's data handling changes, this document is updated and the "last updated" date above changes with it. The full source code is public at https://github.com/The-Heeler-House/bot-bilby.
