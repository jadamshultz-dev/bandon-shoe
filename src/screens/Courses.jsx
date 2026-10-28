import React from 'react';
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
  const { courses, teeTimes } = useLookups();
  const c = courses[id];
  if (!c) return <div className="page"><Back to="courses" label="Courses" /><p className="empty">Course not found.</p></div>;
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
