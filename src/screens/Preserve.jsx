import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { stablefordPoints, equitableAdjustments } from '../lib/golf.js';
import { Back, PageHead, Section, TeamDot, useLookups } from '../ui.jsx';

// Thursday's optional Bandon Preserve round: open Stableford scorecard any participant can fill in.
export const PRESERVE_PLAYERS = ['sc', 'joel', 'mp', 'mt', 'jon', 'ap', 'aw', 'court'];
const API = '/api/preserve';
const LOCAL = 'bandon-shoe-preserve-draft';
const blank = () => Array(13).fill(null);
const total = (holes) => (holes || []).reduce((s, h) => s + (stablefordPoints(h) ?? 0), 0);
const thru = (holes) => (holes || []).filter((h) => h !== null && h !== undefined).length;
// Starting points: 13/18 (0.722) of the player's Handicap Index after Wednesday's adjustments, rounded down.
export const START_FACTOR = 13 / 18;
export const startingPoints = (index, adj = 0) => (index === null || index === undefined ? 0 : Math.floor((Number(index) + adj) * START_FACTOR));
const strokes = (holes) => (holes || []).reduce((s, h) => s + (h || 0), 0);

export default function Preserve() {
  const { me } = useStore();
  const { players, courses, teeTimes, settings } = useLookups();
  const { list } = useStore();
  const course = courses['bandon-preserve'];
  const holes = course?.holes || [];
  const [scores, setScores] = useState({});
  const [status, setStatus] = useState('loading'); // loading | ok | offline | unavailable
  const [who, setWho] = useState(() => (PRESERVE_PLAYERS.includes(me?.id) ? me.id : null));
  const [card, setCard] = useState(blank);
  const [saving, setSaving] = useState('');
  const dirty = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(API, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setScores(data.scores || {});
      setStatus('ok');
    } catch {
      setStatus(navigator.onLine ? 'unavailable' : 'offline');
    }
  }, []);

  useEffect(() => { load(); const iv = setInterval(load, 15000); return () => clearInterval(iv); }, [load]);

  // When switching player (or when fresh data arrives and nothing is being typed), show that player's saved card.
  useEffect(() => {
    if (!who || dirty.current) return;
    let draft = null;
    try { draft = JSON.parse(localStorage.getItem(LOCAL) || 'null'); } catch { /* ignore */ }
    const saved = scores[who]?.holes;
    setCard(draft?.player === who && draft.pending ? draft.holes : saved || blank());
  }, [who, scores]);

  const save = useCallback(async (player, next) => {
    setSaving('Saving…');
    try { localStorage.setItem(LOCAL, JSON.stringify({ player, holes: next, pending: true })); } catch { /* ignore */ }
    try {
      const res = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ player, holes: next }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || String(res.status));
      setScores((s) => ({ ...s, [player]: data.card }));
      try { localStorage.setItem(LOCAL, JSON.stringify({ player, holes: next, pending: false })); } catch { /* ignore */ }
      setSaving('Saved');
      dirty.current = false;
    } catch {
      setSaving(navigator.onLine ? 'Couldn’t save. Tap a score again to retry.' : 'No signal. Saved on this phone; it will send when you’re back in range.');
    }
  }, []);

  // Retry a pending card when signal returns.
  useEffect(() => {
    const retry = () => {
      try {
        const d = JSON.parse(localStorage.getItem(LOCAL) || 'null');
        if (d?.pending) save(d.player, d.holes);
      } catch { /* ignore */ }
    };
    window.addEventListener('online', retry);
    retry();
    return () => window.removeEventListener('online', retry);
  }, [save]);

  const setHole = (i, v) => {
    const next = [...card];
    next[i] = v;
    dirty.current = true;
    setCard(next);
    save(who, next);
  };

  const results = list('results');
  const eq = equitableAdjustments(teeTimes, results, players, settings, 'thu');
  const wedIds = teeTimes.filter((x) => x.session === 'wed-am' || x.session === 'wed-pm').map((x) => x.id);
  const wedDone = wedIds.every((id) => results.some((r) => r.id === id));
  const start = Object.fromEntries(PRESERVE_PLAYERS.map((p) => [p, startingPoints(players[p]?.index, eq[p] || 0)]));
  const grand = (p, h) => start[p] + total(h);
  const board = PRESERVE_PLAYERS.map((p) => ({ p, holes: scores[p]?.holes })).sort((a, b) => grand(b.p, b.holes) - grand(a.p, a.holes) || thru(b.holes) - thru(a.holes));
  const leaderPts = grand(board[0]?.p, board[0]?.holes);
  const anyStarted = board.some((x) => thru(x.holes));

  return (
    <div className="page">
      <Back to="myday" label="My Day" />
      <PageHead kicker="Thursday Nov 5 · 8:00 & 8:15 · 13 par-3 holes" title="Preserve Stableford">
        <p className="small">Ace 10 · Birdie 5 · Par 3 · Bogey 1 · Worse 0. Anything worse than bogey goes in as a 5. Gross scores, plus starting points from your handicap. Any player can enter his own card.</p>
      </PageHead>

      {status === 'unavailable' && <p className="note bad">Scores can’t load right now. Try again in a minute.</p>}
      {status === 'offline' && <p className="note">No signal. Standings will refresh when you’re back in range.</p>}

      <Section title="Standings" aside={<span className="muted small">Updates every 15 seconds</span>}>
        <div className="table-wrap">
          <table className="grid">
            <thead><tr><th>Player</th><th className="num th-wrap" title="13/18 of handicap after Wednesday">Starting<br />pts</th><th className="num">Thru</th><th className="num">Pts</th><th className="num">Total</th></tr></thead>
            <tbody>
              {board.map(({ p, holes: h }) => (
                <tr key={p} className={who === p ? 'me-row' : ''}>
                  <td><span className="who"><TeamDot team={players[p]?.team} />{players[p]?.initials}</span></td>
                  <td className="num">{start[p]}</td>
                  <td className="num">{thru(h) || '—'}</td>
                  <td className="num">{thru(h) ? total(h) : '—'}</td>
                  <td className="num strong">{grand(p, h)}{anyStarted && grand(p, h) === leaderPts ? ' ★' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">Starting points are 13/18 of each player’s Handicap Index after Wednesday’s +1/−1 adjustments, rounded down (e.g. 12.7 × 0.722 = 9.17 → 9). Total = starting points + Stableford points.{!wedDone && ' Wednesday’s results aren’t all posted yet, so these will update once they are.'}</p>
      </Section>

      <Section title="Enter a card">
        <div className="pick-grid">
          {PRESERVE_PLAYERS.map((p) => (
            <button key={p} className={`pick ${who === p ? 'on' : ''}`} onClick={() => { dirty.current = false; setWho(p); setSaving(''); }}>
              <TeamDot team={players[p]?.team} /> <span>{players[p]?.name}</span>
            </button>
          ))}
        </div>
        {!who && <p className="note">Tap a name to enter that player’s scores.</p>}
        {who && (
          <>
            <div className="sf-head">
              <span className="strong">{players[who]?.name}</span>
              <span className="sf-total">{start[who] + total(card)} total</span>
              <span className="muted small">{start[who]} starting + {total(card)} pts · {thru(card)} of 13 · {strokes(card) || 0} strokes</span>
            </div>
            <div className="sf-grid">
              {holes.map((h, i) => {
                const pts = stablefordPoints(card[i], h.par);
                return (
                  <div key={h.n} className="sf-hole">
                    <div className="sf-n">{h.n}</div>
                    <div className="muted sf-yds">{h.yards?.Back} yd</div>
                    <select id={`sf-${who}-${h.n}`} aria-label={`Hole ${h.n} score`} value={card[i] ?? ''} onChange={(e) => setHole(i, e.target.value === '' ? null : Number(e.target.value))}>
                      <option value="">–</option>
                      {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v === 5 ? '5+' : v}</option>)}
                    </select>
                    <div className={`sf-pts ${pts === null ? '' : pts >= 5 ? 'hot' : pts === 0 ? 'cold' : ''}`}>{pts === null ? '' : `${pts} pt${pts === 1 ? '' : 's'}`}</div>
                  </div>
                );
              })}
            </div>
            {saving && <p className={`small ${saving.startsWith('Saved') ? 'muted' : saving === 'Saving…' ? 'muted' : 'note bad'}`}>{saving}</p>}
          </>
        )}
      </Section>
    </div>
  );
}
