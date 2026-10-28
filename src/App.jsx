import React, { useEffect, useState } from 'react';
import { useStore } from './lib/store.jsx';
import MyDay from './screens/MyDay.jsx';
import Leaderboard from './screens/Leaderboard.jsx';
import Schedule from './screens/Schedule.jsx';
import MatchCard from './screens/MatchCard.jsx';
import Preserve from './screens/Preserve.jsx';
import Courses, { CourseDetail } from './screens/Courses.jsx';
import More, { Caddies, Dining, Info, Lodging, MapScreen, Players } from './screens/More.jsx';
import { TeamDot, go } from './ui.jsx';

function useHash() {
  const read = () => (window.location.hash || '#myday').slice(1) || 'myday';
  const [h, setH] = useState(read);
  useEffect(() => {
    const on = () => { setH(read()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return h;
}

const TABS = [
  ['myday', 'My Day', 'M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  ['leaders', 'Leaders', 'M4 21V10h4v11M10 21V4h4v17M16 21v-7h4v7'],
  ['schedule', 'Tee sheet', 'M4 5h16v15H4zM4 9h16M8 3v4M16 3v4'],
  ['courses', 'Courses', 'M6 21V3l10 4-10 4'],
  ['more', 'More', 'M5 12h.01M12 12h.01M19 12h.01'],
];

function tabFor(route) {
  if (route.startsWith('match-')) return 'schedule';
  if (route.startsWith('course-')) return 'courses';
  if (TABS.some(([k]) => k === route)) return route;
  return 'more';
}

function Screen({ route }) {
  if (route.startsWith('match-')) return <MatchCard id={route.slice(6)} />;
  if (route.startsWith('course-')) return <CourseDetail id={route.slice(7)} />;
  switch (route) {
    case 'leaders': return <Leaderboard />;
    case 'schedule': return <Schedule />;
    case 'courses': return <Courses />;
    case 'more': return <More />;
    case 'dining': return <Dining />;
    case 'caddies': return <Caddies />;
    case 'lodging': return <Lodging />;
    case 'players': return <Players />;
    case 'map': return <MapScreen />;
    case 'info': return <Info />;
    case 'preserve': return <Preserve />;
    default: return <MyDay />;
  }
}

export default function App() {
  const store = useStore();
  const route = useHash();
  const { ready, me, online, toast } = store;

  let body;
  if (!ready) body = <div className="center-screen"><p className="muted">Loading the tee sheet…</p></div>;
  else if (!me) body = <NamePicker />;
  else body = null;

  if (body) return <div className="app">{body}{toast && <div className={`toast ${toast.tone}`} role="status">{toast.text}</div>}</div>;

  const tab = tabFor(route);
  return (
    <div className="app">
      {!online && <div className="offline">No signal. Showing the last version you opened.</div>}
      <main className="main"><Screen route={route} /></main>
      <nav className="tabbar" aria-label="Main">
        {TABS.map(([k, label, d]) => (
          <button key={k} className={`tab ${tab === k ? 'on' : ''}`} aria-current={tab === k ? 'page' : undefined} onClick={() => go(k)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {toast && <div className={`toast ${toast.tone}`} role="status">{toast.text}</div>}
    </div>
  );
}

function Brand() {
  return (
    <div className="brand">
      
      <div className="kicker">Bandon Dunes · Nov 1–8, 2026</div>
      <h1 className="brand-title">Halcyon Days<br />Bandon Shoe</h1>
      <div className="brand-teams"><span><TeamDot team="DCBG" /> DCBG</span><span className="muted">v</span><span><TeamDot team="JES" /> Jesters</span></div>
    </div>
  );
}

function NamePicker() {
  const { list, choosePlayer } = useStore();
  const players = list('players').sort((a, b) => a.team.localeCompare(b.team) || a.name.localeCompare(b.name));
  return (
    <div className="signin">
      <Brand />
      <h2>Who’s playing?</h2>
      <p className="small">Tap your name. This phone will remember you; you can switch anytime from My Day or More.</p>
      {['DCBG', 'JES'].map((team) => (
        <div key={team} className="pick-team">
          <div className="pick-team-name"><TeamDot team={team} /> {team === 'DCBG' ? 'DCBG' : 'Jesters'}</div>
          <div className="pick-grid">
            {players.filter((p) => p.team === team).map((p) => (
              <button key={p.id} className="pick" onClick={() => { choosePlayer(p.id); go('myday'); }}>
                <span>{p.name}{p.guest && <span className="muted small"> · Mon–Tue only</span>}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
