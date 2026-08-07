# Rancour Events

Reusable live event dashboards for **Rancour PvM**.

The repository currently powers the 2026 clan bingo, but it is intended to be reused for future Rancour events rather than rebuilt for each competition.

## What the app does

The app reads event data from a Google Sheets workbook and presents it as an OSRS-inspired war-room website.

Current pages:

- `/` — event statistics landing page
- `/bingo?team=1` — team bingo board; change `team` to select another team
- `/items` — eligible bingo items and pet list

Current API endpoints:

- `GET /health` — Railway health check
- `GET /api/event` — teams, rosters, board progress, requirements, drops and bounties
- `GET /api/stats` — team and individual event leaderboards
- `GET /api/items` — item and pet catalogue

The browser refreshes live data every 60 seconds. The server also caches Google Sheet reads to reduce repeated requests.

## Current architecture

```text
Google Sheets workbook
        |
        | CSV reads via Google Visualization endpoint
        v
     server.js
        |
        +--> /api/event
        +--> /api/stats
        +--> /api/items
        |
        v
Static HTML/CSS/JS war-room UI
        |
        v
Railway deployment
```

This version deliberately keeps the frontend framework-free. Express serves the APIs and static files from `public/`.

## Repository structure

```text
RancourEvents/
├── AGENTS.md              # Instructions/context for AI coding agents
├── README.md              # Project and reuse documentation
├── package.json
├── railway.toml
├── server.js              # Sheet ingestion, parsing, APIs and page rendering
└── public/
    ├── index.html          # Team bingo board
    ├── stats.html          # Stats landing page
    ├── items.html          # Item/pet ledger
    ├── site-nav.js         # Shared persistent navigation
    └── site-nav.css        # Shared navigation styling
```

## Google Sheet contract

The current implementation expects the event workbook to retain the existing tab names and approximate layouts.

### Team sheets

Current tabs:

- `Team 01`
- `Team 02`
- `Team 03`

Important ranges/columns used by the app:

| Data | Current source |
| --- | --- |
| Tile catalogue/progress and roster | `AB:AT` |
| Drop Points per player | `AR` |
| EHB Gained per player | `AT` |
| Team drop tracking | `AX:BA` |
| Tile requirement blocks | `BG:CA` |

The roster parser excludes summary/totals rows by requiring a genuine Discord ID.

### Other tabs

| Purpose | Tab / range |
| --- | --- |
| Team-name summary/reference | `Summary Board` |
| Item and pet catalogue | `Item List` — currently read from `B:K` |
| Team/individual stats | `Bingo Stats` — currently read from `B:U` |
| Bounty rankings | `Bounty Tracker` — currently read from `B:X` |

If a future workbook changes these structures, update the parsing ranges and indexes in `server.js` rather than inserting event-specific workarounds into the frontend.

## Current UI behaviour

### Persistent navigation

The shared navigation appears across the site and contains:

- Event Stats
- each team banner/board
- Item List

Team banners show team name, player count and board progress. Selecting a team while already on the bingo page switches the active board immediately and updates the `?team=` URL.

### Team board

Each board displays 36 tiles and supports filtering by:

- completion status
- difficulty
- content/category

Clicking a tile opens a fixed-size, scrollable detail window containing:

- tile rule and metadata
- live requirement rows from the team's worksheet
- contributing drops linked to that tile
- the player who received each contributing drop

The right rail currently includes:

- Bounty Board with current leader(s)
- Clan Standings
- Recent Drops — latest 10 for the selected team
- Event Status

The left rail contains the persistent navigation and Team Roster. The roster currently shows:

- RSN
- Drop Points
- EHB Gained

## Reusing the project for a future event

The simplest reuse path is to preserve the workbook contract and change configuration rather than fork the code.

1. **Create or duplicate the new event workbook.**
   - Keep the expected tabs/ranges where practical.
   - Keep stable team IDs such as `Team 01`, `Team 02`, etc.

2. **Point the app at the new workbook.**
   - Set `EVENT_SHEET_ID` in Railway to the new spreadsheet ID.

3. **Update event presentation.**
   - event name/title
   - dates/status copy
   - team count if it changes
   - event-specific navigation entries if needed
   - branding only when intentionally changing the Rancour theme

4. **Update parsers only when the workbook schema changes.**
   - Prefer adapting `server.js` into a reusable parser over hard-coding new data into HTML.

5. **Validate before event launch.**
   - `/health` returns `200`
   - `/api/event` contains all expected teams and tiles
   - `/api/stats` contains the expected leaderboard panels
   - `/api/items` contains the expected catalogue
   - every team selector opens the correct board
   - long tile requirement lists scroll correctly
   - empty data displays an empty state rather than fake leaders/progress

6. **Deploy.**
   - Railway is connected to the GitHub repository and deploys changes from `main`.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `EVENT_SHEET_ID` | Google Sheet workbook ID | current bingo workbook |
| `EVENT_CACHE_MS` | server-side Sheet cache duration in milliseconds | `60000` |
| `PORT` | HTTP port | `3000` locally; Railway supplies its own |

## Google Sheet access

The current implementation uses the Google Visualization CSV endpoint. The workbook therefore needs to be anonymously readable, for example:

**Anyone with the link → Viewer**

No Google credentials are sent to the browser.

For a private workbook, replace `fetchCsv()` with authenticated Google Sheets API access using a server-side service account or another trusted credential. Never expose Google credentials in frontend JavaScript.

## Local development

Requirements:

- Node.js 18+
- npm

Install and start:

```bash
npm install
npm start
```

Then open:

```text
http://localhost:3000
```

Useful checks after changes:

```bash
node --check server.js
```

There is currently no automated test suite, so verify the API endpoints and core pages manually after parser or UI changes.

## Design principles

The current visual direction is intentionally **OSRS clan war-room**, not a generic SaaS dashboard.

Keep:

- dark wood/stone textures
- parchment content surfaces
- brass/gold framing
- Rancour red for primary emphasis
- green primarily for success/completion
- serif typography
- compact game-like information density

Avoid introducing generic glassmorphism, oversized rounded cards, bright SaaS colours or unrelated design systems unless the event is intentionally being reskinned.

## Future architecture direction

The current workbook-driven design is suitable for the bingo event, but the longer-term goal is a reusable event platform where nontechnical staff can configure events without editing formulas or code.

A future canonical event model should separate:

- Event Setup
- Teams
- Challenges / Tiles
- Progress
- Submissions
- Bounties / Prizes

The website, Discord bot and RuneLite integrations should ultimately consume the same event API instead of relying on individual spreadsheet layouts.

See [`AGENTS.md`](./AGENTS.md) for implementation rules and context intended for Codex/AI development sessions.
