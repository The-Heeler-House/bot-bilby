# The Waffle House — April Fools Event Design Spec
### Claude Code Plan Mode Prompt

You are being asked to plan and implement a Discord bot for a temporary April Fools event called **The Waffle House**. This document is the complete design specification. Read it fully, explore the existing repo, and produce a thorough implementation plan before writing any code. Do not make assumptions where this document is explicit.

---

## What This Is

A 7-day April Fools event (April 1–7) for a Bluey-themed Discord server. The server temporarily rebrands as "The Waffle House." The bot is the entire engine of the event — it tracks points, manages a buff/debuff system, runs a card collection and auction system, and hosts recurring server-wide minigames. All state is fully persistent across restarts.

---

## Narrative

The event is framed as an in-universe escalation, not a formal partnership announcement. It unfolds through staff posts in #announcements, written as if organic.

**How it starts:** Jalen (the server owner) posts wondering what to eat for breakfast. A staff member suggests waffles. Other staff members pile on with increasing enthusiasm until Jalen, swept up in the excitement, declares that the entire server is now dedicated to The Waffle House. The rebranding goes live — server renamed, icon and banner changed to Bluey in a waffle outfit, staff change their display names and profile pictures to waffle-themed personas.

**During the event:** The narrative escalates through periodic staff posts reacting to the server's waffle obsession growing. Jalen posts increasingly unhinged updates. There is a staff command to display the **total WP ever earned** server-wide, framed in-universe as "waffles consumed." This number is posted periodically as a flex.

**How it ends:** Jalen, having gone too far, posts that he is sick of waffles. The server theme reverts. The final post ends with: *"Sooo, how about some pancakes instead?"* — an intentional callback to the event's biggest debuff trigger, landing as the April Fools punchline. Top 5 scorers receive a permanent "Waffle Veteran" role. The reveal that it was all April Fools drops immediately after.

---

## Channels

Three custom event channels are created:

- **#waffle-house-counter** — Minigame announcements only. **Only staff can send messages here.** Users interact with minigames exclusively by DMing the bot. The bot posts all announcements, prompts, updates, and results here.

- **#the-waffle-house** — Card spawns and the auction house both live here. Same rule: only staff can send messages. Users interact via bot commands and discord interactions.

- **#no-waffle** — Opt-out zone. Scoring is completely disabled here. No bot activity. Users who want nothing to do with the event can hang out here unaffected.

All other standard server channels have scoring active, including channel-specific scoring rules for #bluey-talk and #off-topic (see scoring section).

I will create these manually before the event. The bot will reference them by name or ID as needed.

---

## Economy — Waffle Points (WP)

WP is the primary currency. Users earn WP through scoring methods and minigames. WP is spent on card infusion and auction bids.

**Two WP values are tracked per user:**
- `total_wp_earned` — lifetime total, only ever goes up. Used as a statistic. Never reset mid-event (only at end-of-event reveal).
- `current_wp` — spendable balance. Reduced by infusion spending, auction bids, and negative scoring events. Can go negative if debuffs are severe enough.

**Leaderboard score = `current_wp` + current card collection value.** This means spending on infusion or auctions is a real strategic tradeoff — there is risk involved.

---

## Scoring Methods

Every message in a scoring channel is evaluated against all applicable methods. **Multiple methods can trigger from a single message** — they are not mutually exclusive unless noted. Each method has its own independent cooldown per user. When a user triggers a method for the very first time ever, they receive a DM from the bot explaining what they did and what it earned — this is the primary way users discover the scoring system. After the first discovery, scoring is silent unless a milestone is hit.

The bot must never post publicly about what methods exist or how they work. Staff respond to questions with "The Waffle House doesn't disclose trade secrets."

### Positive Scoring Methods

---

**Lonely Waffle — 1 pt | 3-minute cooldown**
Post the word "waffle" or "waffles" completely alone in a message — no other characters, no punctuation, any case. This is the floor-level method.
- Triggered by: message content is exactly "waffle" or "waffles" (case-insensitive, trimmed)
- If this condition is met, Lonely Waffle fires instead of Just Sayin' for that message

---

**Just Sayin' — 5 pts | 5-minute cooldown**
Mention waffle somewhere naturally in a message.
- Triggered by: the word "waffle" or "waffles" appearing in the message, followed optionally by `.` `?` `!` `-` `-!` `-?` (case-insensitive)
- Does NOT trigger if the message is exactly "waffle"/"waffles" alone (that's Lonely Waffle)
- Does NOT trigger if the content qualifies for a higher-specificity method like Get Waffled!, So Waffley, or Become Waffle — those take precedence for their specific patterns

---

**Lazy Waffle — 50 pts | 30-minute cooldown**
Use the abbreviation "wfl" somewhere in a message.
- Triggered by: the string "wfl" appearing as a word or token in the message (case-insensitive)

---

**Waffle Scramble — 5 pts | 5-minute cooldown**
Post a message containing the letters w, a, f, f, l, e distributed across any words, in any order, but NOT forming the sequence "waffle" as a contiguous string anywhere.
- Triggered by: the six letters w-a-f-f-l-e (case-insensitive) each appearing at least the required number of times across the full message text, and the word "waffle"/"waffles" does not appear as a contiguous string anywhere in the message
- If "waffle" appears as a contiguous string, this method does not fire (Just Sayin' handles it instead)

---

**The Basics — 10 pts | 5-minute cooldown**
Post a message containing exactly one complete set of the letters w-a-f-f-l-e — no more, no fewer — distributed across any words, not forming the word "waffle" contiguously.
- Triggered by: exactly the letters w(×1), a(×1), f(×2), l(×1), e(×1) appearing across the message (case-insensitive), with no "waffle" contiguous string present
- This is more restrictive than Waffle Scramble — extra letters disqualify it

---

**Feeling Very Waffle — 10 pts | 5-minute cooldown**
Include the :waffle: Discord emoji in a message.
- Triggered by: the :waffle: emoji appearing in message content

---

**So Waffley — 5 pts | 5-minute cooldown**
Use "waffley" or "waffly" as an adjective in a sentence.
- Triggered by: either of those exact strings appearing in the message (case-insensitive)

---

**Become Waffle — 30 pts | 15-minute cooldown**
Use "wafflize," "waffle-ize," or "waffleize" — or their past tenses — in a message.
- Triggered by: any of: wafflize, waffle-ize, waffleize, wafflized, waffle-ized, waffleized (case-insensitive)

---

**Get Waffled! — 15 pts | 5-minute cooldown**
Use "waffle" as a verb in a message.
- Triggered by any of: "to waffle", "waffling", "waffled", "will waffle", "i'll waffle", "ill waffle", "you'll waffle", "youll waffle", "he'll waffle", "shell waffle", "it'll waffle", "itll waffle", "he waffles", "she waffles", "it waffles" (all case-insensitive)
- Note: "waffles" used as a plural noun is indistinguishable from the third-person verb form in some cases — this is intentional and accepted. The method description can acknowledge this with flavour text.

---

**Waffle GIF — 20 pts | 10-minute cooldown**
Send a GIF in any scoring channel where the GIF's URL or filename contains the word "waffle."
- Triggered by: a message containing an attachment or embed where the URL, filename, or embed title contains the string "waffle" (case-insensitive)
- Standard scoring channel rules apply (cooldown per user)

---

**Method 3 — Waffle Acronym — 20 pts | 10-minute cooldown**
The first letters of at least 6 consecutive words in the message spell out W-A-F-F-L-E in order.
- Triggered by: scanning all 6-word windows across the message; if any window's first letters (case-insensitive) spell "waffle," this fires
- This stacks with other methods if the same message also qualifies (e.g. a message with a waffle emoji AND a WAFFLE acronym earns both)

---

### One-Time Awards

**My First Waffle — 5 pts**
Awarded the very first time a user's message scores any points at all during the event. Fires once per user, ever.

**Hungry — 50 pts**
Awarded when a user accumulates 200 messages that each contain at least 30 characters and include the word "waffle" or "waffles." The bot tracks this count silently. Fires once per user, ever.

---

### Channel-Specific Methods

**Bluey's Brekkie — 15 pts | 15-minute cooldown**
Send a message containing both "bluey" and "waffle" (or "waffles") in #bluey-talk.
- Only scores in #bluey-talk

**Bingo's Brunch — 15 pts | 15-minute cooldown**
Send a message containing both "bingo" and "waffle" (or "waffles") in #bluey-talk.
- Only scores in #bluey-talk

**Change of Topic — 50 pts | 30-minute cooldown**
Send a message containing "okay but waffles" or "okay but waffle" in #off-topic.
- Only scores in #off-topic
- Case-insensitive

---

### Negative Scoring Methods

Negative methods also have first-discovery DMs. Tone is accusatory and dramatic.

**Betrayal — −1 pt | 3-minute cooldown**
Mention "pancakes" or "pancake" in a message without also including "hate," "dislike," "gross," or "dumb."
- Does not fire if the message also contains any of those redemptive words
- Does not fire if Sneaky Betrayal fires instead

**Sneaky Betrayal — −20 pts | 15-minute cooldown**
Mention "pancakes" or "pancake" in a message while also including "don't hate," "don't dislike," "not gross," or "not dumb."
- Takes precedence over Betrayal when both conditions are met
- You knew what you were doing

**Heartbreaker — −5 pts | 5-minute cooldown**
Express love for pancakes.
- Triggered by phrases including (case-insensitive): "i love pancakes," "i like pancakes," "pancakes are my favorite," "pancakes are my favourite," "i love pancake," "i like pancake"
- This list doesn't need to be exhaustive — cover the most natural phrasings

**Too Cheeky — −5 pts | 3-minute cooldown**
Mention "hotcakes" or "flapjacks" without including "hate," "dislike," "gross," or "dumb."
- Same structure as Betrayal but for the synonyms

**You Think You're Cute — −30 pts | 15-minute cooldown**
Mention "hotcakes" or "flapjacks" while including "don't hate," "don't dislike," "not gross," or "not dumb."
- Same structure as Sneaky Betrayal but for the synonyms

---

### Spam Protection

**Tummy Ache — auto-mute for 1 minute**
If a user sends "waffle" or "waffles" more than 4 times within a single message, or spams waffle messages faster than the system can reasonably score them (implementation discretion on exact threshold), they are auto-muted for 1 minute and receive no points for that message. The bot reacts with :BlueyDerp: to the offending message. This does not stack with normal scoring — it replaces it.

---

### The French Toast Counter (Secret)

This is a hidden easter egg with no announced mechanic.

The bot silently tracks every time any user says "french toast" (case-insensitive, punctuation-insensitive) in any channel. No points are awarded. No reaction occurs. Users receive no indication anything is being tracked.

A staff-only command displays a leaderboard of how many times each user has said "french toast," sorted descending, excluding users with 0 mentions. After the event, staff will manually award a secret role to the top 5 french toast offenders.

---

## Glazes (Buffs) & Burns (Debuffs)

Glazes and burns are temporary modifiers to a user's WP earn rate. They are completely hidden — users only learn they have one when they receive it via DM. There is no announcement in any channel when a glaze or burn is applied.

**Terminology:** "Glazes" for buffs, "Burns" for debuffs. These names must not conflict with any card names.

**Stacking:** Glazes and burns both stack additively. Net multiplier = sum of all active glaze multipliers minus sum of all active burn penalties. **There is no floor.** The net multiplier can go negative, meaning a user actively loses WP per scored message. This is intentional.

**Glaze and burn triggers are random.** They are not earned through specific actions. Every X waffle-containing messages server-wide, the user who sent that Xth message receives a glaze or burn. X is randomly rolled within a range each time — higher-value glazes have higher ranges (rarer triggers). The user who sent the triggering message is the recipient.

### Glaze Table

| Name | Multiplier | Duration | Trigger Range |
|---|---|---|---|
| Strawberry Glaze | +2x | 1 hour | every 30–50 messages |
| Blueberry Glaze | +2x | 2 hours | every 40–60 messages |
| Maple Glaze | +3x | 1 hour | every 60–90 messages |
| Banana Glaze | +2.5x | 90 minutes | every 70–100 messages |
| Chocolate Glaze | +3x | 45 minutes | every 80–110 messages |
| Peanut Butter Glaze | +4x | 30 minutes | every 100–140 messages |
| Cherry Glaze | +5x | 20 minutes | every 150–200 messages |
| Golden Glaze | +10x | 10 minutes | Final 24h only — every 50–80 messages |

### Burn Table

| Name | Penalty | Duration | Trigger Range |
|---|---|---|---|
| Soggy Bottom | −0.5x | 45 minutes | every 45–70 messages |
| Cold Waffle | −0.75x | 1 hour | every 60–90 messages |
| Waffle Bug | −1x | 2 hours | Final 24h only — every 40–60 messages |

### Pancake Burn (Deterministic, Not Random)
Mentioning "pancake" or "pancakes" in any message — regardless of whether it scores points — triggers a **Burned the Waffle** burn (−0.5x, 30 minutes) in addition to any negative point methods that fire. This is applied silently with a DM. This is separate from the negative scoring methods.

### DM Tone
Glaze DMs: congratulatory, waffle-flavoured. Burns: accusatory and dramatic. The Pancake burn specifically: personally offended. The bot is Bob Bilby and takes this very seriously.

---

## Milestone DMs

When a user's `total_wp_earned` crosses a threshold for the first time, they receive a DM. Tone escalates from friendly to unhinged.

Thresholds: 1,000 / 5,000 / 15,000 / 40,000 / 100,000 WP

Each milestone fires once per user, ever. These are separate from first-discovery DMs.

---

## Card System

Cards are collectible items. Each card has a WP value that contributes to leaderboard score. Cards are won through spawns and minigames.

### Card Values Are Randomised Ranges

Every card has a base value range. When a card is awarded, its true value is rolled randomly within that range and locked in permanently (until infusion or combination changes it). **Only the card's owner can see its true rolled value.** All public displays (spawn announcements, auction listings) show only the card's name, rarity, and infusion level.

### Card Catalogue

Design cards that are interesting, thematic, and ideally Bluey-adjacent where it fits naturally. Avoid generic or crude names. The following types must be represented — populate them with creative names and appropriate emoji:

**Base Waffle Cards (5 total — one per rarity tier)**
Each represents a distinct type of waffle with a fun name. Common through legendary. Value ranges scale significantly across tiers.

Suggested naming direction: breakfast-themed, Bluey-character-adjacent, or absurdly specific (e.g. "Sunday Morning Waffle," "Bandit's Special," "Chilli's Disaster Waffle"). Blue Waffle is not acceptable. Be creative.

**Topping Cards (5 total — common through epic)**
These are the combinable ingredient cards. Name them as real waffle toppings with personality. They have their own value ranges independent of base waffles.

**Special Cards (3 total)**
- One negative-value cursed card (pancake-themed, subtracts from collection total)
- One rare "redemption" card with a low but positive value and a fun backstory
- One legendary ultra-rare card with the highest value in the game — name it something absurd and earned

All card names must be distinct from all glaze names and burn names.

### Combination System

Users combine two cards using a command. The result card's value is derived from the input cards' rolled values plus a recipe-specific formula — combinations are not flat rerolls. This forces strategic thinking: a high-rolled input produces a better output than a low-rolled one. The exact formula per recipe is a design decision, but the principle is: **output value = f(input_a_value, input_b_value, recipe_bonus)**, where recipe_bonus is a fixed amount defined per recipe.

Standard recipes should be discoverable by experimentation. Secret recipes exist and are never documented. The bot never confirms or denies whether a recipe exists for a given pair.

Define at least 6 standard recipes and 2 secret recipes. All combined cards must have their own name and rarity.

Three-card combos work by chaining: combine two cards to get an intermediate result, then combine that result with the third card. The final result of a secret chain should be the legendary ultra-rare special card.

### Infusion System

Users spend `current_wp` (which reduces leaderboard score) to level a card from level 1 to a maximum of level 5. Each level applies a multiplier to the card's rolled base value. The multiplier itself is also a range — it is rolled fresh at infusion time, meaning there is variance in how much a level-up improves a card.

Level multiplier ranges (applied to the card's rolled base value):
- Lv1: 1x (base, no infusion)
- Lv2: 1.3x–1.7x
- Lv3: 1.8x–2.3x
- Lv4: 2.5x–3.5x
- Lv5: 4x–6x

Each level-up has a burn risk that increases with level. If a burn triggers, the card drops back to level 1 and is temporarily "burnt" — its effective value is halved for 2 hours. The card is never destroyed. The user is informed about the outcome in the reply. Infusion costs increase per level — set them such that the decision to infuse is a real tradeoff, not a no-brainer.

### Card Spawns

A spawn is triggered when a running server-wide counter of waffle-containing messages crosses a randomly set threshold. After each spawn, the counter resets and a new threshold is rolled. Thresholds are lower (more frequent spawns) later in the event.

When a spawn triggers, the bot posts a public announcement in **#the-waffle-house** with a challenge. The first user to complete the challenge correctly wins the card. The card's type and rarity are shown publicly; its rolled value is revealed only to the winner via empheremral reply.

### Challenge Types by Rarity

Design challenges that are automatically verifiable by the bot and that users race to complete. They should not be repeats of the regular scoring methods. Ideas — replace or improve as needed:

- **Common:** First to react to the bot's message with a specific emoji sequence the bot names (e.g. "React with 🧇 then ⭐ then 🍯 in order — first to do all three wins")
- **Uncommon:** First to send a message where every word starts with a letter from W-A-F-F-L-E (not necessarily in order, just the same letter pool — 6 words minimum, each starting with w, a, f, f, l, or e)
- **Rare:** First to post a valid Waffle Acronym (Method 3 — W-A-F-F-L-E across 6 consecutive words) using words that are all 5+ letters long
- **Epic:** First to post a message containing ALL of: the :waffle: emoji, the word "waffle" used as a verb, AND a valid WAFFLE acronym — all in one message
- **Legendary:** First to send a message that scores at least 4 different scoring methods simultaneously in a single message (the bot verifies automatically against all method detectors)

If you have better ideas that are funnier or more creative and still automatically verifiable, use those instead.

---

## Minigame System

A minigame fires every 30 minutes in **#waffle-house-counter**. Users interact exclusively by DMing the bot — they cannot post in #waffle-house-counter directly.

The rotation cycles through four game types in fixed order:

**Chef Battle → Anonymous Poll → Prompt & Entry → Waffle Alliance → repeat**

All four slots are exactly 30 minutes. Chef Battle, Anonymous Poll, and Prompt & Entry each have internal phases that sum to 27 minutes, with a 3-minute buffer before the next game. Waffle Alliance runs for 27 minutes, then the next game starts 3 minutes later.

The next game starts 30 minutes after the previous one started, on a fixed clock.

### Prompt Queue

Chef Battle, Anonymous Poll, and Prompt & Entry each draw prompts from a shared staff-managed queue, tagged by game type. When a game type fires, it takes the oldest matching prompt from the queue. If no matching prompt exists, it falls back to a built-in list of defaults for that game type. Staff can add, remove, and list queue entries via a staff command. Defaults should be pre-written with enough variety to run the entire event without staff input if needed.

---

### Game 1 — Waffle Chef Battle

**Phase breakdown (27 minutes total):**
- Signup: 5 minutes
- Battle: 5 minutes
- Voting: 17 minutes

**Signup (5 min):** Bot posts the prompt in #waffle-house-counter and opens registration. Users clicks a button on the message to sign up. After 5 minutes, two participants are randomly selected from all who signed up. If fewer than 2 signed up, the game is cancelled and the slot is skipped.

**Battle (5 min):** The two selected users are publicly named in #waffle-house-counter and the prompt is publically displayed too. They each DM their response to the bot within 5 minutes. If a user doesn't respond in time, their entry is marked as a forfeit.

**Voting (17 min):** The bot posts both responses in #waffle-house-counter labelled "Entry A" and "Entry B" (not attributed to users). Users vote by reacting to the bot their choice. Each user gets one vote. Participants cannot vote for themselves.

**Resolution:** Winner = more votes. Winner receives **Peanut Butter Glaze (+4x, 30 min)**. Loser receives **Cold Waffle burn (−0.75x, 1 hour)**. On tie: both receive **Blueberry Glaze (+2x, 2 hours)**. Players are revealed by name by editing the embed.

**Default prompts (Chef Battle):**
- "Design the most unhinged waffle order imaginable. Cost is not a concern."
- "Invent a new waffle flavour. Give it a product name and a one-line tagline."
- "Pitch a business that involves waffles in a way that makes no logical sense."
- "Write the Yelp review that got a Waffle House employee fired."
- "Design a signature waffle for a specific Bluey character. Justify every topping."
- "You are a waffle. Describe your day."
- "Write the terms and conditions for eating a waffle."

---

### Game 2 — Anonymous Poll

**Phase breakdown (27 minutes total):**
- Voting window: 25 minutes
- Resolution + buffer: 2 minutes

**Active (25 min):** Bot posts a poll prompt with 3–5 options in #waffle-house-counter. Users vote by clicking a button to the bot with their choice (option letter or number). Each user gets one vote. Votes are completely anonymous — never publicly attributed.

**Resolution:** Bot reveals full vote breakdown publicly. Users who voted for the **winning option** receive **Maple Glaze (+3x, 1 hour)**. Users who voted for the **losing option** (fewest votes) receive **Soggy Bottom burn (−0.5x, 45 min)**. Users who didn't vote receive nothing. In a tie for winning, all tied options' voters receive the glaze. In a tie for losing, all tied last-place options' voters receive the burn.

**Default prompts (Anonymous Poll):**
- "Best waffle topping? A) Maple syrup B) Whipped cream C) Fresh berries D) Chocolate drizzle"
- "The Waffle House is: A) A lifestyle B) A cry for help C) Both D) I've never been and I'm scared"
- "Waffles vs pancakes: A) Waffles, obviously B) Pancakes, fight me C) They are the same thing D) I don't eat breakfast like a normal person"
- "Best time to eat a waffle: A) Breakfast B) Midnight C) During a crisis D) Waffles transcend time"
- "How much syrup? A) Flood it B) Light drizzle C) None, I respect myself D) I drink it from the bottle"
- "Bandit or Chilli — who makes better waffles? A) Bandit B) Chilli C) Neither, Bluey makes them D) Bob Bilby, obviously"

---

### Game 3 — Prompt & Entry

**Phase breakdown (27 minutes total):**
- Submission window: 10 minutes
- Voting window: 15 minutes
- Resolution + buffer: 2 minutes

**Submission (10 min):** Bot posts a creative prompt in #waffle-house-counter. Users DM their response to the bot. The first 10 valid submissions are accepted. Late submissions are rejected.

**Voting (15 min):** Bot posts all collected entries in #waffle-house-counter, numbered 1–10, attributed to their authors by username. Users vote by clicking a button to the bot with their choice. Each user gets one vote. Users cannot vote for their own entry.

**Resolution:** User with the most votes wins. **Winner receives Peanut Butter Glaze (+4x, 30 min)**. All non-winning submitters receive **Soggy Bottom burn (−0.5x, 45 min)**. Users who didn't submit receive nothing.

**Default prompts (Prompt & Entry):**
- "Name a Waffle House menu item that definitely doesn't exist but absolutely should."
- "In exactly one sentence: what happened at The Waffle House last Tuesday?"
- "Give The Waffle House a new corporate slogan."
- "Describe waffles to someone who has never seen one, using only metaphors."
- "Write the opening line of The Waffle House's Wikipedia article."
- "What is The Waffle House's deepest secret?"
- "Invent a waffle-related law and write it in legalese."
- "Write a one-star review of the concept of waffles."
- "What does Bob Bilby do on his days off?"

---

### Game 4 — Waffle Alliance

**Duration: 27 minutes (plus 3-minute buffer before next game)**

**Joining:** Unlike the other three games, Waffle Alliance has no fixed signup window. Users can click a button on the bot to join at any point during the 27-minute active period. When a user joins, they are randomly assigned to either **Team Butter** or **Team Syrup** — they cannot choose. The bot DMs them their team assignment.

The bot posts the Alliance announcement in #waffle-house-counter at the start, showing the prompt and a live team roster that updates as users join (or posts periodic updates — implementation discretion).

**Active period:** For the full 27 minutes, every waffle-containing message from a team member in any scoring channel contributes WP to their team's collective counter which is publically displayed (in addition to scoring normally for the individual). Team totals are tracked separately.

**Resolution:** The bot posts final team totals. All members of the **winning team** receive **Chocolate Glaze (+3x, 45 min)**. All members of the **losing team** receive **Cold Waffle burn (−0.75x, 1 hour)**. In a tie: both teams receive **Strawberry Glaze (+2x, 1 hour)**. Users who joined but sent no qualifying messages still receive the result for their team.

---

## Auction House

The auction house runs on a completely independent timer from the minigame rotation. All auction activity posts to **#the-waffle-house** (the same channel as card spawns). Only staff can post in #the-waffle-house — users interact by DMing the bot or using bot commands.

### Listing a Card

A user submits a card to the auction house using a command. When submitting, **they must specify a minimum bid** (in WP). The card is removed from their active collection immediately and queued in the auction pool. It no longer contributes to their leaderboard score while listed.

The user may withdraw the card at any time before it goes live in an auction, which returns it to their collection.

### Auction Cadence

Every 30 minutes, the auction house refreshes and the bot sends a new message. Up to **5 cards** from the auction pool are selected randomly and go live simultaneously as active auctions. Each auction runs for exactly **30 minutes**.

When auctions go live, the bot posts in #the-waffle-house showing all 5 active auctions. Each listing shows: card name, rarity, infusion level, and minimum bid. The card's true rolled value and the seller's identity are hidden.

### Bidding

Users bid by clicking interactions on the bot messsage. Bids must exceed both the minimum bid and the current highest bid. Users can raise their own bid. The bot acknowledges bids via emphermental messages but does not publicly announce individual bids in #the-waffle-house. The current highest bid for each card is updated in the auction post (or via a command users can run to check current standings — implementation discretion).

All bidding is anonymous during the auction — no one knows who is bidding on what.

### Resolution

At the 30-minute mark, all 5 auctions resolve simultaneously. For each card:

- **If bids were placed:** The highest bidder wins. The WP bid amount is deducted from their `current_wp` (reducing leaderboard score). The card is added to their collection with its rolled value. The seller receives the bid amount added to their `current_wp`. The bot posts the resolution publicly in #the-waffle-house, revealing: card name, true rolled value, final bid amount, seller username, and winning buyer username. This is intentionally public — post it as a fun/dramatic reveal ("The Waffle has spoken").
- **If no bids were placed:** The card is returned to the auction pool and re-queued.

### Seller Strategy Note

Because the seller sets a minimum bid and the true value is hidden from buyers, sellers can potentially extract more than a card's true value from aggressive bidders, or fail to sell if they set the minimum too high. This is intentional.

---

## Staff Commands

All staff commands require the staff role. They should be clearly grouped and documented in the codebase.

- **Add/remove/list prompt queue entries** (by game type)
- **Trigger a manual card spawn** (with optional rarity override)
- **Trigger a specific minigame** outside the rotation
- **Manually apply a glaze or burn to a user** (for testing or narrative purposes)
- **Display event stats:** total WP ever earned server-wide ("waffles consumed"), total cards in existence, current auction pool size, current leaderboard snapshot
- **Display the French Toast leaderboard** (hidden easter egg counter)
- **Toggle Final 24h mode** (activates changes described in the Last 24 Hours section)
- **Trigger end-of-event sequence** (announces total, resets `current_wp`, awards Waffle Veteran role to top 5 by leaderboard score at that moment, posts the reveal)

---

## Last 24 Hours

When Final 24h mode is toggled by staff, the following changes activate immediately and remain until the event ends. The mode shift should be announced dramatically in #announcements as part of the narrative (Jalen is getting tired of waffles but hasn't given up yet — the chaos intensifies).

**Scoring changes:**
- All base WP values are doubled across every method
- Cooldowns for all positive methods are halved (rounded down to nearest second)
- Negative scoring penalties are tripled
- The French Toast counter tracks at double rate (every mention counts twice)

**Glaze changes:**
- Golden Glaze becomes available (replaces Cherry Glaze in the random trigger pool, or runs alongside it — implementation discretion)
- All glaze durations are doubled
- Glaze trigger thresholds are halved (glazes apply much more frequently)

**Burn changes:**
- Waffle Bug burn becomes active (−1x, 2 hours) — triggers randomly like other burns
- All burn durations are doubled
- Burn trigger thresholds are also halved (burns apply more frequently too)
- Because glazes and burns both ramp up simultaneously and there's no floor on the net multiplier, user rates become extremely volatile and chaotic — this is the intended state

**Minigame changes:**
- All minigame loser burns are upgraded one tier (Soggy Bottom → Cold Waffle, Cold Waffle → Waffle Bug)
- All minigame winner glazes gain +1x to their multiplier

**Auction changes:**
- All 5 auction slots refresh simultaneously every 15 minutes instead of 30

**Card spawn changes:**
- Spawn thresholds drop to 50% of their normal range
- Rare+ rarity bias activates

The overall tone is maximum chaos. Everything escalates. Nothing is explained to users.

---

## Bot Identity

The bot's name is **Bob Bilby**. It is cheerful, slightly unhinged, deeply invested in waffles, and completely unwilling to discuss how anything works. It speaks with personality in all messages — announcements, DMs, and resolution posts all have distinct flavour. Waffle metaphors are encouraged everywhere. The Pancake burn DM is the one place Bob Bilby is genuinely, personally offended.

All public channel posts by the bot are formatted clearly and consistently. DMs are punchy and short. Resolution posts are dramatic. The narrative posts (handled by staff but potentially templated) escalate in absurdity across the 7 days.

---

## Persistence & Reliability

All state is fully persistent. Bot restarts must not lose data or corrupt active game state. On startup, the bot checks all active timers and mid-phase games and handles them correctly: resume if the window is still open, resolve or cancel gracefully if the window has passed.


# Overall notes

When designing the system, the only things that should be dms are 1) the first-discovery messages for each method, 2) the milestone DMs, 3) private prompt submissions. The bot should never DM users proactively except for those three cases. All other interactions are either public in channels or initiated by users via commands or buttons or through emphermeal messages.

Discord js has a lot of built-in support for buttons and interactions which can be used for the auction house and minigame interactions. For example, the bot can post a message with buttons for each auction listing, and users click those buttons to place bids. The bot can also use buttons for minigame voting and signups. This allows for a more interactive experience without relying on users to remember specific commands.

I love embeds! They can make the bot's messages much more visually appealing and easier to read, especially for things like card spawns, auction listings, and game prompts. Each embed can have a consistent style with waffle-themed colors and icons to reinforce the theme. Try to update embeds in place when possible (e.g. updating the minigame status) rather than posting new messages (you still need this for stuff like new auctions listings), to keep the channel cleaner.

This will frequently be restarted for updates and bug fixes, so the persistence layer must be robust.

We're a bluey server, so remember to keep things bluey themed when you can.
