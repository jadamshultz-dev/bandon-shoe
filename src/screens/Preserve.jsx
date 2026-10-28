import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { stablefordPoints } from '../lib/golf.js';
import { Back, PageHead, Section, TeamDot, useLookups } from '../ui.jsx';

// Thursday's optional Bandon Preserve round: open Stableford scorecard any participant can fill in.
export const PRESERVE_PLAYERS = ['sc', 'joel', 'mp', 'mt', 'jon', 'ap', 'aw', 'court'];
const API = '/api/preserve';
const LOCAL = 'bandon-shoe-preserve-draft';
const blank = () => Array(13).fill(null);
const total = (holes) => (holes || []).reduce((s, h) => s + (stablefordPoints(h) ?? 0), 0);
const thru = (holes) => (holes || []).filter((h) => h !== null && h !== undefined).length;
const strokes = (holes) => (holes || []).reduce((s, h) => s + (h || 0), 0);

export default function Preserve() {
  const { me } = useStore();
  const { players, courses } = useLookups();
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

  const board = PRESERVE_PLAYERS.map((p) => ({ p, holes: scores[p]?.holes })).sort((a, b) => total(b.holes) - total(a.holes) || thru(b.holes) - thru(a.holes));
  const leaderPts = total(board[0]?.holes);

  return (
    <div className="page">
      <Back to="myday" label="My Day" />
      <PageHead kicker="Thursday Nov 5 · 8:00 & 8:15 · 13 par-3 holes" title="Preserve Stableford">
        <p className="small">Ace 10 · Birdie 5 · Par 3 · Bogey 1 · Worse 0. Gross scores, no handicaps. Any player can enter his own card.</p>
      </PageHead>

      {status === 'unavailable' && <p className="note bad">Scores can’t load right now. Try again in a minute.</p>}
      {status === 'offline' && <p className="note">No signal. Standings will refresh when you’re back in range.</p>}

      <Section title="Standings" aside={<span className="muted small">Updates every 15 seconds</span>}>
        <div className="table-wrap">
          <table className="grid">
            <thead><tr><th>Player</th><th className="num">Thru</th><th className="num">Strokes</th><th className="num">Points</th></tr></thead>
            <tbody>
              {board.map(({ p, holes: h }) => (
                <tr key={p} className={who === p ? 'me-row' : ''}>
                  <td><span className="who"><TeamDot team={players[p]?.team} />{players[p]?.initials}</span></td>
                  <td className="num">{thru(h) || '—'}</td>
                  <td className="num">{thru(h) ? strokes(h) : '—'}</td>
                  <td className="num strong">{thru(h) ? total(h) : '—'}{thru(h) && total(h) === leaderPts && leaderPts > 0 ? ' ★' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
              <span className="sf-total">{total(card)} pts</span>
              <span className="muted small">{thru(card)} of 13 · {strokes(card) || 0} strokes</span>
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
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((v) => <option key={v} value={v}>{v}</option>)}
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
