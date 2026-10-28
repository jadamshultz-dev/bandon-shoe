import React from 'react';
import { useStore } from '../lib/store.jsx';
import { playerRecords, standings } from '../lib/golf.js';
import { fmtTime } from '../lib/time.js';
import { Pill, Section, TeamDot, Who, go, teamName, useLookups } from '../ui.jsx';
import { resultText, statusLabel } from './MatchCard.jsx';

const fmt = (n) => (Number.isInteger(n) ? String(n) : `${Math.floor(n)}½`.replace(/^0½/, '½'));

export default function Leaderboard() {
  const { me, list, updated } = useStore();
  const { players, courses, teeTimes, settings } = useLookups();
  const results = list('results');
  const st = standings(teeTimes, results, settings, players);
  const rec = playerRecords(teeTimes, results, players);
  const byId = Object.fromEntries(results.map((r) => [r.id, r]));
  const lead = st.pts.DCBG === st.pts.JES ? null : st.pts.DCBG > st.pts.JES ? 'DCBG' : 'JES';
  const share = (team) => (st.total ? (st.pts[team] / st.total) * 100 : 0);

  return (
    <div className="page">
      <header className="page-head">
        <div className="kicker">2026 Halcyon Days Bandon Shoe</div>
        <h1>Leaderboard</h1>
        {updated && <p className="small muted">Scores updated {new Date(updated).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} Pacific · {st.played} of {st.matchCount} matches posted</p>}
      </header>

      {st.clinched && <div className="clinched"><TeamDot team={st.clinched} size={12} /> {teamName(st.clinched, settings)} have clinched the Shoe</div>}

      <div className="board">
        {['DCBG', 'JES'].map((team) => (
          <div key={team} className={`board-team ${team === 'DCBG' ? 'dcbg' : 'jes'} ${lead === team ? 'leading' : ''}`}>
            <div className="board-name">{teamName(team, settings)}</div>
            <div className="board-pts">{fmt(st.pts[team])}</div>
            <div className="board-sub">{st.pts[team] >= st.toWin ? 'Won' : `${fmt(Math.max(0, st.toWin - st.pts[team]))} to win`}</div>
          </div>
        ))}
        <div className="board-bar" aria-hidden="true">
          <span className="seg-dcbg" style={{ width: `${share('DCBG')}%` }} />
          <span className="seg-mid" style={{ left: '50%' }} />
          <span className="seg-jes" style={{ width: `${share('JES')}%` }} />
        </div>
        <div className="board-foot muted small">{st.played} of {st.matchCount} matches posted · {fmt(st.toWin)} points wins · {fmt(st.remaining)} still in play</div>
      </div>

      <Section title="By session">
        <div className="table-wrap">
          <table className="grid">
            <thead><tr><th>Session</th><th>Format</th><th className="num">{teamName('DCBG', settings)}</th><th className="num">{teamName('JES', settings)}</th><th className="num">Posted</th></tr></thead>
            <tbody>
              {(settings.sessions || []).map((s) => {
                const sp = st.sessionPts[s.id] || { DCBG: 0, JES: 0, played: 0, total: 0 };
                return <tr key={s.id}><td>{s.label}</td><td className="muted">{s.format}{s.allowance ? ` · ${Math.round(s.allowance * 100)}%` : ''} · {s.points ?? sp.count} pts</td><td className="num">{fmt(sp.DCBG)}</td><td className="num">{fmt(sp.JES)}</td><td className="num muted">{sp.played}/{sp.count}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Matches">
        <div className="match-list">
          {st.units.map((u) => {
            const t = u.tt;
            const r = byId[u.id]; const s = { DCBG: u.DCBG, JES: u.JES };
            const rt = resultText(r, settings);
            return (
              <button key={u.id} className={`match-row ${r?.status === 'posted' ? `won-${r.winner === 'DCBG' ? 'dcbg' : r.winner === 'JES' ? 'jes' : 'half'}` : ''}`} onClick={() => go(`match-${t.id}`)}>
                <span className="mr-when mono">{(settings.sessions || []).find((x) => x.id === t.session)?.label}{u.singles ? ' singles' : ''} · {fmtTime(t.time)}</span>
                <span className="mr-course">{courses[t.course]?.name}</span>
                <span className="mr-sides">
                  <span>{s.DCBG.map((id) => <Who key={id} pid={id} players={players} me={me} />)}{!s.DCBG.length && <span className="muted">TBD</span>}</span>
                  <span className="muted">v</span>
                  <span>{s.JES.map((id) => <Who key={id} pid={id} players={players} me={me} />)}{!s.JES.length && <span className="muted">TBD</span>}</span>
                </span>
                <span className="mr-result">{rt ? <b>{rt}</b> : <span className="muted small">{statusLabel(r?.status)}</span>}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Player records">
        <div className="table-wrap">
          <table className="grid">
            <thead><tr><th>Player</th><th className="num">W</th><th className="num">L</th><th className="num">H</th><th className="num">Pts</th></tr></thead>
            <tbody>
              {Object.values(players).filter((p) => !p.guest).sort((a, b) => (rec[b.id]?.pts || 0) - (rec[a.id]?.pts || 0) || a.name.localeCompare(b.name)).map((p) => {
                const r = rec[p.id] || { w: 0, l: 0, h: 0, pts: 0 };
                return <tr key={p.id} className={me?.id === p.id ? 'me-row' : ''}><td><Who pid={p.id} players={players} me={me} /> <span className="small">{p.name}</span></td><td className="num">{r.w}</td><td className="num">{r.l}</td><td className="num">{r.h}</td><td className="num strong">{fmt(r.pts)}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
        <p className="note">{st.total} points in the Shoe: 3 in each of the first five sessions and 12 in Saturday singles. {fmt(st.toWin)} wins it. A halved match is ½ point each.</p>
      </Section>
      {!results.length && <p className="center"><Pill>No results posted yet</Pill></p>}
    </div>
  );
}
