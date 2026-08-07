import express from 'express';
import { parse } from 'csv-parse/sync';
import { readFile } from 'node:fs/promises';

const app = express();
const PORT = process.env.PORT || 3000;
const SHEET_ID = process.env.EVENT_SHEET_ID || '1wsjkbC8VClvIx0aQiMXNsNpdIdBE39hQT-bSiWGIslo';
const CACHE_MS = Number(process.env.EVENT_CACHE_MS || 60000);
const KOFI_URL = 'https://ko-fi.com/daleeuw';

let cache = { at: 0, data: null };
let itemCache = { at: 0, data: null };

async function fetchCsv(sheet, range) {
  const params = new URLSearchParams({ tqx: 'out:csv', sheet, range });
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${params}`;
  const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'RancourEvents/0.5' } });
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

function parseTileRequirements(rows, tiles) {
  const tileMap = new Map(tiles.map(tile => [tile.id, tile]));
  const blockStarts = [2, 6, 10, 14, 18]; // BI, BM, BQ, BU, BY when range begins at BG

  for (const start of blockStarts) {
    for (let r = 0; r < rows.length - 2; r++) {
      if (String(rows[r]?.[start] ?? '').trim() !== 'Tile:') continue;

      const tileId = Number(rows[r + 1]?.[start]);
      const tile = tileMap.get(tileId);
      if (!tile) continue;

      const headerRow = rows[r + 2] || [];
      const columns = [
        String(headerRow[start] || 'Item').trim() || 'Item',
        String(headerRow[start + 1] || 'Needed').trim() || 'Needed',
        String(headerRow[start + 2] || 'Earned').trim() || 'Earned',
      ];
      const requirementRows = [];

      for (let j = r + 3; j < rows.length; j++) {
        const item = String(rows[j]?.[start] ?? '').trim();
        const value1 = String(rows[j]?.[start + 1] ?? '').trim();
        const value2 = String(rows[j]?.[start + 2] ?? '').trim();

        if (item === 'Tile:') break;
        if (!item && !value1 && !value2) continue;
        if (!item || item === 'Item') continue;

        const kind = item.toLowerCase() === 'total'
          ? 'total'
          : /subtotal$/i.test(item)
            ? 'subtotal'
            : 'item';

        requirementRows.push({ item, value1, value2, kind });
      }

      tile.requirements = { columns, rows: requirementRows };
    }
  }
}

function parseRecentDrops(rows) {
  const drops = [];

  for (let i = 0; i < rows.length; i++) {
    const dropNumberText = String(rows[i]?.[0] ?? '').trim();
    const drop = String(rows[i]?.[1] ?? '').trim();
    const member = String(rows[i]?.[2] ?? '').trim();
    const tile = String(rows[i]?.[3] ?? '').trim();

    if (!drop || !member) continue;
    if (drop === 'Drop' || member === 'Member Name') continue;
    if (drop.includes('End of Drop List')) continue;

    const numericText = dropNumberText.replace(/[^\d.-]/g, '');
    const parsedNumber = numericText ? Number(numericText) : NaN;
    const tileMatch = tile.match(/^\s*(?:tile\s*)?#?\s*(\d+)\s*$/i);

    drops.push({
      dropNumber: Number.isFinite(parsedNumber) ? parsedNumber : null,
      drop,
      member,
      tile,
      tileId: tileMatch ? Number(tileMatch[1]) : null,
      rowIndex: i,
    });
  }

  drops.sort((a, b) => {
    if (a.dropNumber !== null && b.dropNumber !== null && a.dropNumber !== b.dropNumber) {
      return b.dropNumber - a.dropNumber;
    }
    if (a.dropNumber !== null && b.dropNumber === null) return -1;
    if (a.dropNumber === null && b.dropNumber !== null) return 1;
    return b.rowIndex - a.rowIndex;
  });

  return drops.map(({ dropNumber, drop, member, tile, tileId }) => ({ dropNumber, drop, member, tile, tileId }));
}

function parseTeam(rows, requirementRows, dropRows, index, fallbackName) {
  const tiles = [];
  const roster = [];
  let teamName = fallbackName;

  for (const row of rows) {
    const tileNo = Number(row[0]);
    if (tileNo >= 1 && tileNo <= 36 && row[1] && row[2]) {
      tiles.push({
        id: tileNo,
        content: row[1] || '',
        title: row[2] || '',
        rule: row[3] || '',
        type: row[4] || '',
        difficulty: row[5] || '',
        progress: pct(row[6]),
        requirements: null,
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

  parseTileRequirements(requirementRows, tiles);
  const drops = parseRecentDrops(dropRows);

  const score = tiles.length ? tiles.reduce((a,t)=>a+t.progress,0)/tiles.length : 0;
  return { id: `team-${index+1}`, number: `Team ${String(index+1).padStart(2,'0')}`, name: teamName, score, roster, tiles, drops };
}

async function loadEvent() {
  if (cache.data && Date.now() - cache.at < CACHE_MS) return cache.data;

  const [summary, t1, t2, t3, r1, r2, r3, d1, d2, d3] = await Promise.all([
    fetchCsv('Summary Board','A1:Z64'),
    fetchCsv('Team 01','AB2:AP50'),
    fetchCsv('Team 02','AB2:AP50'),
    fetchCsv('Team 03','AB2:AP50'),
    fetchCsv('Team 01','BG2:CA110'),
    fetchCsv('Team 02','BG2:CA110'),
    fetchCsv('Team 03','BG2:CA110'),
    fetchCsv('Team 01','AX2:BA615'),
    fetchCsv('Team 02','AX2:BA615'),
    fetchCsv('Team 03','AX2:BA615'),
  ]);

  const teamNames = [summary?.[2]?.[15], summary?.[2]?.[16], summary?.[2]?.[17]];
  const teams = [
    parseTeam(t1, r1, d1, 0, teamNames[0] || 'Team 1'),
    parseTeam(t2, r2, d2, 1, teamNames[1] || 'Team 2'),
    parseTeam(t3, r3, d3, 2, teamNames[2] || 'Team 3'),
  ];

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

async function loadItems() {
  if (itemCache.data && Date.now() - itemCache.at < CACHE_MS) return itemCache.data;
  const rows = await fetchCsv('Item List', 'B2:K250');
  const items = [];
  const pets = [];
  let petCategory = 'Boss Pets';

  for (const row of rows) {
    const tile = Number(row[0]);
    if (tile >= 1 && tile <= 36 && row[3]) {
      items.push({
        tile,
        content: row[1] || '',
        tileName: row[2] || '',
        item: row[3] || '',
        dropPoints: row[4] || '',
        price: row[5] || '',
      });
    }

    const petName = String(row[7] || '').trim();
    if (['Boss Pets','Skilling Pets','Other Pets'].includes(petName)) {
      petCategory = petName;
      continue;
    }
    if (petName && petName !== 'Drop Rate' && petName !== 'Include/Exclude') {
      pets.push({
        category: petCategory,
        name: petName,
        dropRate: row[8] || '',
        status: row[9] || '',
      });
    }
  }

  const data = {
    refreshedAt: new Date().toISOString(),
    sheetUrl: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=1301329739#gid=1301329739`,
    items,
    pets,
  };
  itemCache = { at: Date.now(), data };
  return data;
}

async function renderDashboard() {
  const fileUrl = new URL('./public/index.html', import.meta.url);
  let html = await readFile(fileUrl, 'utf8');
  html = html.replace('<title>Rancour Bingo — War Room Skin Demo</title>', '<title>Rancour PvM Summer Bingo 2026</title>');

  const kofiButton = `<a class="btn" href="${KOFI_URL}" target="_blank" rel="noopener noreferrer" style="background:#72a4f2;border-color:#94bdf8;color:#fff;gap:7px" aria-label="Support me on Ko-fi"><span aria-hidden="true">☕</span> Support me on Ko-fi</a>`;
  html = html.replace('<a id="sheetLink"', `${kofiButton}<a id="sheetLink"`);
  html = html.replace('<button class="osrs-btn" id="refreshBtn">', '<a class="osrs-btn" href="/items" style="text-decoration:none">Item List</a><button class="osrs-btn" id="refreshBtn">');

  const requirementCss = `<style>
    .requirements{margin:14px 0;border:2px inset #957a4c;background:#bda778}
    .requirements-title{padding:8px 10px;background:#493a28;color:#ead4a2;font-size:11px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase}
    .requirements-table{width:100%;border-collapse:collapse;font-size:11px}
    .requirements-table th,.requirements-table td{padding:7px 8px;border-bottom:1px solid rgba(82,58,30,.35);text-align:left;vertical-align:top}
    .requirements-table th{background:#c8b486;color:#5e4529;font-size:9px;text-transform:uppercase;letter-spacing:.05em}
    .requirements-table th:nth-child(n+2),.requirements-table td:nth-child(n+2){text-align:right;white-space:nowrap}
    .requirements-table tr.total td{font-weight:bold;background:#a99365;border-top:2px solid #765a34}
    .requirements-table tr.subtotal td{font-weight:bold;background:#b49d6d;color:#5b3b24}
    .requirements-empty{padding:10px;color:#654d31;font-size:10px}
    .recent-drop{padding:7px 9px;border-bottom:1px dotted #594b36}
    .recent-drop:last-child{border-bottom:0}
    .recent-drop-name{font-size:11px;line-height:1.25;color:#e0c47e;font-weight:bold}
    .recent-drop-player{margin-top:2px;font-size:9px;line-height:1.25;color:#99896c}
    .recent-drop-player:before{content:"Received by ";color:#76684f}
    .roster{scrollbar-width:thin;scrollbar-color:#80663d #18140f}
    .roster::-webkit-scrollbar{width:11px}
    .roster::-webkit-scrollbar-track{background:linear-gradient(90deg,#16120e,#211b14);border-left:1px solid #4d3d29;box-shadow:inset 1px 0 #0d0b08}
    .roster::-webkit-scrollbar-thumb{background:linear-gradient(90deg,#5b482d,#8d7040,#5b482d);border:2px solid #211a12;box-shadow:inset 0 0 0 1px #ad8c50}
    .roster::-webkit-scrollbar-thumb:hover{background:linear-gradient(90deg,#6b5433,#a17f49,#6b5433);box-shadow:inset 0 0 0 1px #c5a15d}
    .roster::-webkit-scrollbar-button{display:none;width:0;height:0}
    .roster::-webkit-scrollbar-corner{background:#18140f}
    .tile-drops{margin:14px 0;border:2px inset #957a4c;background:#c5b07f}
    .tile-drop-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:8px 10px;border-bottom:1px dotted rgba(82,58,30,.45);align-items:center}
    .tile-drop-row:last-child{border-bottom:0}
    .tile-drop-name{font-size:11px;font-weight:bold;color:#4f281d}
    .tile-drop-player{font-size:10px;color:#674d2f;white-space:nowrap}
    .tile-drop-player:before{content:"Received by ";color:#806441}
    @media(max-width:520px){.scroll{padding:12px}.requirements-table{font-size:10px}.requirements-table th,.requirements-table td{padding:6px 5px}.tile-drop-row{grid-template-columns:1fr;gap:2px}.tile-drop-player{white-space:normal}}
  </style>`;
  html = html.replace('</head>', `${requirementCss}</head>`);
  html = html.replace('<div class="preview" id="devidence"></div>', '<div class="requirements" id="drequirements"></div><div class="tile-drops" id="dtileDrops"></div><div class="preview" id="devidence"></div>');

  const requirementScript = `<script>
    const originalOpenTile = openTile;
    openTile = function(tile){
      originalOpenTile(tile);
      const box = document.getElementById('drequirements');
      const req = tile && tile.requirements;
      if(!box) return;
      if(!req || !Array.isArray(req.rows) || !req.rows.length){
        box.innerHTML = '<div class="requirements-title">Tile requirements</div><div class="requirements-empty">No item requirement rows are configured for this tile.</div>';
        return;
      }
      const cols = req.columns || ['Item','Needed','Earned'];
      const rows = req.rows.map(row => '<tr class="'+esc(row.kind||'item')+'"><td>'+esc(row.item)+'</td><td>'+esc(row.value1||'—')+'</td><td>'+esc(row.value2||'—')+'</td></tr>').join('');
      box.innerHTML = '<div class="requirements-title">Live tile requirements — '+esc((data.teams[state.team]||{}).name||'Current team')+'</div><table class="requirements-table"><thead><tr><th>'+esc(cols[0]||'Item')+'</th><th>'+esc(cols[1]||'Needed')+'</th><th>'+esc(cols[2]||'Earned')+'</th></tr></thead><tbody>'+rows+'</tbody></table>';
    };

    function dropMatchesTile(entry,tile){
      if(Number(entry?.tileId) === Number(tile?.id)) return true;
      const ref = String(entry?.tile || '').trim().toLowerCase();
      const title = String(tile?.title || '').trim().toLowerCase();
      if(!ref) return false;
      if(ref === title || ref === String(tile.id) || ref === 'tile '+tile.id || ref === '#'+tile.id) return true;
      const match = ref.match(/^tile\s*#?\s*(\d+)\b/i);
      return !!match && Number(match[1]) === Number(tile.id);
    }

    const openTileWithRequirements = openTile;
    openTile = function(tile){
      openTileWithRequirements(tile);
      const box = document.getElementById('dtileDrops');
      const team = data?.teams?.[state.team] || data?.teams?.[0];
      const contributions = Array.isArray(team?.drops) ? team.drops.filter(entry => dropMatchesTile(entry,tile)) : [];
      if(box){
        box.innerHTML = contributions.length
          ? '<div class="requirements-title">Contributing drops — '+contributions.length+'</div>'+contributions.map(entry => '<div class="tile-drop-row"><div class="tile-drop-name">'+esc(entry.drop)+'</div><div class="tile-drop-player">'+esc(entry.member)+'</div></div>').join('')
          : '<div class="requirements-title">Contributing drops</div><div class="requirements-empty">No drops are currently linked to this tile for '+esc(team?.name||'this team')+'.</div>';
      }
      const evidence = document.getElementById('devidence');
      if(evidence){
        const p = tileProgress(tile);
        evidence.textContent = contributions.length
          ? 'These drops are linked to this tile in the team worksheet.'
          : p > 0
            ? 'Progress is recorded for this tile, but there are no linked drop rows currently available.'
            : 'No approved progress or linked drops are currently recorded for this tile.';
      }
    };

    const standingsFrame = document.getElementById('leaderboard')?.closest('.frame');
    if(standingsFrame && !document.getElementById('recentDrops')){
      standingsFrame.insertAdjacentHTML('afterend','<section class="frame"><div class="frame-title">Recent Drops</div><div id="recentDrops"><div class="empty">No drops logged yet</div></div></section>');
    }

    function renderRecentDrops(){
      const box = document.getElementById('recentDrops');
      if(!box || !data || !data.teams?.length) return;
      const team = data.teams[state.team] || data.teams[0];
      const drops = Array.isArray(team?.drops) ? team.drops.slice(0,10) : [];
      box.innerHTML = drops.length
        ? drops.map(entry => '<div class="recent-drop"><div class="recent-drop-name">'+esc(entry.drop)+'</div><div class="recent-drop-player">'+esc(entry.member)+'</div></div>').join('')
        : '<div class="empty">No drops logged for this team yet.</div>';
    }

    const originalRenderRightForDrops = renderRight;
    renderRight = function(){
      originalRenderRightForDrops();
      renderRecentDrops();
    };
    if(data) renderRecentDrops();
  </script>`;
  html = html.replace('</body>', `${requirementScript}</body>`);
  return html;
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
app.get('/api/items', async (_req,res) => {
  try {
    const data = await loadItems();
    res.set('Cache-Control','public, max-age=30');
    res.json(data);
  } catch (error) {
    console.error('Item list refresh failed:', error);
    res.status(503).json({ error: error.message });
  }
});
app.get('/', async (_req,res,next) => {
  try {
    res.type('html').send(await renderDashboard());
  } catch (error) {
    next(error);
  }
});
app.get('/items', (_req,res)=>res.sendFile(new URL('./public/items.html', import.meta.url).pathname));
app.use(express.static('public'));
app.get('*', (_req,res)=>res.sendFile(new URL('./public/index.html', import.meta.url).pathname));
app.listen(PORT, '0.0.0.0', ()=>console.log(`Rancour Events listening on ${PORT}`));
