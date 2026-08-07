import express from 'express';
import { parse } from 'csv-parse/sync';

const app = express();
const PORT = process.env.PORT || 3000;
const SHEET_ID = process.env.EVENT_SHEET_ID || '1wsjkbC8VClvIx0aQiMXNsNpdIdBE39hQT-bSiWGIslo';
const CACHE_MS = Number(process.env.EVENT_CACHE_MS || 60000);

let cache = { at: 0, data: null };

async function fetchCsv(sheet, range) {
  const params = new URLSearchParams({ tqx: 'out:csv', sheet, range });
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${params}`;
  const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'RancourEvents/0.1' } });
  if (!res.ok) throw new Error(`Google Sheets returned ${res.status} for ${sheet}`);
  const text = await res.text();
  if (text.trim().startsWith('<!DOCTYPE html') || text.includes('accounts.google.com')) {
    throw new Error('Google Sheet is not anonymously readable. Share it as Anyone with the link: Viewer, or configure authenticated Sheets access.');
  }
  return parse(text, { relax_column_count: true, skip_empty_lines: false });
}

function pct(value) {
  const n = Number(String(value ?? '').replace('%','').trim());
  return Number.isFinite(n) ? n : 0;
}

function parseTeam(rows, index, fallbackName) {
  const tiles = [];
  const roster = [];
  let teamName = fallbackName;
  for (const row of rows) {
    const tileNo = Number(row[0]);
    if (tileNo >= 1 && tileNo <= 36) {
      tiles.push({
        id: tileNo,
        content: row[1] || '',
        title: row[2] || '',
        rule: row[3] || '',
        type: row[4] || '',
        difficulty: row[5] || '',
        progress: pct(row[6]),
      });
    }
    const memberNo = Number(row[10]);
    if (memberNo > 0 && row[12]) {
      roster.push({
        number: memberNo,
        discordId: row[11] || '',
        name: row[12],
        timezone: row[13] || '',
        rank: row[14] || '',
      });
    }
    if (String(row[2]).trim() === 'Team Name:' && row[3]) teamName = row[3];
  }
  const score = tiles.length ? tiles.reduce((a,t)=>a+t.progress,0)/tiles.length : 0;
  return { id: `team-${index+1}`, number: `Team ${String(index+1).padStart(2,'0')}`, name: teamName, score, roster, tiles };
}

async function loadEvent() {
  if (cache.data && Date.now() - cache.at < CACHE_MS) return cache.data;
  const [summary, t1, t2, t3, bounty] = await Promise.all([
    fetchCsv('Summary Board','A1:Z64'),
    fetchCsv('Team 01','AB2:AP50'),
    fetchCsv('Team 02','AB2:AP50'),
    fetchCsv('Team 03','AB2:AP50'),
    fetchCsv('Bounty Tracker','A1:Q20'),
  ]);

  const teamNames = [summary?.[2]?.[15], summary?.[2]?.[16], summary?.[2]?.[17]];
  const teams = [t1,t2,t3].map((rows,i)=>parseTeam(rows,i,teamNames[i] || `Team ${i+1}`));
  const bounties = [
    { name: 'Most Nightmare / PNM KC', prize: 25 },
    { name: 'Most Mad Angel KC', prize: 25 },
    { name: 'Most HMT KC', prize: 25 },
    { name: 'Most CM KC', prize: 25 },
    { name: 'Most EHB Earned', prize: 25 },
    { name: 'Most Pets', prize: 25 },
  ];

  const data = {
    title: 'Rancour PvM 2026 Bingo',
    workbookTitle: 'Rancour Summer Bingo 2026',
    sheetUrl: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`,
    refreshedAt: new Date().toISOString(),
    teams,
    bounties,
  };
  cache = { at: Date.now(), data };
  return data;
}

app.get('/health', (_req,res)=>res.json({ status: 'ok' }));
app.get('/api/event', async (_req,res) => {
  try {
    const data = await loadEvent();
    res.set('Cache-Control','public, max-age=30');
    res.json(data);
  } catch (error) {
    console.error('Event data refresh failed:', error);
    res.status(503).json({ error: error.message });
  }
});
app.use(express.static('public'));
app.get('*', (_req,res)=>res.sendFile(new URL('./public/index.html', import.meta.url).pathname));
app.listen(PORT, '0.0.0.0', ()=>console.log(`Rancour Events listening on ${PORT}`));
