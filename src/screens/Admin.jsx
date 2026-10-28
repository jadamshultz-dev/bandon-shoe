import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { MARGINS, matchUnits } from '../lib/golf.js';
import { dayLabel, fmtTime, nowPacific } from '../lib/time.js';
import { Back, Field, PageHead, Pill, Section, Who, go, teamName, useLookups } from '../ui.jsx';
import { resultText, sides, statusLabel } from './MatchCard.jsx';

export default function Admin() {
  const { isAdmin, list, save, remove, settings, audit, loadAudit, undo, me } = useStore();
  const { players, courses, teeTimes, results } = useLookups();
  const [tab, setTab] = useState('results');
  useEffect(() => { if (tab === 'audit') loadAudit(); }, [tab, loadAudit]);
  if (!isAdmin) return <div className="page"><Back /><p className="empty">Only Marc, Josh and Mike can open Admin.</p></div>;
  const today = nowPacific().date;
  const units = matchUnits(teeTimes, players).filter((u) => !u.singles || (u.DCBG.length && u.JES.length));
  const sorted = [...units].sort((a, b) => (a.tt.date === today ? -1 : 0) - (b.tt.date === today ? -1 : 0));
  const singlesPending = teeTimes.some((t) => t.kind === 'singles' && (t.players || []).filter(Boolean).length < 4);
  return (
    <div className="page">
      <Back />
      <PageHead kicker="Marc, Josh & Mike" title="Admin">
        <div className="seg wrap" role="tablist">
          {[['results', 'Results'], ['handicaps', 'Handicaps'], ['settings', 'Settings'], ['news', 'Announcements'], ['audit', 'Audit log']].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
        </div>
      </PageHead>

      {tab === 'results' && (
        <Section title="Post a result">
          <p className="note">Marc verifies each scorecard, then post the result here. Every change is logged.</p>
          {singlesPending && <p className="note">Saturday singles appear here once each Saturday group has all four players (Tee sheet → Edit group, after Friday dinner).</p>}
          <div className="match-list">
            {sorted.map((u) => {
              const t = u.tt; const r = results[u.id]; const s = { DCBG: u.DCBG, JES: u.JES };
              return (
                <button key={u.id} className="match-row" onClick={() => go(`score-${u.id}`)}>
                  <span className="mr-when mono">{dayLabel(t.date).slice(0, 3)} {fmtTime(t.time)}{u.singles ? ' · singles' : ''}</span>
                  <span className="mr-course">{courses[t.course]?.name}</span>
                  <span className="mr-sides"><span>{s.DCBG.map((id) => players[id]?.initials).join(' & ') || 'TBD'}</span><span className="muted">v</span><span>{s.JES.map((id) => players[id]?.initials).join(' & ') || 'TBD'}</span></span>
                  <span className="mr-result">{resultText(r, settings) ? <b>{resultText(r, settings)}</b> : <span className="muted small">{statusLabel(r?.status)}</span>}</span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {tab === 'handicaps' && <HandicapGrid players={players} save={save} settings={settings} />}
      {tab === 'settings' && <SettingsForm settings={settings} save={save} />}

      {tab === 'news' && <Announcements list={list} save={save} remove={remove} me={me} players={players} />}

      {tab === 'audit' && (
        <Section title="Recent changes">
          {audit.length === 0 && <p className="empty">No changes yet.</p>}
          <ul className="audit">
            {audit.slice(0, 150).map((a) => (
              <li key={a.id}>
                <div><b>{a.actor || 'system'}</b> <span className="muted small">{new Date(a.at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div>
                <div className="small">{a.after ? (a.before ? 'Changed' : 'Added') : 'Removed'} {a.table_name.replace('_', ' ')} <span className="mono">{a.row_id}</span>{summarize(a)}</div>
                <button className="link-btn" onClick={() => undo(a)}>Undo</button>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function summarize(a) {
  if (a.table_name === 'results' && a.after) return ` → ${a.after.winner === 'halved' ? 'Halved' : `${a.after.winner} ${a.after.margin || ''}`} (${a.after.status})`;
  if (a.table_name === 'players' && a.after && a.before && a.after.index !== a.before.index) return ` → index ${a.before.index ?? '—'} to ${a.after.index ?? '—'}`;
  return '';
}

export function ScoreEntry({ id }) {
  const { isAdmin, save, remove, me, settings } = useStore();
  const { players, courses, teeTimes, results } = useLookups();
  const unit = matchUnits(teeTimes, players).find((u) => u.id === id);
  const t = unit?.tt;
  const existing = results[id];
  const [d, setD] = useState(() => existing || { id, winner: null, margin: '', status: 'inplay', verified: false });
  const [confirm, setConfirm] = useState(false);
  if (!isAdmin) return <div className="page"><Back to="leaders" label="Leaderboard" /><p className="empty">Only Marc, Josh and Mike can post results.</p></div>;
  if (!t || !unit.DCBG.length || !unit.JES.length) return <div className="page"><Back to="admin" label="Admin" /><p className="empty">Match not found, or players not set yet.</p></div>;
  const s = { DCBG: unit.DCBG, JES: unit.JES };
  const ready = d.winner && (d.winner === 'halved' || d.margin);
  const post = () => {
    save('results', { ...d, margin: d.winner === 'halved' ? '' : d.margin, status: 'posted', verified: true, by: me?.id, at: new Date().toISOString() });
    go('leaders');
  };
  return (
    <div className="page">
      <Back to="admin" label="Admin" />
      <PageHead kicker={`${dayLabel(t.date)} · ${fmtTime(t.time)} · ${courses[t.course]?.name}`} title={unit.singles ? 'Post singles result' : 'Post result'} />
      <div className="winner-pick">
        {[['DCBG', s.DCBG], ['halved', null], ['JES', s.JES]].map(([k, ids]) => (
          <button key={k} className={`win-btn ${k === 'DCBG' ? 'dcbg' : k === 'JES' ? 'jes' : 'half'} ${d.winner === k ? 'on' : ''}`} onClick={() => setD({ ...d, winner: k })}>
            <span className="win-team">{k === 'halved' ? 'Halved' : teamName(k, settings)}</span>
            {ids && <span className="small">{ids.map((pid) => players[pid]?.initials).join(' & ') || 'TBD'}</span>}
          </button>
        ))}
      </div>
      {d.winner && d.winner !== 'halved' && (
        <Section title="Margin">
          <div className="margin-grid">{MARGINS.map((m) => <button key={m} className={`chip ${d.margin === m ? 'on' : ''}`} onClick={() => setD({ ...d, margin: m })}>{m}</button>)}</div>
        </Section>
      )}
      <Section title="Status">
        <div className="seg">
          {[['inplay', 'In play'], ['withmarc', 'Card with Marc']].map(([k, l]) => <button key={k} className={d.status === k ? 'on' : ''} onClick={() => { setD({ ...d, status: k }); save('results', { ...d, status: k }, { quiet: true }); }}>{l}</button>)}
        </div>
      </Section>
      <label className="check big"><input id="verified-ms" type="checkbox" checked={!!d.verified} onChange={(e) => setD({ ...d, verified: e.target.checked })} /> Scorecard verified by MS</label>
      {!confirm ? (
        <div className="actions">
          <button className="btn primary" disabled={!ready || !d.verified} onClick={() => setConfirm(true)}>Review result</button>
          {existing && <button className="link-btn danger" onClick={() => { remove('results', id); go('admin'); }}>Clear result</button>}
        </div>
      ) : (
        <div className="confirm card">
          <p>Post <b>{d.winner === 'halved' ? 'Halved' : `${teamName(d.winner, settings)} ${d.margin}`}</b> for {s.DCBG.map((x) => players[x]?.initials).join(' & ')} v {s.JES.map((x) => players[x]?.initials).join(' & ')}? Everyone sees it right away.</p>
          <div className="actions"><button className="btn primary" onClick={post}>Post result</button><button className="btn" onClick={() => setConfirm(false)}>Back</button></div>
        </div>
      )}
    </div>
  );
}

function HandicapGrid({ players, save, settings }) {
  const [vals, setVals] = useState(() => Object.fromEntries(Object.values(players).map((p) => [p.id, p.index ?? ''])));
  const changed = Object.values(players).filter((p) => String(p.index ?? '') !== String(vals[p.id] ?? ''));
  return (
    <Section title="Handicap Index" aside={<span className="muted small">Locked as of {dayLabel(settings.handicapLock)}</span>}>
      <p className="note">Changes recalculate every match card immediately.</p>
      <div className="hcp-grid">
        {Object.values(players).sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
          <label key={p.id} className="hcp-row"><span>{p.name}</span><input id={`hcp-${p.id}`} inputMode="decimal" value={vals[p.id]} onChange={(e) => setVals({ ...vals, [p.id]: e.target.value })} /></label>
        ))}
      </div>
      <div className="actions"><button className="btn primary" disabled={!changed.length} onClick={() => changed.forEach((p) => save('players', { ...p, index: vals[p.id] === '' ? null : Number(vals[p.id]) }, { quiet: changed.length > 1 }))}>Save {changed.length || ''} change{changed.length === 1 ? '' : 's'}</button></div>
    </Section>
  );
}

function SettingsForm({ settings, save }) {
  const [d, setD] = useState(() => JSON.parse(JSON.stringify(settings)));
  const setS = (i, k, v) => setD({ ...d, sessions: d.sessions.map((s, j) => (j === i ? { ...s, [k]: v } : s)) });
  return (
    <Section title="Competition settings">
      <div className="form">
        <Field label="Handicap allowance" hint="Applies to every session unless a session sets its own"><div className="inline"><input id="set-allow" inputMode="numeric" value={Math.round(d.allowance * 100)} onChange={(e) => setD({ ...d, allowance: Number(e.target.value) / 100 })} /><span>%</span></div></Field>
        <div className="seg">{[100, 95, 90, 85, 80].map((p) => <button key={p} className={Math.round(d.allowance * 100) === p ? 'on' : ''} onClick={() => setD({ ...d, allowance: p / 100 })}>{p}%</button>)}</div>
        <Field label="Points for a win"><input id="set-win" inputMode="decimal" value={d.pointsWin} onChange={(e) => setD({ ...d, pointsWin: Number(e.target.value) })} /></Field>
        <Field label="Points needed to win the Shoe" hint="27 points in all"><input id="set-towin" inputMode="decimal" value={d.toWin ?? ''} onChange={(e) => setD({ ...d, toWin: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
        <label className="check"><input id="set-eq" type="checkbox" checked={d.equitable !== false} onChange={(e) => setD({ ...d, equitable: e.target.checked })} /> Equitable adjustment: −1 after a win, +1 after a loss</label>
        <Field label="Points each for a halve"><input id="set-half" inputMode="decimal" value={d.pointsHalve} onChange={(e) => setD({ ...d, pointsHalve: Number(e.target.value) })} /></Field>
        <Field label="Caddie fee per player per round ($, fee and tip)"><input id="set-caddie" inputMode="numeric" value={d.caddieRate} onChange={(e) => setD({ ...d, caddieRate: Number(e.target.value) })} /></Field>
        <Field label="Handicap Index lock date"><input id="set-lock" type="date" value={d.handicapLock} onChange={(e) => setD({ ...d, handicapLock: e.target.value })} /></Field>
        <Field label="Caddies (one per line)"><textarea id="set-caddies" rows={5} value={(d.caddies || []).join('\n')} onChange={(e) => setD({ ...d, caddies: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })} /></Field>
      </div>
      <h3>Sessions</h3>
      {d.sessions.map((s, i) => (
        <div className="session-row" key={s.id}>
          <b>{s.label}</b>
          <select id={`ses-fmt-${s.id}`} value={s.format} onChange={(e) => setS(i, 'format', e.target.value)}>{['Scotch foursomes', 'Four-ball', 'Singles', 'Foursomes', 'Scramble'].map((f) => <option key={f}>{f}</option>)}</select>
          <label className="inline small">Allowance <input id={`ses-al-${s.id}`} className="cell" inputMode="numeric" placeholder={String(Math.round(d.allowance * 100))} value={s.allowance ? Math.round(s.allowance * 100) : ''} onChange={(e) => setS(i, 'allowance', e.target.value ? Number(e.target.value) / 100 : null)} />%</label>
        </div>
      ))}
      <div className="actions"><button className="btn primary" onClick={() => save('settings', d)}>Save settings</button></div>
    </Section>
  );
}

function Announcements({ list, save, remove, me, players }) {
  const [text, setText] = useState('');
  const items = list('announcements').sort((a, b) => b.at.localeCompare(a.at));
  return (
    <Section title="Announcements">
      <Field label="New announcement" hint="Shows at the top of everyone's My Day"><textarea id="news-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} /></Field>
      <div className="actions"><button className="btn primary" disabled={!text.trim()} onClick={() => { save('announcements', { id: `a${Date.now()}`, at: new Date().toISOString(), by: me.id, pinned: true, text: text.trim() }); setText(''); }}>Post</button></div>
      <ul className="audit">{items.map((a) => <li key={a.id}><div className="small"><b>{players[a.by]?.initials}</b> {a.text}</div><button className="link-btn danger" onClick={() => remove('announcements', a.id)}>Remove</button></li>)}</ul>
    </Section>
  );
}

export function PairingEditor({ id }) {
  const { isAdmin, canCaddie, save, settings, me } = useStore();
  const { players, courses, teeTimes } = useLookups();
  const t = teeTimes.find((x) => x.id === id);
  const [d, setD] = useState(() => t && JSON.parse(JSON.stringify({ ...t, players: [...(t.players || []), null, null, null, null].slice(0, 4) })));
  if (!canCaddie) return <div className="page"><Back to="schedule" label="Schedule" /><p className="empty">Only Marc, Josh and Mike can edit groups.</p></div>;
  if (!t || !d) return <div className="page"><Back to="schedule" label="Schedule" /><p className="empty">Tee time not found.</p></div>;
  const sameTime = teeTimes.filter((x) => x.id !== t.id && x.date === t.date && x.kind !== 'optional' && t.kind !== 'optional' && Math.abs(toM(x.time) - toM(d.time)) < 240);
  const clashes = d.players.filter(Boolean).filter((pid) => sameTime.some((x) => x.players?.includes(pid)));
  const caddieCount = {};
  for (const pid of d.players.filter(Boolean)) { const c = d.caddies?.[pid]; if (c) caddieCount[c] = (caddieCount[c] || 0) + 1; }
  for (const x of sameTime) if (Math.abs(toM(x.time) - toM(d.time)) < 30) for (const [pid, c] of Object.entries(x.caddies || {})) if (c && x.players?.includes(pid) && caddieCount[c] !== undefined) caddieCount[c]++;
  const overBags = Object.entries(caddieCount).filter(([, n]) => n > 2).map(([c]) => c);
  const teamsOk = !['match', 'singles'].includes(t.kind) || (() => { const s = { DCBG: 0, JES: 0 }; d.players.filter(Boolean).forEach((p) => s[players[p]?.team]++); return s.DCBG <= 2 && s.JES <= 2; })();
  const setSlot = (i, pid) => setD((x) => { const ps = [...x.players]; const old = ps[i]; ps[i] = pid || null; const caddies = { ...x.caddies }; if (old && old !== pid) { if (pid) caddies[pid] = caddies[old] ?? null; delete caddies[old]; } return { ...x, players: ps, caddies }; });
  const setCaddie = (pid, c) => setD((x) => ({ ...x, caddies: { ...x.caddies, [pid]: c || null } }));
  const submit = () => {
    const ps = d.players.filter(Boolean);
    const caddies = Object.fromEntries(ps.map((p) => [p, d.caddies?.[p] ?? null]));
    save('tee_times', isAdmin ? { ...d, players: ps, caddies } : { ...t, caddies });
    go('schedule');
  };
  const options = Object.values(players).sort((a, b) => a.team.localeCompare(b.team) || a.name.localeCompare(b.name));
  return (
    <div className="page">
      <Back to="schedule" label="Schedule" />
      <PageHead kicker={`${dayLabel(t.date)} · ${courses[t.course]?.name}`} title={`Edit ${fmtTime(t.time)} group`} />
      {isAdmin && (
        <div className="form two">
          <Field label="Tee time"><input id="pe-time" type="time" value={d.time} onChange={(e) => setD({ ...d, time: e.target.value })} /></Field>
          <Field label="Course"><select id="pe-course" value={d.course} onChange={(e) => setD({ ...d, course: e.target.value })}>{Object.values(courses).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <label className="check"><input id="pe-pace" type="checkbox" checked={!!d.paceSetter} onChange={(e) => setD({ ...d, paceSetter: e.target.checked })} /> Pace Setter time</label>
        </div>
      )}
      <div className="slots">
        {d.players.map((pid, i) => (
          <div className="slot" key={i}>
            <span className="slot-n">{i + 1}</span>
            {isAdmin ? (
              <select id={`pe-p${i}`} value={pid || ''} onChange={(e) => setSlot(i, e.target.value)}>
                <option value="">Open slot</option>
                {options.map((p) => <option key={p.id} value={p.id} disabled={d.players.includes(p.id) && p.id !== pid}>{p.name} · {teamName(p.team, settings)}</option>)}
              </select>
            ) : <span className="slot-name">{pid ? <Who pid={pid} players={players} me={me} /> : 'Open slot'}</span>}
            {pid && (
              <select id={`pe-c${i}`} value={d.caddies?.[pid] || ''} onChange={(e) => setCaddie(pid, e.target.value)} aria-label={`Caddie for ${players[pid]?.name}`}>
                <option value="">No caddie</option>
                {(settings.caddies || []).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        ))}
      </div>
      {clashes.length > 0 && <p className="note bad">{clashes.map((p) => players[p]?.initials).join(', ')} already in another group within 4 hours of this time.</p>}
      {overBags.length > 0 && <p className="note bad">{overBags.join(', ')} would carry more than two bags at this time.</p>}
      {!teamsOk && <p className="note bad">A Shoe match needs two players from each team.</p>}
      <div className="actions"><button className="btn primary" onClick={submit}>Save group</button><button className="btn" onClick={() => go('schedule')}>Cancel</button></div>
      {t.kind === 'match' && <Pill tone="accent">{(settings.sessions || []).find((s) => s.id === t.session)?.label} match</Pill>}
    </div>
  );
}

const toM = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
