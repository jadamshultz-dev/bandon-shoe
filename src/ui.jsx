import React from 'react';
import { useStore } from './lib/store.jsx';

export function useLookups() {
  const { state, list, settings } = useStore();
  const players = state.players || {};
  const courses = state.courses || {};
  const teeTimes = list('tee_times').sort((a, b) => (a.date + a.time + a.course).localeCompare(b.date + b.time + b.course));
  const results = state.results || {};
  return { players, courses, teeTimes, results, settings };
}

export const go = (hash) => { window.location.hash = hash; };

export function TeamDot({ team, size = 10 }) {
  return <span className={`team-dot ${team === 'DCBG' ? 'dcbg' : 'jes'}`} style={{ width: size, height: size }} aria-hidden="true" />;
}

export function teamName(team, settings) {
  return settings?.teams?.[team]?.name || (team === 'DCBG' ? 'DCBG' : 'Jesters');
}

export function Who({ pid, players, me, showTeam = true }) {
  const p = players[pid];
  if (!p) return <span className="who tbd">TBD</span>;
  return (
    <span className={`who ${me?.id === pid ? 'is-me' : ''}`}>
      {showTeam && <TeamDot team={p.team} />}
      {p.initials}
    </span>
  );
}

export function Pill({ tone = 'neutral', children }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function Section({ title, aside, children, id }) {
  return (
    <section className="section" id={id}>
      {(title || aside) && (
        <div className="section-head">
          {title && <h2>{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>;
}

export function PageHead({ kicker, title, children }) {
  return (
    <header className="page-head">
      {kicker && <div className="kicker">{kicker}</div>}
      <h1>{title}</h1>
      {children}
    </header>
  );
}

export function Back({ to = 'more', label = 'More' }) {
  return <button className="back" onClick={() => go(to)}>‹ {label}</button>;
}

export function CopyText({ text }) {
  const [done, setDone] = React.useState(false);
  if (!text) return null;
  return (
    <span className="copytext">
      <span className="mono">{text}</span>
      <button
        className="link-btn"
        onClick={() => {
          navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {});
        }}
      >{done ? 'Copied' : 'Copy'}</button>
    </span>
  );
}
