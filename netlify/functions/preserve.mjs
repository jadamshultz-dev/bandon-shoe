// Thursday Preserve Stableford scores, stored in Netlify Blobs (no database or keys needed).
//   GET  /api/preserve            -> { scores: { <playerId>: { holes: [13 numbers or null], updated } } }
//   POST /api/preserve            body { player, holes }  -> saves that player's card
// Only the eight Preserve players can be saved; scores are whole numbers 1–5 (worse than bogey is recorded as 5).
import { getStore } from '@netlify/blobs';

const PLAYERS = ['sc', 'joel', 'mp', 'mt', 'jon', 'ap', 'aw', 'court'];
const HOLES = 13;
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

export default async (req) => {
  const store = getStore({ name: 'preserve-2026', consistency: 'strong' });
  if (req.method === 'GET') {
    const scores = {};
    await Promise.all(PLAYERS.map(async (p) => {
      const card = await store.get(p, { type: 'json' });
      if (card) scores[p] = card;
    }));
    return json({ scores });
  }
  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
    const { player, holes } = body || {};
    if (!PLAYERS.includes(player)) return json({ error: 'Not a Preserve player' }, 400);
    if (!Array.isArray(holes) || holes.length !== HOLES) return json({ error: 'Need 13 holes' }, 400);
    const clean = holes.map((h) => (h === null || h === '' || h === undefined ? null : Number(h)));
    if (clean.some((h) => h !== null && (!Number.isInteger(h) || h < 1))) return json({ error: 'Scores must be 1–5' }, 400);
    for (let i = 0; i < clean.length; i++) if (clean[i] !== null && clean[i] > 5) clean[i] = 5; // anything worse than bogey counts as 5
    const card = { holes: clean, updated: new Date().toISOString() };
    await store.setJSON(player, card);
    return json({ ok: true, card });
  }
  return json({ error: 'Method not allowed' }, 405);
};

export const config = { path: '/api/preserve' };
