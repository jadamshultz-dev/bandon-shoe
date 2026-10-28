import React from 'react';
import { useStore } from '../lib/store.jsx';
import { matchStrokes, matchUnits } from '../lib/golf.js';
import { dayLabel, fmtTime } from '../lib/time.js';
import { Back, Pill, Who, useLookups, teamName, TeamDot, go } from '../ui.jsx';

export function sides(tt, players) {
  const ids = (tt.players || []).filter(Boolean);
  return {
    DCBG: ids.filter((id) => players[id]?.team === 'DCBG'),
    JES: ids.filter((id) => players[id]?.team === 'JES'),
  };
}

export function resultText(r, settings) {
  if (!r || r.status !== 'posted') return null;
  if (r.winner === 'halved') return 'Halved';
  return `${teamName(r.winner, settings)} ${r.margin || 'won'}`;
}

/** One-line result for a whole tee time (a singles group holds four matches). */
export function teeResultText(tt, results, players, settings) {
  if (tt.kind === 'match') return resultText(results[tt.id], settings);
  if (tt.kind !== 'singles') return null;
  const units = matchUnits([tt], players);
  const posted = units.map((u) => results[u.id]).filter((r) => r?.status === 'posted');
  if (!posted.length) return null;
  const pts = { DCBG: 0, JES: 0 };
  for (const r of posted) { if (r.winner === 'halved') { pts.DCBG += 0.5; pts.JES += 0.5; } else pts[r.winner] += 1; }
  const f = (n) => (Number.isInteger(n) ? String(n) : `${Math.floor(n) || ''}½`);
  return `${posted.length}/4 posted · ${teamName('DCBG', settings)} ${f(pts.DCBG)}–${f(pts.JES)}`;
}

export const FORMAT_NOTES = {
  foursomes: 'Scotch foursomes: both players tee off, pick a ball, the other partner hits next, then alternate until holed. Team strokes are 60% of the low partner plus 40% of the high partner.',
  fourball: 'Four-ball (two-man best ball) at 80%. The lowest player in the group plays off zero.',
  singles: 'Singles at 100%. Each player plays both opponents in his group: four separate matches. Only the player in a match can concede a putt.',
};

export default function MatchCard({ id }) {
  const { me, list } = useStore();
  const { players, courses, teeTimes, results, settings } = useLookups();
  const tt = teeTimes.find((t) => t.id === id);
  if (!tt) return <div className="page"><Back to="schedule" label="Schedule" /><p className="empty">That match is not in the schedule.</p></div>;
  const course = courses[tt.course];
  const m = matchStrokes(tt, players, course, settings, { teeTimes, results: list('results') });
  const s = sides(tt, players);
  const r = results[tt.id];
  const session = (settings.sessions || []).find((x) => x.id === tt.session);
  const holes = course?.holes || [];
  const nines = [holes.slice(0, Math.min(9, holes.length)), holes.slice(9)].filter((h) => h.length);
  const isMatch = tt.kind === 'match' || tt.kind === 'singles';



  // Rows for the stroke-hole grid, by format.
  let gridRows = [];
  if (m.format === 'foursomes') gridRows = [{ key: 'team', label: <span className="who"><TeamDot team={m.team.team} />{s[m.team.team].map((p) => players[p]?.initials).join(' & ')}</span>, holes: m.team.holes, halfHole: m.team.halfHole }];
  else if (m.format === 'singles') gridRows = (m.pairs || []).filter((p) => p.receiver && p.holes).map((p) => ({ key: p.id, label: <span className="small"><b>{players[p.receiver]?.initials}</b> v {players[p.receiver === p.a ? p.b : p.a]?.initials}</span>, holes: p.holes }));
  else gridRows = m.rows.map((row) => ({ key: row.pid, me: me?.id === row.pid, label: <Who pid={row.pid} players={players} me={me} />, holes: row.holes }));

  return (
    <div className="page">
      <Back to="schedule" label="Schedule" />
      <header className="match-head">
        <div className="kicker">{dayLabel(tt.date)} · {fmtTime(tt.time)}{session ? ` · ${session.label} · ${session.format}` : ''}</div>
        <h1>{course?.name || tt.course}</h1>
        {isMatch ? (
          <div className="versus">
            <SideList team="DCBG" ids={s.DCBG} players={players} me={me} settings={settings} />
            <span className="vs">vs</span>
            <SideList team="JES" ids={s.JES} players={players} me={me} settings={settings} />
          </div>
        ) : (
          <p className="muted">{tt.kind === 'optional' ? 'Optional round. Not part of the Shoe.' : 'Practice round. Not part of the Shoe.'}</p>
        )}
        <div className="match-status">
          {tt.kind === 'match' && (r?.status === 'posted' ? <Pill tone={r.winner === 'DCBG' ? 'dcbg' : r.winner === 'JES' ? 'jes' : 'neutral'}>{resultText(r, settings)}</Pill>
            : r?.status ? <Pill tone="warn">{statusLabel(r.status)}</Pill> : <Pill>Scheduled</Pill>)}
          {tt.kind === 'singles' && <Pill>{teeResultText(tt, results, players, settings) || '4 singles matches'}</Pill>}
          {tt.paceSetter && <Pill tone="warn">Pace Setter · 4:00</Pill>}
        </div>
        {FORMAT_NOTES[m.format] && <p className="small muted">{FORMAT_NOTES[m.format]}</p>}
      </header>

      {m.format === 'foursomes' && (
        <section className="section">
          <div className="section-head"><h2>Team strokes</h2><span className="muted small">Set by Marc</span></div>
          <div className="card team-strokes">
            <div><TeamDot team={m.team.team} /> <b>{s[m.team.team].map((p) => players[p]?.name).join(' & ')}</b> receive <b className="big-num">{m.team.strokes}</b> strokes</div>
            {m.team.calc && <div className="small muted mono">{m.team.calc}</div>}
            {m.team.half && <div className="small">Half stroke on hole {m.team.halfHole ?? '—'}: {s[m.team.team].map((p) => players[p]?.initials).join(' & ')} win that hole on a tie; the other side has to win it outright.</div>}
          </div>
        </section>
      )}

      {m.format === 'singles' && (
        <section className="section">
          <div className="section-head"><h2>Singles matches</h2><span className="muted small">100% · decided Friday at dinner</span></div>
          {m.rows.length < 4 && <p className="note">The full group is set Friday night at dinner. The leading captain names his players first.</p>}
          <ul className="plain-list">
            {(m.pairs || []).map((p) => {
              const rr = results[p.id];
              return (
                <li key={p.id}>
                  <span><Who pid={p.a} players={players} me={me} /> v <Who pid={p.b} players={players} me={me} /></span>
                  <span className="small">{p.strokes === null ? <span className="muted">Strokes TBD</span> : p.receiver ? <>{players[p.receiver]?.initials} gets <b>{p.strokes}</b></> : 'Level'}</span>
                  {resultText(rr, settings) && <Pill tone={rr.winner === 'DCBG' ? 'dcbg' : rr.winner === 'JES' ? 'jes' : 'neutral'}>{resultText(rr, settings)}</Pill>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {isMatch || m.rows.length ? (
        <section className="section">
          <div className="section-head">
            <h2>{m.format === 'fourball' || m.format === 'casual' ? 'Strokes this match' : 'Handicaps'}</h2>
            <span className="muted small">{m.format === 'foursomes' ? 'Index shown for reference' : `${Math.round(m.allowance * 100)}%${m.format === 'fourball' ? ' · off the low man' : ''}`}</span>
          </div>
          {m.rows.length === 0 ? <p className="empty">No players assigned yet.</p> : (
            <div className="table-wrap">
              <table className="grid strokes">
                <thead><tr><th>Player</th><th className="num" title="Handicap Index">Index</th><th>Tee</th>{m.format !== 'foursomes' && <><th className="num" title="Playing handicap for this round">Play</th>{(m.format === 'fourball' || m.format === 'casual') && <th className="num" title="Strokes received this match">Gets</th>}</>}</tr></thead>
                <tbody>
                  {m.rows.map((row) => (
                    <tr key={row.pid} className={me?.id === row.pid ? 'me-row' : ''}>
                      <td><Who pid={row.pid} players={players} me={me} /></td>
                      <td className="num">{row.index ?? <span className="muted">—</span>}</td>
                      <td>{row.tee?.name || <span className="muted">—</span>}</td>
                      {m.format !== 'foursomes' && <>
                        <td className="num">{row.ph ?? '—'}{row.source === 'calc' && row.ph !== null && <sup title="Calculated; not on Marc's sheet">c</sup>}{(row.equitable || row.adjust) ? <span className="muted small"> ({row.base}{row.equitable ? ` ${row.equitable > 0 ? '+' : '−'}${Math.abs(row.equitable)} eq` : ''}{row.adjust ? ` ${row.adjust > 0 ? '+' : '−'}${Math.abs(row.adjust)}` : ''})</span> : null}</td>
                        {(m.format === 'fourball' || m.format === 'casual') && <td className="num strong">{row.strokes ?? '—'}</td>}
                      </>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {m.rows.some((x) => x.equitable) && <p className="note">“eq” is the equitable adjustment from earlier Shoe matches: −1 for each win, +1 for each loss.</p>}
          {m.rows.some((x) => x.source === 'calc' && x.ph !== null) && m.format !== 'foursomes' && <p className="note">c = calculated from the index and course rating, because Marc’s sheet doesn’t list this player for this course.</p>}
          {isMatch && <p className="note">Boat Race Rule: if you or your team is 4 up or more, your strokes are waived until you’re 3 up or less.</p>}
        </section>
      ) : null}

      {gridRows.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Where the strokes fall</h2></div>
          {!m.holesHaveSI ? (
            <p className="note">Stroke holes appear once the stroke index for {course?.name} is entered.</p>
          ) : (
            <div className="table-wrap">
              {nines.map((nine, i) => (
                <table className="grid scorecard" key={i}>
                  <thead>
                    <tr><th>Hole</th>{nine.map((h) => <th key={h.n} className="num">{h.n}</th>)}</tr>
                    <tr className="sub"><th>Par</th>{nine.map((h) => <td key={h.n} className="num">{h.par ?? ''}</td>)}</tr>
                    <tr className="sub"><th>SI</th>{nine.map((h) => <td key={h.n} className="num">{h.si}</td>)}</tr>
                  </thead>
                  <tbody>
                    {gridRows.map((row) => (
                      <tr key={row.key} className={row.me ? 'me-row' : ''}>
                        <th>{row.label}</th>
                        {nine.map((h) => <td key={h.n} className="num dots">{row.holes?.[h.n] ? <span className="stroke-dots" aria-label={`${row.holes[h.n]} stroke${row.holes[h.n] > 1 ? 's' : ''}`}>{'●'.repeat(row.holes[h.n])}</span> : row.halfHole === h.n ? <span className="stroke-dots" aria-label="Half stroke: wins the hole on a tie">½</span> : ''}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="section">
        <div className="section-head"><h2>Caddies</h2></div>
        <ul className="plain-list">
          {(tt.players || []).filter(Boolean).map((pid) => (
            <li key={pid}><Who pid={pid} players={players} me={me} /> <span>{tt.caddies?.[pid] || <span className="muted">No caddie</span>}</span></li>
          ))}
          {!(tt.players || []).some(Boolean) && <li className="muted">TBD</li>}
        </ul>
      </section>
      {course && <p className="small"><a href={course.mapUrl} target="_blank" rel="noreferrer">Open {course.name} in Maps</a> · Golf shop <span className="mono">{course.shop}</span></p>}
    </div>
  );
}

function SideList({ team, ids, players, me, settings }) {
  return (
    <div className={`side side-${team === 'DCBG' ? 'dcbg' : 'jes'}`}>
      <div className="side-team"><TeamDot team={team} /> {teamName(team, settings)}</div>
      <div className="side-names">
        {ids.length ? ids.map((pid) => <span key={pid} className={me?.id === pid ? 'is-me' : ''}>{players[pid]?.name}</span>) : <span className="muted">TBD</span>}
      </div>
    </div>
  );
}

export function statusLabel(s) {
  return { inplay: 'In play', withmarc: 'Card with Marc', posted: 'Posted', scheduled: 'Scheduled' }[s] || 'Scheduled';
}
