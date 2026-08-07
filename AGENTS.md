# AGENTS.md

This file provides working context and implementation rules for AI coding agents operating on **DaleW-Cyber/RancourEvents**.

The repository currently powers a Rancour PvM bingo event, but changes should preserve its role as a **reusable event platform** rather than turning it into a one-off site for a single competition.

## Primary objective

Treat the current bingo implementation as the first event template in a broader Rancour Events system.

When changing the app:

1. Preserve current live behaviour unless the task explicitly replaces it.
2. Prefer reusable data/configuration patterns over hard-coded event-specific values.
3. Keep nontechnical event organisers in mind: long term, event structure should be configurable without editing code or formulas.
4. Keep the existing OSRS/Rancour visual identity unless specifically asked to redesign it.

## Current stack

- Node.js 18+
- Express
- `csv-parse`
- Framework-free HTML/CSS/JavaScript in `public/`
- Google Sheets as the current event data source
- Railway for production hosting
- GitHub `main` is connected to Railway and changes can automatically deploy to production

Do not introduce a frontend framework or major dependency without a clear technical reason.

## Important files

```text
server.js
  Google Sheet ingestion, parsing, API responses and some HTML augmentation.

public/index.html
  Interactive team bingo board.

public/stats.html
  Event Stats landing page and homepage.

public/items.html
  Item/pet ledger.

public/site-nav.js
public/site-nav.css
  Persistent site navigation used across pages.

railway.toml
  Railway build/deploy configuration.
```

Before editing, inspect the latest version of the relevant file rather than relying on old conversation context or previous commits.

## Current routes

### Pages

- `/` — Event Stats landing page
- `/stats` — same stats page
- `/bingo?team=1` — interactive team bingo board
- `/items` — item/pet list

### APIs

- `/health`
- `/api/event`
- `/api/stats`
- `/api/items`

Avoid breaking these routes without explicit instruction.

## Current Google Sheet contract

The default workbook is configured through `EVENT_SHEET_ID`.

The live implementation currently expects these tabs:

- `Summary Board`
- `Bingo Stats`
- `Bounty Tracker`
- `Item List`
- `Team 01`
- `Team 02`
- `Team 03`

### Team sheet data

Current team reads include:

- `AB:AT` — tile data plus roster/player statistics
- `AX:BA` — drop feed / team drop tracking
- `BG:CA` — per-tile requirement blocks

Important player columns in the current team sheets:

- `AL` — roster number
- `AM` — Discord ID
- `AN` — member/RSN
- `AO` — timezone
- `AP` — rank/rating
- `AR` — Drop Points
- `AS` — GP Earned
- `AT` — EHB Gained

The Team Roster UI currently displays:

- RSN
- Drop Points (`AR`)
- EHB Gained (`AT`)

Summary rows must not be treated as roster members. The current parser excludes them by requiring both a valid member number and Discord ID.

### Tile requirements

The current requirement parser reads repeating three-column blocks inside `BG:CA`.

Known item blocks currently begin at:

- `BI:BK`
- `BM:BO`
- `BQ:BS`
- `BU:BW`
- `BY:CA`

Each block can contain:

- item/objective
- needed value
- earned value
- subtotal/total rows

Long requirement lists must remain usable in the fixed-size scrollable tile detail dialog.

### Drop tracking

Current drop data is read from the `AX:BA` area of each team sheet.

Relevant values include:

- Drop Number
- Drop
- Member Name
- Tile reference

The API retains the complete parsed team drop history because tile detail views need older contributing drops.

The right-side **Recent Drops** panel intentionally shows only the latest 10 entries.

When a tile is clicked, its **Contributing Drops** section should show all drops linked to that tile and the player who received them.

### Bounties

Bounty leaders are read from ranked summary blocks on the `Bounty Tracker` tab.

Rules:

- only display a leader when the leading value is greater than `0`
- if multiple players share the positive leading value, list all tied leaders
- do not list zero-value ties as winners

### Bingo Stats

The stats landing page uses the visible/player-facing sections of the `Bingo Stats` tab rather than exposing large helper/calculation tables.

Current team panels include:

- Tiles Earned / completion
- Team EHB
- Pet Drops
- GP Made from verified drops
- Spoon Metric

Current individual leaderboard types include:

- Drop Points Earned
- EHB Gained
- Pet Drops
- GP Made from verified drops

Individual leaderboard titles should remain explicit in the UI even if a Sheet title cell is blank or temporarily errors.

### Item List

The `/items` page intentionally exposes player-useful event data rather than the entire backend lookup table.

Current useful views:

- Bingo Items grouped/filterable by tile
- Pet List with drop rate and include/exclude status

Do not expose large internal item-ID/price lookup tables merely because they exist in the Sheet unless specifically requested.

## API/data rules

- Treat the browser as untrusted.
- Do not expose Sheet credentials, bot tokens, Railway secrets or other private credentials in frontend code.
- Keep Google Sheet access server-side.
- Escape any Sheet-derived string inserted with `innerHTML`.
- Preserve sensible empty states when data is blank.
- Do not invent progress, bounty leaders, drops or placeholder player data.
- Spreadsheet errors such as `#REF!`, `#VALUE!` or temporary WOM failures should render as a friendly empty/refreshing state where possible.
- Prefer stable IDs (team number, tile number, submission ID) over names for joins.

## Navigation behaviour

Navigation should remain consistent across Stats, Bingo and Item List pages.

The persistent navigation is based on the Team Banner visual style and currently includes:

- Event Stats
- Team 1 board
- Team 2 board
- Team 3 board
- Item List

Team board links use `?team=1`, etc.

When the user switches team from within `/bingo`, update the URL so refreshing or sharing preserves the selected team.

Do not reintroduce disconnected page-specific navigation unless explicitly requested.

## UI / visual system

The chosen design direction is an **OSRS clan war-room / noticeboard**.

Preferred characteristics:

- dark textured wood/stone backgrounds
- brass/gold borders and hard bevels
- parchment content areas
- Georgia / serif typography
- dense, game-like information presentation
- Rancour red for primary emphasis
- green primarily for success/completion

Avoid by default:

- generic SaaS cards
- glassmorphism
- oversized rounded corners
- bright unrelated accent palettes
- Inter-style corporate dashboard redesigns

### Scrollbars

Custom scrollbars should match the dark wood/brass or parchment/brass surface they belong to.

Do not leave a bright native Windows scrollbar inside a heavily themed panel when a scrollbar is already custom styled elsewhere on the site.

### Tile detail dialog

The tile detail popup must:

- stay within the viewport
- use a fixed/max size rather than growing off screen
- scroll internally for long content
- retain its themed scrollbar
- keep the close control accessible
- reset to the top when a new tile opens
- allow Escape to close
- prevent the underlying page from scrolling while open

## Reusability rules for future events

When adapting the repo for another event, prefer this order:

1. Change configuration/data in the event workbook.
2. Change `EVENT_SHEET_ID`.
3. Update event metadata/presentation.
4. Adjust parsers only if the workbook schema truly changed.
5. Add new API fields or event modules in reusable form.

Avoid hard-coding a future event's team names, tile names or challenge values directly into HTML if they can come from the event data source.

If a future event is not a bingo, keep the common site shell/navigation/statistics infrastructure and add the new event-specific module rather than replacing the entire application.

## Longer-term platform direction

The target architecture is a reusable Rancour event operating system.

A canonical event model should eventually cover:

### Event

- event ID
- title
- type/template
- start/end dates
- status
- rules
- scoring configuration

### Teams

- team ID
- name
- captain/co-captain
- colour/theme
- enabled state
- roster

### Challenges / Tiles

- challenge ID
- title
- category/content
- requirement
- difficulty
- points
- sort order

### Progress

- team ID
- challenge ID
- progress
- completion state
- last updated

### Submissions

- submission ID
- team ID
- challenge ID
- player/RSN
- evidence/screenshot
- status
- reviewer

### Bounties / prizes

- bounty ID
- metric/rule
- prize
- current leaders

Discord bot, RuneLite plugin, Wise Old Man integrations and the website should eventually feed or consume the same trusted event API.

Do not prematurely rewrite the current working Sheet system just to reach this architecture. Migrate incrementally when a task requires it.

## Coding style

- Keep functions small enough to understand.
- Prefer named parser/helper functions over large inline expressions when adding new data sources.
- Reuse existing HTML/CSS patterns where possible.
- Avoid duplicating the same business rule independently in multiple frontend pages.
- Keep user-visible strings clear and event-focused.
- Avoid changing unrelated code in a focused task.

## Validation after changes

At minimum, check:

```bash
node --check server.js
```

For frontend JavaScript edits, syntax-check extracted/standalone scripts when practical.

Then validate the affected endpoints/pages manually.

Recommended smoke checks:

- `/health` returns OK
- `/api/event` returns all teams
- each team has the expected roster and tiles
- no totals/team-name row appears in Team Roster
- Drop Points and EHB map to the correct RSN
- team selector changes the correct board
- tile detail popup scrolls
- tile requirements match the selected team
- contributing drops match the selected tile
- Recent Drops remains capped at 10
- bounty ties only show when the leader value is positive
- stats table titles are visible
- `/items` still loads and filters

## Railway / production safety

Railway is connected to the repository's `main` branch.

A commit to `main` may trigger a production deployment automatically.

Therefore:

- understand the impact before modifying `main`
- avoid speculative rewrites in production-facing tasks
- after a user-requested change, check the Railway deployment status when tooling is available
- if deployment fails, inspect build/runtime logs before making unrelated changes

Railway currently uses `/health` as the service health check.

## Secrets

Never commit:

- API keys
- Discord bot tokens
- Railway tokens
- service-account JSON
- private Google credentials
- database passwords

Use environment variables / Railway secrets.

## Documentation expectations

When changing the reusable architecture, Sheet contract, routes or deployment requirements, update `README.md` and this file if the new information would help the next development session.

The goal is that a future agent can enter the repository, read `README.md` + `AGENTS.md`, inspect the latest code, and safely continue work without needing the full original chat history.
