import React, { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { sumPar } from '../lib/golf.js';
import { Back, Field, Pill, PageHead, go, useLookups, CopyText } from '../ui.jsx';

export default function Courses() {
  const { courses } = useLookups();
  return (
    <div className="page">
      <PageHead kicker="Bandon Dunes Golf Resort" title="Courses" />
      <div className="course-list">
        {Object.values(courses).sort((a, b) => a.opened - b.opened).map((c) => (
          <button key={c.id} className="card course-card" onClick={() => go(`course-${c.id}`)}>
            <div className="course-name">{c.name}</div>
            <div className="muted small">{c.designer} · {c.opened} · {c.holeCount} holes</div>
            <p className="small">{c.blurb}</p>
            {!c.verified && <Pill tone="warn">Scorecard needs verification</Pill>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CourseDetail({ id }) {
  const { isAdmin, save } = useStore();
  const { courses, teeTimes } = useLookups();
  const c = courses[id];
  const [edit, setEdit] = useState(false);
  if (!c) return <div className="page"><Back to="courses" label="Courses" /><p className="empty">Course not found.</p></div>;
  if (edit) return <CourseEditor c={c} onDone={(next) => { if (next) save('courses', next); setEdit(false); }} />;
  const par = sumPar(c);
  const rounds = teeTimes.filter((t) => t.course === c.id);
  const tees = c.tees || [];
  return (
    <div className="page">
      <Back to="courses" label="Courses" />
      <PageHead kicker={`${c.designer} · ${c.opened}`} title={c.name}>
        <p>{c.blurb}</p>
        <div className="row-wrap">
          {!c.verified ? <Pill tone="warn">Needs verification</Pill> : <Pill tone="ok">Verified from scorecard</Pill>}
          <Pill>Par {par ?? '—'}</Pill>
          <Pill>{c.holeCount} holes</Pill>
        </div>
      </PageHead>
      <div className="facts">
        <div><span className="label">Golf shop</span><CopyText text={c.shop} /></div>
        {c.nearby && <div><span className="label">Food nearby</span>{c.nearby}</div>}
        <div><span className="label">We play it</span>{rounds.length} time{rounds.length === 1 ? '' : 's'}</div>
        <div><span className="label">Map</span><a href={c.mapUrl} target="_blank" rel="noreferrer">Open in Maps</a>{c.flyover && <> · <a href={c.flyover} target="_blank" rel="noreferrer">Flyover</a></>}</div>
      </div>
      {!c.verified && c.source && <p className="note">From {c.source}. Not yet checked against the resort's own scorecard.{c.caveat ? ` ${c.caveat}` : ''}</p>}
      {isAdmin && <button className="btn" onClick={() => setEdit(true)}>Edit scorecard</button>}

      <section className="section">
        <div className="section-head"><h2>Tees</h2></div>
        {tees.length === 0 ? <p className="note">No tees entered yet. Ratings, slopes and yardages come from the official scorecard only.</p> : (
          <div className="table-wrap"><table className="grid">
            <thead><tr><th>Tee</th><th className="num">Yards</th><th className="num">Rating</th><th className="num">Slope</th><th className="num">Par</th></tr></thead>
            <tbody>{tees.map((t) => <tr key={t.name}><td>{t.name}{t.default ? <span className="muted small"> · default</span> : ''}</td><td className="num">{t.yards || '—'}</td><td className="num">{t.rating || '—'}</td><td className="num">{t.slope || '—'}</td><td className="num">{t.par || par || '—'}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>

      <section className="section">
        <div className="section-head"><h2>Holes</h2></div>
        <div className="table-wrap"><table className="grid holes">
          <thead><tr><th className="num">Hole</th><th className="num">Par</th><th className="num">SI</th>{tees.map((t) => <th key={t.name} className="num">{t.name}</th>)}<th>Notes</th></tr></thead>
          <tbody>{c.holes.map((h) => (
            <tr key={h.n}><td className="num strong">{h.n}</td><td className="num">{h.par ?? '—'}</td><td className="num">{h.si ?? '—'}</td>{tees.map((t) => <td key={t.name} className="num">{h.yards?.[t.name] ?? '—'}</td>)}<td className="small">{h.note}</td></tr>
          ))}</tbody>
        </table></div>
      </section>
    </div>
  );
}

function CourseEditor({ c, onDone }) {
  const [d, setD] = useState(() => JSON.parse(JSON.stringify(c)));
  const [paste, setPaste] = useState({ par: '', si: '' });
  const n = d.holes.length;
  const si = d.holes.map((h) => Number(h.si)).filter(Boolean);
  const siOk = si.length === 0 || (si.length === n && new Set(si).size === n && si.every((x) => x >= 1 && x <= n));
  const setHole = (i, k, v) => setD((x) => { const holes = [...x.holes]; holes[i] = { ...holes[i], [k]: v === '' ? null : v }; return { ...x, holes }; });
  const setYards = (i, tee, v) => setD((x) => { const holes = [...x.holes]; holes[i] = { ...holes[i], yards: { ...holes[i].yards, [tee]: v === '' ? null : Number(v) } }; return { ...x, holes }; });
  const setTee = (i, k, v) => setD((x) => { const tees = [...x.tees]; tees[i] = { ...tees[i], [k]: v }; return { ...x, tees }; });
  const applyRow = (k) => {
    const vals = paste[k].split(/[\s,;]+/).filter(Boolean).map(Number);
    if (vals.length !== n) return;
    setD((x) => ({ ...x, holes: x.holes.map((h, i) => ({ ...h, [k]: vals[i] })) }));
    setPaste((p) => ({ ...p, [k]: '' }));
  };
  return (
    <div className="page">
      <PageHead kicker="Edit scorecard" title={d.name}>
        <p className="small">Enter values from the official Bandon Dunes scorecard only.</p>
      </PageHead>
      <section className="section">
        <div className="section-head"><h2>Tees</h2><button className="link-btn" onClick={() => setD((x) => ({ ...x, tees: [...x.tees, { name: `Tee ${x.tees.length + 1}`, yards: '', rating: '', slope: '', par: '', default: x.tees.length === 0 }] }))}>Add tee</button></div>
        {d.tees.map((t, i) => (
          <div className="tee-edit-row" key={i}>
            <Field label="Name"><input id={`tee-name-${i}`} value={t.name} onChange={(e) => setTee(i, 'name', e.target.value)} /></Field>
            <Field label="Yards"><input id={`tee-yards-${i}`} inputMode="numeric" value={t.yards} onChange={(e) => setTee(i, 'yards', e.target.value)} /></Field>
            <Field label="Rating"><input id={`tee-rating-${i}`} inputMode="decimal" value={t.rating} onChange={(e) => setTee(i, 'rating', e.target.value)} /></Field>
            <Field label="Slope"><input id={`tee-slope-${i}`} inputMode="numeric" value={t.slope} onChange={(e) => setTee(i, 'slope', e.target.value)} /></Field>
            <Field label="Par"><input id={`tee-par-${i}`} inputMode="numeric" value={t.par} onChange={(e) => setTee(i, 'par', e.target.value)} /></Field>
            <label className="check"><input id={`tee-default-${i}`} type="checkbox" checked={!!t.default} onChange={(e) => setD((x) => ({ ...x, tees: x.tees.map((tt, j) => ({ ...tt, default: j === i ? e.target.checked : false })) }))} /> Default</label>
            <button className="link-btn danger" onClick={() => setD((x) => ({ ...x, tees: x.tees.filter((_, j) => j !== i) }))}>Remove</button>
          </div>
        ))}
      </section>
      <section className="section">
        <div className="section-head"><h2>Quick fill</h2></div>
        <div className="quickfill">
          <Field label={`Par for holes 1–${n}`} hint="Paste the par row, separated by spaces or commas"><div className="inline"><input id="paste-par" value={paste.par} onChange={(e) => setPaste({ ...paste, par: e.target.value })} /><button className="btn small" onClick={() => applyRow('par')}>Fill</button></div></Field>
          <Field label={`Stroke index for holes 1–${n}`} hint="The scorecard's handicap row"><div className="inline"><input id="paste-si" value={paste.si} onChange={(e) => setPaste({ ...paste, si: e.target.value })} /><button className="btn small" onClick={() => applyRow('si')}>Fill</button></div></Field>
        </div>
        {!siOk && <p className="note bad">Stroke index must use each number from 1 to {n} exactly once.</p>}
      </section>
      <section className="section">
        <div className="table-wrap"><table className="grid holes edit">
          <thead><tr><th className="num">Hole</th><th>Par</th><th>SI</th>{d.tees.map((t) => <th key={t.name}>{t.name} yds</th>)}<th>Note</th></tr></thead>
          <tbody>{d.holes.map((h, i) => (
            <tr key={h.n}>
              <td className="num strong">{h.n}</td>
              <td><input id={`par-${h.n}`} className="cell" inputMode="numeric" value={h.par ?? ''} onChange={(e) => setHole(i, 'par', e.target.value && Number(e.target.value))} /></td>
              <td><input id={`si-${h.n}`} className="cell" inputMode="numeric" value={h.si ?? ''} onChange={(e) => setHole(i, 'si', e.target.value && Number(e.target.value))} /></td>
              {d.tees.map((t) => <td key={t.name}><input id={`yd-${h.n}-${t.name}`} className="cell" inputMode="numeric" value={h.yards?.[t.name] ?? ''} onChange={(e) => setYards(i, t.name, e.target.value)} /></td>)}
              <td><input id={`note-${h.n}`} className="cell wide" value={h.note || ''} onChange={(e) => setHole(i, 'note', e.target.value)} /></td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>
      <section className="section">
        <Field label="Flyover link"><input id="flyover" value={d.flyover || ''} onChange={(e) => setD({ ...d, flyover: e.target.value })} placeholder="https://" /></Field>
        <label className="check"><input id="verified" type="checkbox" checked={!!d.verified} onChange={(e) => setD({ ...d, verified: e.target.checked })} /> Checked against the official scorecard</label>
      </section>
      <div className="actions">
        <button className="btn primary" disabled={!siOk} onClick={() => onDone(d)}>Save scorecard</button>
        <button className="btn" onClick={() => onDone(null)}>Cancel</button>
      </div>
    </div>
  );
}
