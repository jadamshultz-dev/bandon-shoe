import React from 'react';
import { useStore } from '../lib/store.jsx';
import { dayLabel, fmtTime, openState } from '../lib/time.js';
import { Back, CopyText, Empty, PageHead, Pill, Section, TeamDot, Who, go, teamName, useLookups } from '../ui.jsx';

const MENU = [
  ['dining', 'Dining', 'Restaurants, hours and group dinners'],
  ['caddies', 'Caddies', 'Who carries for whom, and caddie fees'],
  ['lodging', 'Lodging', 'Rooms, check-in and checkout'],
  ['players', 'Players', 'Roster, handicaps and GHIN'],
  ['map', 'Map', 'Lodges, first tees and restaurants'],
  ['info', 'Resort info', 'Rules, phone numbers and pace of play'],
];

export default function More() {
  const { me, switchPlayer } = useStore();
  return (
    <div className="page">
      <PageHead kicker={me ? `You're ${me.name}` : ''} title="More" />
      <nav className="menu">
        {MENU.map(([h, t, s]) => <button key={h} className="menu-item" onClick={() => go(h)}><span className="menu-title">{t}</span><span className="muted small">{s}</span></button>)}
      </nav>
      <div className="actions">
        <button className="btn" onClick={() => { switchPlayer(); go('myday'); }}>Not {me?.nickname || me?.name?.split(' ')[0]}? Switch golfer</button>
      </div>
    </div>
  );
}

// ---------------- Dining ----------------
export function Dining() {
  const { list } = useStore();
  const { players } = useLookups();
  const restaurants = list('restaurants');
  const dinners = list('dinners').sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return (
    <div className="page">
      <Back />
      <PageHead kicker="On the resort" title="Dining">
        <p className="small">Restaurants keep a one-check policy for parties of 8 or more. Dinner reservations open 6 months ahead.</p>
      </PageHead>
      <Section title="Group dinners">
        {dinners.length === 0 && <Empty>No group dinners booked yet. Marc will add them here.</Empty>}
        {dinners.map((d) => {
          return (
            <div className="card" key={d.id}>
              <div className="round-top"><span className="round-time">{dayLabel(d.date)}{d.time ? ` · ${fmtTime(d.time)}` : ''}</span><span className="round-course">{d.restaurant}</span></div>
              {d.note && <p className="small">{d.note}</p>}
              {restaurants.find((r) => r.name === d.restaurant)?.menu && <a className="small" href={restaurants.find((r) => r.name === d.restaurant).menu} target="_blank" rel="noreferrer">View menu</a>}
              {d.tables?.length > 0 && <div className="tables">{d.tables.map((tb, i) => <div key={i} className="small"><span className="label">Table {i + 1}</span>{tb.map((pid) => players[pid]?.initials).join(', ')}{d.tableNotes?.[i] ? <span className="muted"> · {d.tableNotes[i]}</span> : null}</div>)}</div>}
              {(d.party || d.conf || d.split) && <p className="small muted">{[d.party && `Table for ${d.party}`, d.conf && `Conf ${d.conf}`, d.split].filter(Boolean).join(' · ')}</p>}
            </div>
          );
        })}
      </Section>
      <Section title="Restaurants">
        <p className="note">Menus open the latest version the resort has posted, so dishes and prices may have changed. Hours are from the resort website. All times Pacific.</p>
        <div className="rest-list">
          {restaurants.map((r) => {
            const os = openState(r.hours);
            return (
              <div className="card rest" key={r.id}>
                <div className="rest-top"><span className="rest-name">{r.name}</span>{os.state !== 'unknown' && <Pill tone={os.state === 'open' ? 'ok' : os.state === 'closing' ? 'warn' : 'neutral'}>{os.text}</Pill>}</div>
                <div className="muted small">{[r.kind, r.where].filter(Boolean).join(' · ')}</div>
                {r.hours?.length > 0 && <ul className="hours">{r.hours.map((h) => <li key={h.meal}><span>{h.meal}</span><span className="mono">{fmtTime(h.open)}–{fmtTime(h.close)}</span></li>)}</ul>}
                <div className="small">{r.booking}{r.booking && r.phone ? ' · ' : ''}{r.phone && <CopyText text={r.phone} />}</div>
                <div className="row-wrap">
                  {r.menu && <a className="btn primary small" href={r.menu} target="_blank" rel="noreferrer">View menu</a>}
                  <a className="small" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.id === 'wheelhouse' ? 'Wheelhouse Restaurant 125 Chicago St Bandon OR' : r.name + ' Bandon Dunes')}`} target="_blank" rel="noreferrer">Map</a>
                </div>
                {r.menuNote && <div className="small muted">{r.menuNote}</div>}
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

// ---------------- Caddies ----------------
export function Caddies() {
  const { me, settings } = useStore();
  const { players, courses, teeTimes } = useLookups();
  const rate = Number(settings.caddieRate) || 160;
  const counts = {};
  for (const t of teeTimes) for (const pid of (t.players || []).filter(Boolean)) {
    counts[pid] ??= 0;
    if (t.caddies?.[pid]) counts[pid]++;
  }
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const days = [...new Set(teeTimes.map((t) => t.date))];
  return (
    <div className="page">
      <Back />
      <PageHead kicker={`$${rate} per player per round, fee and tip included`} title="Caddies">
        <p className="small">Marc books caddies with the caddie master. Caddie Services <CopyText text="(541) 347-5909" /></p>
      </PageHead>
      <Section title="Caddie fees">
        <div className="table-wrap"><table className="grid">
          <thead><tr><th>Player</th><th className="num">Rounds with caddie</th><th className="num">Total</th></tr></thead>
          <tbody>
            {Object.values(players).filter((p) => !p.guest).sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
              <tr key={p.id} className={me?.id === p.id ? 'me-row' : ''}><td><Who pid={p.id} players={players} me={me} /> <span className="small">{p.name}</span></td><td className="num">{counts[p.id] || 0}</td><td className="num">${((counts[p.id] || 0) * rate).toLocaleString()}</td></tr>
            ))}
            <tr className="total-row"><td>Group</td><td className="num">{total}</td><td className="num">${(total * rate).toLocaleString()}</td></tr>
          </tbody>
        </table></div>
      </Section>
      {days.map((d) => {
        const rows = teeTimes.filter((t) => t.date === d && t.kind !== 'optional');
        const loops = {};
        for (const t of rows) for (const [pid, c] of Object.entries(t.caddies || {})) if (c && (t.players || []).includes(pid)) (loops[`${t.time} ${c}`] ??= { c, t, bags: [] }).bags.push(pid);
        const caddieCount = new Set(Object.values(loops).map((l) => l.c)).size;
        return (
          <Section key={d} title={dayLabel(d)} aside={<span className="muted small">{caddieCount} needed</span>}>
            <ul className="plain-list">
              {Object.values(loops).sort((a, b) => a.t.time.localeCompare(b.t.time)).map((l) => (
                <li key={l.t.id + l.c}>
                  <span className="mono">{fmtTime(l.t.time)}</span>
                  <span><b>{l.c}</b> <span className="muted small">{courses[l.t.course]?.name}</span></span>
                  <span>{l.bags.map((pid) => <Who key={pid} pid={pid} players={players} me={me} />)}{l.bags.length > 2 && <Pill tone="bad">{l.bags.length} bags</Pill>}</span>
                </li>
              ))}
              {Object.keys(loops).length === 0 && <li className="muted">No caddies booked.</li>}
            </ul>
          </Section>
        );
      })}
    </div>
  );
}

// ---------------- Lodging ----------------
export function Lodging() {
  const { list, me } = useStore();
  const { players } = useLookups();
  const rooms = list('rooms').sort((a, b) => a.type.localeCompare(b.type));
  return (
    <div className="page">
      <Back />
      <PageHead kicker="Resort confirmation R1122E0.1" title="Lodging">
        <p className="small">Rooms at the Inn from Monday Nov 2. Check-in 4:00 pm, checkout 11:00 am. No smoking or pets.</p>
      </PageHead>
      <Section title="Rooms">
        <div className="room-list">
          {rooms.map((r) => (
            <div className="card room" key={r.id}>
              <div className="round-top"><span className="round-course">{r.occupants.map((pid) => players[pid]?.initials).join(' & ')}</span><span className="muted small">{r.type}</span></div>
              <div className="small">{[r.number && `Room ${r.number}`, r.conf && `Conf ${r.conf}`, `Checkout ${dayLabel(r.checkout)}`].filter(Boolean).join(' · ')}</div>
              {r.note && <div className="small muted">{r.note}</div>}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ---------------- Players ----------------
export function Players() {
  const { me, settings } = useStore();
  const { players } = useLookups();
  const lock = settings.handicapLock;
  return (
    <div className="page">
      <Back />
      <PageHead kicker={`Handicap Index locked as of ${lock ? dayLabel(lock) : '—'}`} title="Players" />
      {['DCBG', 'JES'].map((team) => (
        <Section key={team} title={<><TeamDot team={team} size={12} /> {teamName(team, settings)}</>}>
          <div className="player-list">
            {Object.values(players).filter((p) => p.team === team).sort((a, b) => (b.captain - a.captain) || a.name.localeCompare(b.name)).map((p) => (
              (
                <div key={p.id} className={`card player ${me?.id === p.id ? 'is-me-card' : ''}`}>
                  <div className="player-top">
                    <span className="player-name">{p.name}</span>
                    <span className="mono hcp">{p.index ?? '—'}</span>
                  </div>
                  <div className="small muted">{[p.initials, p.captain && 'Co-captain', p.id === 'aw' && 'From Wednesday', p.guest && 'Monday and Tuesday practice rounds only', p.homeClub].filter(Boolean).join(' · ')}</div>
                  {(p.ghin || p.tee) && <div className="small">{p.ghin && <>GHIN <span className="mono">{p.ghin}</span> · <a href="https://www.ghin.com/" target="_blank" rel="noreferrer">GHIN</a></>}{p.ghin && p.tee && ' · '}{p.tee && <>Tees: {p.tee}</>}</div>}
                </div>
              )
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}

// ---------------- Map ----------------
const PLACES = [
  ['The Lodge (Main Lodge)', 'Bandon Dunes first tee, The Gallery & Puffin Bar'],
  ['The Inn at Bandon Dunes', 'Our rooms, Mon–Sat'],
  ['Pacific Dunes clubhouse', 'Pacific Grill'],
  ['Bandon Trails clubhouse', 'Trails End · Bandon Preserve first tee'],
  ['Old Macdonald first tee', ''],
  ['Sheep Ranch first tee', ''],
  ['Bandon Dunes Practice Center', "Charlotte's"],
  ['The Punchbowl', 'Putting course'],
  ["Shorty's", 'Short course and clubhouse'],
];
export function MapScreen() {
  return (
    <div className="page">
      <Back />
      <PageHead kicker="57744 Round Lake Road, Bandon, OR 97411" title="Map">
        <p className="small"><a href="https://www.google.com/maps/search/?api=1&query=Bandon+Dunes+Golf+Resort" target="_blank" rel="noreferrer">Open the resort in Google Maps</a></p>
      </PageHead>
      <ul className="place-list">
        {PLACES.map(([name, sub]) => (
          <li key={name}>
            <div><div className="strong">{name}</div>{sub && <div className="muted small">{sub}</div>}</div>
            <a className="btn small" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name.includes('Bandon OR') ? name : `${name} Bandon Dunes Golf Resort`)}`} target="_blank" rel="noreferrer">Directions</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------- Info ----------------
export function Info() {
  const { settings } = useStore();
  const phones = [
    ['Resort main', '(800) 742-0172'], ['Caddie Services', '(541) 347-5909'], ['Bandon Dunes & Shorty’s golf shop', '(541) 347-5888'],
    ['Pacific Dunes golf shop', '(541) 347-5831'], ['Bandon Trails & Preserve golf shop', '(541) 347-5958'], ['Ghost Tree Grill', '(855) 220-6710'],
  ];
  return (
    <div className="page">
      <Back />
      <PageHead kicker="Bandon Dunes Golf Resort" title="Resort info" />
      <Section title="Bandon Shoe format">
        <ul className="rules">
          {(settings.sessions || []).map((s) => <li key={s.id}><b>{s.label}:</b> {s.format}{s.allowance ? ` at ${Math.round(s.allowance * 100)}%` : ''} · {s.points} pts</li>)}
          <li>{settings.totalPoints || 27} points in all. A team needs {settings.toWin || 14} to win the Shoe.</li>
          <li>Saturday singles are set at Friday dinner. The leading captain names his players first.</li>
        </ul>
      </Section>
      <Section title="Shoe local rules">
        <ul className="rules">{(settings.localRules || []).map((r, i) => <li key={i}>{r}</li>)}</ul>
      </Section>
      <Section title="On the course">
        <ul className="rules">
          <li>Walking only. Caddies are booked in advance through Marc.</li>
          <li>Carry bag with a stand, 25 lbs or less, or it may be swapped.</li>
          <li>Proper golf attire. No denim.</li>
          <li>Pace Setter tee times (the first 90 minutes each day) play in 4:00 or keep up with the group ahead.</li>
          <li>Ship clubs round-trip if you can.</li>
        </ul>
      </Section>
      <Section title="Rooms">
        <ul className="rules"><li>Check-in 4:00 pm, checkout 11:00 am.</li><li>No smoking or pets in guest rooms.</li><li>Changes and cancellations need 60 days’ notice.</li></ul>
      </Section>
      <Section title="Phone numbers">
        <ul className="plain-list">{phones.map(([n, p]) => <li key={n}><span>{n}</span><CopyText text={p} /></li>)}</ul>
      </Section>
    </div>
  );
}
