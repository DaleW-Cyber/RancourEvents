import express from 'express';
import crypto from 'node:crypto';
import { parse } from 'csv-parse/sync';

const FEEDBACK_SHEET_ID = process.env.FEEDBACK_SHEET_ID || '1q5d4ogALQ5qrNr0qz3godAX0TYHH14E53ShJ5VvPQyE';
const FEEDBACK_SHEET_NAME = process.env.FEEDBACK_SHEET_NAME || 'Responses';
const SERVICE_ACCOUNT_JSON = process.env.FEEDBACK_GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

let tokenCache = { accessToken: '', expiresAt: 0 };

const fieldOrder = [
  'identity', 'enjoyment', 'futureLikelihood', 'length', 'difficulty', 'balance',
  'enjoyedTiles', 'dislikedTiles', 'teamFairness', 'contribution', 'motivations',
  'rulesClarity', 'dashboardRating', 'dashboardFeatures', 'missingDashboard',
  'playerStatsUsefulness', 'bountyRating', 'sideObjectives', 'keep', 'improve',
  'futureIdeas', 'other',
];

const requiredFields = [
  'enjoyment', 'futureLikelihood', 'length', 'difficulty', 'balance', 'teamFairness',
  'contribution', 'motivations', 'rulesClarity', 'dashboardRating',
  'playerStatsUsefulness', 'bountyRating', 'sideObjectives',
];

function base64Url(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function readServiceAccount() {
  if (!SERVICE_ACCOUNT_JSON) return null;
  try {
    const value = JSON.parse(SERVICE_ACCOUNT_JSON);
    if (!value?.client_email || !value?.private_key) return null;
    return value;
  } catch (error) {
    console.error('Invalid FEEDBACK_GOOGLE_SERVICE_ACCOUNT_JSON:', error.message);
    return null;
  }
}

async function getGoogleAccessToken() {
  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt - 60000) return tokenCache.accessToken;
  const account = readServiceAccount();
  if (!account) {
    const error = new Error('Feedback submission storage is not configured.');
    error.code = 'FEEDBACK_NOT_CONFIGURED';
    throw error;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64Url(JSON.stringify({ iss: account.client_email, scope: SHEETS_SCOPE, aud: GOOGLE_TOKEN_URL, iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${claim}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).end().sign(account.private_key);
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || payload.error || `Google OAuth returned ${response.status}`);
  tokenCache = { accessToken: payload.access_token, expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000 };
  return tokenCache.accessToken;
}

function cleanText(value, max = 4000) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, max);
}

function cleanList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => cleanText(item, 120)).filter(Boolean))].slice(0, 20);
}

function normaliseFeedback(body) {
  const result = {};
  for (const key of fieldOrder) result[key] = ['motivations', 'dashboardFeatures'].includes(key) ? cleanList(body?.[key]) : cleanText(body?.[key]);
  return result;
}

function validateFeedback(feedback) {
  const missing = requiredFields.filter(key => Array.isArray(feedback[key]) ? feedback[key].length === 0 : !String(feedback[key] || '').trim());
  if (missing.length) return 'Please answer all required questions.';
  const numericChecks = [['enjoyment',1,10],['futureLikelihood',1,10],['balance',1,5],['teamFairness',1,5],['rulesClarity',1,5],['dashboardRating',1,5]];
  for (const [key,min,max] of numericChecks) {
    const value = Number(feedback[key]);
    if (!Number.isFinite(value) || value < min || value > max) return `Invalid value supplied for ${key}.`;
  }
  if (!['1','2','3','4','5','Did not use it'].includes(feedback.playerStatsUsefulness)) return 'Invalid player stats usefulness value.';
  if (!['1','2','3','4','5','Did not follow bounties'].includes(feedback.bountyRating)) return 'Invalid bounty rating value.';
  return '';
}

function feedbackRow(feedback, responseId) {
  return [
    new Date().toISOString(), responseId, feedback.identity, feedback.enjoyment, feedback.futureLikelihood,
    feedback.length, feedback.difficulty, feedback.balance, feedback.enjoyedTiles, feedback.dislikedTiles,
    feedback.teamFairness, feedback.contribution, feedback.motivations.join(' | '), feedback.rulesClarity,
    feedback.dashboardRating, feedback.dashboardFeatures.join(' | '), feedback.missingDashboard,
    feedback.playerStatsUsefulness, feedback.bountyRating, feedback.sideObjectives, feedback.keep,
    feedback.improve, feedback.futureIdeas, feedback.other,
  ];
}

async function appendFeedback(row) {
  const accessToken = await getGoogleAccessToken();
  const range = encodeURIComponent(`${FEEDBACK_SHEET_NAME}!A:X`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${FEEDBACK_SHEET_ID}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Google Sheets returned ${response.status}`);
}

async function fetchFeedbackRows() {
  const params = new URLSearchParams({ tqx: 'out:csv', sheet: FEEDBACK_SHEET_NAME, range: 'A:X' });
  const url = `https://docs.google.com/spreadsheets/d/${FEEDBACK_SHEET_ID}/gviz/tq?${params}`;
  const response = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'RancourEvents/1.0 (+Feedback Results)' } });
  if (!response.ok) throw new Error(`Google Sheets returned ${response.status}`);
  const text = await response.text();
  if (text.trim().startsWith('<!DOCTYPE html') || text.includes('accounts.google.com')) throw new Error('Feedback Sheet is not anonymously readable.');
  const rows = parse(text, { relax_column_count: true, skip_empty_lines: true });
  const headers = (rows.shift() || []).map(value => String(value || '').trim());
  const records = rows.filter(row => row.some(value => String(value || '').trim())).map(row => Object.fromEntries(headers.map((header,index) => [header,String(row[index] ?? '').trim()])));
  return { headers, records };
}

export function registerFeedbackRoutes(app) {
  app.post('/api/feedback', express.json({ limit: '120kb' }), async (req, res) => {
    try {
      const feedback = normaliseFeedback(req.body || {});
      const validationError = validateFeedback(feedback);
      if (validationError) return res.status(400).json({ error: validationError });
      const responseId = crypto.randomUUID();
      await appendFeedback(feedbackRow(feedback, responseId));
      res.set('Cache-Control', 'no-store');
      return res.status(201).json({ ok: true, responseId });
    } catch (error) {
      console.error('Feedback submission failed:', error);
      return res.status(error.code === 'FEEDBACK_NOT_CONFIGURED' ? 503 : 502).json({ error: error.message || 'Unable to submit feedback.' });
    }
  });

  app.get('/api/feedback-results', async (_req, res) => {
    try {
      const result = await fetchFeedbackRows();
      res.set('Cache-Control', 'no-store');
      return res.json({ ...result, refreshedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Feedback results refresh failed:', error);
      return res.status(503).json({ error: error.message || 'Unable to load feedback results.' });
    }
  });

  app.get('/feedback', (_req, res) => res.sendFile(new URL('./public/feedback.html', import.meta.url).pathname));
  app.get('/feedback-results', (_req, res) => res.sendFile(new URL('./public/feedback-results.html', import.meta.url).pathname));
}
