# Rancour Events

Live event dashboards for Rancour PvM.

## Current deployment

The initial app is a live dashboard for the 2026 clan bingo. It reads team rosters, tile rules and tile progress from the existing Google Sheet and refreshes the browser every 60 seconds.

## Environment variables

- `EVENT_SHEET_ID` — defaults to the current Rancour bingo workbook.
- `EVENT_CACHE_MS` — server-side Google Sheet cache duration in milliseconds; defaults to `60000`.

## Google Sheet access

The first release uses Google Visualization CSV export so the workbook must be anonymously readable (for example, **Anyone with the link → Viewer**). Google credentials are not sent to the browser.

If the event workbook must remain private, replace the `fetchCsv` implementation with authenticated Google Sheets API access using a Railway service-account secret.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Health check

`GET /health`

## Live data API

`GET /api/event`
