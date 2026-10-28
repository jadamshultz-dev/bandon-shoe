import React, { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { dayLabel, fmtTime, openState } from '../lib/time.js';
import { Back, CopyText, Empty, Field, PageHead, Pill, Section, TeamDot, Who, go, teamName, useLookups } from '../ui.jsx';

const MENU = [
  ['dining', 'Dining', 'Restaurants, hours and group dinners'],
  ['caddies', 'Caddies', 'Who carries for whom, and caddie fees'],
  ['lodging', 'Lodging', 'Rooms, check-in and Sunday night'],
  ['players', 'Players', 'Roster, handicaps and GHIN'],
  ['map', 'Map', 'Lodges, first tees and restaurants'],
  ['info', 'Resort info', 'Rules, phone numbers and pace of play'],
];

export default function More() {
  const { isAdmin, canCaddie, me, switchPlayer, mode, resetDemo, needsPin } = useStore();
  return (
    <div className="page">
      <PageHead kicker={me ? `You're ${me.name}` : ''} title="More" />
      {needsPin && <UnlockCard />}
      <nav className="menu">
        {MENU.map(([h, t, s]) => <button key={h} className="menu-item" onClick={() => go(h)}><span className="menu-title">{t}</span><span className="muted small">{s}</span></button>)}
        {isAdmin && <button className="menu-item admin" onClick={() => go('admin')}><span className="menu-title">Admin</span><span className="muted small">Post results, edit settings, handicaps and the audit log</span></button>}
      </nav>
      <div className="actions">
        <button className="btn" onClick={() => { switchPlayer(); go('myday'); }}>Not {me?.nickname || me?.name?.split(' ')[0]}? Switch golfer</button>
        {mode === 'demo' && <button className="btn" onClick={resetDemo}>Reset demo data</button>}
      </div>
    </div>
  );
}

// ---------------- Dining ----------------
export function Dining() {
  const { list, isAdmin, save, remove, me } = useStore();
  const { players } = useLookups();
  const restaurants = list('restaurants');
  const dinners = list('dinners').sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const rsvps = list('rsvps');
  const [draft, setDraft] = useState(null);
  const [editR, setEditR] = useState(null);
  return (
    <div className="page">
      <Back />
      <PageHead kicker="On the resort" title="Dining">
        <p className="small">Restaurants keep a one-check policy for parties of 8 or more. Dinner reservations open 6 months ahead.</p>
      </PageHead>
      <Section title="Group dinners" aside={isAdmin && <button className="link-btn" onClick={() => setDraft({ id: `d${Date.now()}`, date: '2026-11-03', time: '19:00', restaurant: restaurants[0]?.name || '', party: 12, conf: '', paidBy: '', split: '' })}>Add dinner</button>}>
        {draft && (
          <div className="card form">
            <Field label="Night"><select id="dn-date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })}>{['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07'].map((d) => <option key={d} value={d}>{dayLabel(d)}</option>)}</select></Field>
            <Field label="Time"><input id="dn-time" type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} /></Field>
            <Field label="Restaurant"><input id="dn-rest" list="rest-names" value={draft.restaurant} onChange={(e) => setDraft({ ...draft, restaurant: e.target.value })} /><datalist id="rest-names">{restaurants.map((r) => <option key={r.id} value={r.name} />)}</datalist></Field>
            <Field label="Party size"><input id="dn-party" inputMode="numeric" value={draft.party} onChange={(e) => setDraft({ ...draft, party: e.target.value })} /></Field>
            <Field label="Confirmation #"><input id="dn-conf" value={draft.conf} onChange={(e) => setDraft({ ...draft, conf: e.target.value })} /></Field>
            <Field label="Who paid / how to split"><input id="dn-paid" value={draft.split} onChange={(e) => setDraft({ ...draft, split: e.target.value })} /></Field>
            <div className="actions"><button className="btn primary" onClick={() => { save('dinners', draft); setDraft(null); }}>Save dinner</button><button className="btn" onClick={() => setDraft(null)}>Cancel</button></div>
          </div>
        )}
        {dinners.length === 0 && !draft && <Empty>No group dinners booked yet. Marc will add them here.</Empty>}
        {dinners.map((d) => {
          return (
            <div className="card" key={d.id}>
              <div className="round-top"><span className="round-time">{dayLabel(d.date)}{d.time ? ` · ${fmtTime(d.time)}` : ''}</span><span className="round-course">{d.restaurant}</span></div>
              {d.note && <p className="small">{d.note}</p>}
              {d.tables?.length > 0 && <div className="tables">{d.tables.map((tb, i) => <div key={i} className="small"><span className="label">Table {i + 1}</span>{tb.map((pid) => players[pid]?.initials).join(', ')}{d.tableNotes?.[i] ? <span className="muted"> · {d.tableNotes[i]}</span> : null}</div>)}</div>}
              {(d.party || d.conf || d.split) && <p className="small muted">{[d.party && `Table for ${d.party}`, d.conf && `Conf ${d.conf}`, d.split].filter(Boolean).join(' · ')}</p>}
              {isAdmin && <div className="actions"><button className="link-btn" onClick={() => setDraft(d)}>Edit</button><button className="link-btn danger" onClick={() => remove('dinners', d.id)}>Delete</button></div>}
            </div>
          );
        })}
      </Section>
      <Section title="Restaurants">
        <p className="note">Hours are from the resort website and need checking before Nov 1. All times Pacific.</p>
        <div className="rest-list">
          {restaurants.map((r) => {
            const os = openState(r.hours);
            if (editR?.id === r.id) return <RestaurantEditor key={r.id} r={editR} setR={setEditR} onSave={() => { save('restaurants', editR); setEditR(null); }} />;
            return (
              <div className="card rest" key={r.id}>
                <div className="rest-top"><span className="rest-name">{r.name}</span><Pill tone={os.state === 'open' ? 'ok' : os.state === 'closing' ? 'warn' : 'neutral'}>{os.text}</Pill></div>
                <div className="muted small">{[r.kind, r.where].filter(Boolean).join(' · ')}</div>
                {r.hours?.length > 0 && <ul className="hours">{r.hours.map((h) => <li key={h.meal}><span>{h.meal}</span><span className="mono">{fmtTime(h.open)}–{fmtTime(h.close)}</span></li>)}</ul>}
                <div className="small">{r.booking}{r.phone && <> · <CopyText text={r.phone} /></>}</div>
                <div className="row-wrap">
                  {!r.verified && <Pill tone="warn">Verify hours</Pill>}
                  <a className="small" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name + ' Bandon Dunes')}`} target="_blank" rel="noreferrer">Map</a>
                  {isAdmin && <button className="link-btn" onClick={() => setEditR(JSON.parse(JSON.stringify(r)))}>Edit</button>}
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function RestaurantEditor({ r, setR, onSave }) {
  const setH = (i, k, v) => setR({ ...r, hours: r.hours.map((h, j) => (j === i ? { ...h, [k]: v } : h)) });
  return (
    <div className="card form">
      <Field label="Name"><input id={`rn-${r.id}`} value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} /></Field>
      <Field label="Where"><input id={`rw-${r.id}`} value={r.where} onChange={(e) => setR({ ...r, where: e.target.value })} /></Field>
      <Field label="Phone"><input id={`rp-${r.id}`} value={r.phone} onChange={(e) => setR({ ...r, phone: e.target.value })} /></Field>
      <Field label="Booking"><input id={`rb-${r.id}`} value={r.booking} onChange={(e) => setR({ ...r, booking: e.target.value })} /></Field>
      {r.hours.map((h, i) => (
        <div className="inline" key={i}>
          <input id={`rh-${r.id}-${i}-m`} value={h.meal} onChange={(e) => setH(i, 'meal', e.target.value)} aria-label="Meal" />
          <input id={`rh-${r.id}-${i}-o`} type="time" value={h.open} onChange={(e) => setH(i, 'open', e.target.value)} aria-label="Opens" />
          <input id={`rh-${r.id}-${i}-c`} type="time" value={h.close} onChange={(e) => setH(i, 'close', e.target.value)} aria-label="Closes" />
          <button className="link-btn danger" onClick={() => setR({ ...r, hours: r.hours.filter((_, j) => j !== i) })}>Remove</button>
        </div>
      ))}
      <button className="link-btn" onClick={() => setR({ ...r, hours: [...r.hours, { meal: 'Dinner', open: '17:00', close: '22:00' }] })}>Add hours</button>
      <label className="check"><input id={`rv-${r.id}`} type="checkbox" checked={!!r.verified} onChange={(e) => setR({ ...r, verified: e.target.checked })} /> Hours confirmed for the week of Nov 2</label>
      <div className="actions"><button className="btn primary" onClick={onSave}>Save</button><button className="btn" onClick={() => setR(null)}>Cancel</button></div>
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
        <p className="small">Marc books caddies with the caddie master; Mike keeps the assignments here. Caddie Services <CopyText text="(541) 347-5909" /></p>
      </PageHead>
      <Section title="Caddie fees">
        <div className="table-wrap"><table className="grid">
          <thead><tr><th>Player</th><th className="num">Rounds with caddie</th><th className="num">Total</th></tr></thead>
          <tbody>
            {Object.values(players).sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
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
  const { list, isAdmin, save, me } = useStore();
  const { players } = useLookups();
  const rooms = list('rooms').sort((a, b) => a.type.localeCompare(b.type));
  const [edit, setEdit] = useState(null);
  return (
    <div className="page">
      <Back />
      <PageHead kicker="Resort confirmation R1122E0.1" title="Lodging">
        <p className="small">Rooms at the Inn from Monday Nov 2. Check-in 4:00 pm, checkout 11:00 am. No smoking or pets.</p>
      </PageHead>
      <Section title="Rooms">
        <div className="room-list">
          {rooms.map((r) => edit?.id === r.id ? (
            <div className="card form" key={r.id}>
              <Field label="Room number"><input id={`rm-${r.id}`} value={edit.number} onChange={(e) => setEdit({ ...edit, number: e.target.value })} /></Field>
              <Field label="Confirmation #"><input id={`rc-${r.id}`} value={edit.conf} onChange={(e) => setEdit({ ...edit, conf: e.target.value })} /></Field>
              <Field label="Checkout"><select id={`ro-${r.id}`} value={edit.checkout} onChange={(e) => setEdit({ ...edit, checkout: e.target.value })}><option value="2026-11-07">Sat Nov 7</option><option value="2026-11-08">Sun Nov 8</option></select></Field>
              <div className="actions"><button className="btn primary" onClick={() => { save('rooms', edit); setEdit(null); }}>Save</button><button className="btn" onClick={() => setEdit(null)}>Cancel</button></div>
            </div>
          ) : (
            <div className="card room" key={r.id}>
              <div className="round-top"><span className="round-course">{r.occupants.map((pid) => players[pid]?.initials).join(' & ')}</span><span className="muted small">{r.type}</span></div>
              <div className="small">Room {r.number || '—'} · Conf {r.conf || '—'} · Checkout {dayLabel(r.checkout)}</div>
              {r.note && <div className="small muted">{r.note}</div>}
              {isAdmin && <button className="link-btn" onClick={() => setEdit({ ...r })}>Edit</button>}
            </div>
          ))}
        </div>
      </Section>
      <Section title="Sunday night, Nov 1">
        <p className="note">Not at the resort. Most of the group is at the Bandon Inn in town. Set yours in your profile.</p>
        <ul className="plain-list">{Object.values(players).filter((p) => p.id !== 'aw').map((p) => <li key={p.id}><Who pid={p.id} players={players} me={me} /> <span className="small">{p.sundayLodging || '—'}</span></li>)}</ul>
      </Section>
    </div>
  );
}

// ---------------- Players ----------------
export function Players() {
  const { me, isAdmin, settings } = useStore();
  const { players } = useLookups();
  const [open, setOpen] = useState(null);
  const lock = settings.handicapLock;
  return (
    <div className="page">
      <Back />
      <PageHead kicker={`Handicap Index locked as of ${lock ? dayLabel(lock) : '—'}`} title="Players" />
      {['DCBG', 'JES'].map((team) => (
        <Section key={team} title={<><TeamDot team={team} size={12} /> {teamName(team, settings)}</>}>
          <div className="player-list">
            {Object.values(players).filter((p) => p.team === team).sort((a, b) => (b.captain - a.captain) || a.name.localeCompare(b.name)).map((p) => (
              open === p.id && (isAdmin || me?.id === p.id) ? <ProfileEditor key={p.id} p={p} onClose={() => setOpen(null)} /> : (
                <div key={p.id} className={`card player ${me?.id === p.id ? 'is-me-card' : ''}`}>
                  <div className="player-top">
                    <span className="player-name">{p.name}</span>
                    <span className="mono hcp">{p.index ?? '—'}</span>
                  </div>
                  <div className="small muted">{[p.initials, p.captain && 'Co-captain', p.role === 'admin' && 'Admin', p.role === 'caddie' && 'Caddie coordinator', p.id === 'aw' && 'From Wednesday', p.homeClub].filter(Boolean).join(' · ')}</div>
                  <div className="small">{p.ghin ? <>GHIN <span className="mono">{p.ghin}</span> · <a href="https://www.ghin.com/" target="_blank" rel="noreferrer">GHIN</a></> : <span className="muted">No GHIN # yet</span>}{p.tee && <> · Tees: {p.tee}</>}</div>
                  {(isAdmin || me?.id === p.id) && <button className="link-btn" onClick={() => setOpen(p.id)}>{me?.id === p.id ? 'Edit my profile' : 'Edit'}</button>}
                </div>
              )
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}

function ProfileEditor({ p, onClose }) {
  const { save, isAdmin } = useStore();
  const [d, setD] = useState({ ...p });
  const f = (k) => ({ id: `pf-${p.id}-${k}`, value: d[k] ?? '', onChange: (e) => setD({ ...d, [k]: e.target.value }) });
  const submit = () => {
    const out = { ...d, index: d.index === '' || d.index === null || d.index === undefined ? null : Number(d.index) };
    save('players', out); onClose();
  };
  return (
    <div className="card form">
      <div className="player-name">{p.name}</div>
      <Field label="Handicap Index" hint={isAdmin ? 'Index as of the lock date' : 'Set by Marc, Josh or Mike'}><input {...f('index')} inputMode="decimal" disabled={!isAdmin} /></Field>
      <Field label="GHIN #"><input {...f('ghin')} inputMode="numeric" /></Field>
      <Field label="Preferred tees" hint="Must match a tee name on the course scorecard"><input {...f('tee')} /></Field>
      <Field label="Mobile"><input {...f('phone')} inputMode="tel" /></Field>
      <Field label="Sunday Nov 1 lodging"><input {...f('sundayLodging')} /></Field>
      <Field label="Dietary notes"><input {...f('dietary')} /></Field>
      {isAdmin && <Field label="Role"><select {...f('role')}><option value="player">Player</option><option value="caddie">Caddie coordinator</option><option value="admin">Admin</option></select></Field>}
      {isAdmin && <label className="check"><input id={`pf-${p.id}-cap`} type="checkbox" checked={!!d.captain} onChange={(e) => setD({ ...d, captain: e.target.checked })} /> Co-captain</label>}
      <div className="actions"><button className="btn primary" onClick={submit}>Save</button><button className="btn" onClick={onClose}>Cancel</button></div>
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
  ['Bandon Inn, Bandon OR', 'In town · Sunday Nov 1'],
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

function UnlockCard() {
  const { me, unlockWithPin } = useStore();
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const what = me?.role === 'admin' ? 'admin tools (results, pairings, handicaps, settings)' : 'caddie editing';
  return (
    <form className="card form" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const m = await unlockWithPin(pin); setBusy(false); setErr(m || ''); }}>
      <div className="strong">Unlock {what}</div>
      <p className="small muted">Enter your PIN once on this phone.</p>
      <div className="inline"><input id="unlock-pin" type="password" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} aria-label="PIN" /><button className="btn primary" disabled={busy || !pin}>{busy ? 'Checking…' : 'Unlock'}</button></div>
      {err && <p className="note bad">{err}</p>}
    </form>
  );
}
