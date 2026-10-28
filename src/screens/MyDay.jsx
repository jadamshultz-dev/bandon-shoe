import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { matchStrokes } from '../lib/golf.js';
import { TRIP_DAYS, dayLabel, defaultDay, fmtTime, minToHHMM, openState, toMin } from '../lib/time.js';
import { Pill, Section, Who, go, useLookups, teamName, Empty } from '../ui.jsx';
import { sides, teeResultText } from './MatchCard.jsx';

const WX = { 0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 80: 'Showers', 81: 'Showers', 82: 'Heavy showers', 95: 'Thunderstorms' };

function useWeather(date) {
  const [wx, setWx] = useState({ status: 'loading' });
  useEffect(() => {
    let off = false;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=43.12&longitude=-124.41&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FLos_Angeles&start_date=${date}&end_date=${date}`;
    setWx({ status: 'loading' });
    fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((j) => {
      if (off) return;
      const d = j.daily;
      if (!d?.time?.length) return setWx({ status: 'none' });
      setWx({ status: 'ok', code: d.weather_code[0], hi: d.temperature_2m_max[0], lo: d.temperature_2m_min[0], rain: d.precipitation_probability_max[0], wind: d.wind_speed_10m_max[0], gust: d.wind_gusts_10m_max[0], sunrise: d.sunrise[0]?.slice(11), sunset: d.sunset[0]?.slice(11) });
    }).catch(() => !off && setWx({ status: 'none' }));
    return () => { off = true; };
  }, [date]);
  return wx;
}

export default function MyDay() {
  const { me, list, settings, switchPlayer } = useStore();
  const { players, courses, teeTimes, results } = useLookups();
  const init = defaultDay();
  const [date, setDate] = useState(init.date);
  const [viewAs, setViewAs] = useState(null);
  const who = players[viewAs] || me;
  const wx = useWeather(date);

  const mine = teeTimes.filter((t) => t.date === date && (t.players || []).includes(who?.id));
  const nextDay = TRIP_DAYS[TRIP_DAYS.findIndex((d) => d.date === date) + 1]?.date;
  const tomorrow = teeTimes.filter((t) => t.date === nextDay && (t.players || []).includes(who?.id));
  const dinners = list('dinners').filter((d) => d.date === date);
  const rsvps = list('rsvps');
  const announcements = list('announcements').sort((a, b) => (b.pinned - a.pinned) || b.at.localeCompare(a.at)).slice(0, 2);
  const preserveTimes = teeTimes.filter((t) => t.date === date && t.kind === 'optional');
  const preserveIn = rsvps.filter((r) => r.kind === 'preserve' && r.status === 'in');
  const myPreserve = rsvps.find((r) => r.id === `preserve:${who?.id}`);
  const restaurants = list('restaurants');


  const first = who?.nickname || who?.name?.split(' ')[0];
  return (
    <div className="page">
      <header className="page-head myday-head">
        <div className="kicker">{init.preview && date === init.date ? 'Preview · ' : ''}{dayLabel(date)}</div>
        <h1>{who?.id === me?.id ? `${first}'s day` : `${who?.name}'s day`}</h1>
        <div className="day-strip" role="tablist" aria-label="Trip day">
          {TRIP_DAYS.map((d) => (
            <button key={d.date} role="tab" aria-selected={d.date === date} className={`day-chip ${d.date === date ? 'on' : ''}`} onClick={() => setDate(d.date)}>
              <span>{d.short}</span><b>{d.date.slice(8).replace(/^0/, '')}</b>
            </button>
          ))}
        </div>
        <button className="link-btn small switch-golfer" onClick={switchPlayer}>Not {me?.nickname || me?.name?.split(' ')[0]}? Switch golfer</button>
        <label className="viewas">
          <span className="muted small">Viewing</span>
          <select id="viewas" value={who?.id || ''} onChange={(e) => setViewAs(e.target.value === me?.id ? null : e.target.value)}>
            {Object.values(players).sort((a, b) => a.name.localeCompare(b.name)).map((p) => <option key={p.id} value={p.id}>{p.name}{p.id === me?.id ? ' (you)' : ''}</option>)}
          </select>
        </label>
      </header>

      {announcements.length > 0 && (
        <div className="notice-stack">
          {announcements.map((a) => <div key={a.id} className="notice"><b>{players[a.by]?.initials || 'Admin'}:</b> {a.text}</div>)}
        </div>
      )}

      <div className="wx-card" aria-live="polite">
        {wx.status === 'ok' ? (
          <>
            <div className="wx-main"><span className="wx-temp">{Math.round(wx.hi)}°</span><span className="muted">/{Math.round(wx.lo)}°</span><span className="wx-desc">{WX[wx.code] || 'Mixed'}</span></div>
            <div className="wx-meta">
              <span>Wind {Math.round(wx.wind)} mph, gusts {Math.round(wx.gust)}</span>
              <span>Rain {wx.rain ?? 0}%</span>
              <span>Sunrise {fmtTime(wx.sunrise)} · Sunset {fmtTime(wx.sunset)}</span>
            </div>
          </>
        ) : wx.status === 'loading' ? <span className="muted">Checking the Bandon forecast…</span>
          : <span className="muted">Forecast for {dayLabel(date)} isn’t available yet. It appears about two weeks out.</span>}
      </div>

      <Section title="Tee times">
        {mine.length === 0 && preserveTimes.length === 0 && <Empty>{date === '2026-11-07' ? 'Matchups TBD based on prior results.' : date === '2026-11-02' && who?.id !== 'aw' ? 'Your Monday group isn’t set yet. The 12:00 Bandon Trails time is still open.' : `No golf for ${who?.initials} on ${dayLabel(date)}.`}</Empty>}
        {mine.map((t) => <RoundCard key={t.id} t={t} who={who} players={players} courses={courses} results={results} teeTimes={teeTimes} allResults={list('results')} settings={settings} />)}
        {preserveTimes.length > 0 && !mine.some((t) => t.kind === 'optional') && (
          <div className="card round optional">
            <div className="round-top"><span className="round-time">{preserveTimes.map((t) => fmtTime(t.time)).join(' / ')}</span><span className="round-course">Bandon Preserve</span><Pill>Optional</Pill></div>
            <p className="small">13-hole par-3 course before the 11:20 Pacific Dunes tee times.</p>
            <p className="small">{myPreserve?.status === 'in' ? <b>You’re on the list.</b> : <span className="muted">You’re not on the list.</span>} <span className="muted">Playing: {preserveIn.map((r) => players[r.player]?.initials).join(', ')}</span></p>
          </div>
        )}
      </Section>

      {mine.length > 0 && (
        <Section title="Food near your rounds">
          <ul className="plain-list">
            {[...new Set(mine.map((t) => courses[t.course]?.nearby).filter(Boolean).join(' · ').split(' · '))].map((n) => {
              const r = restaurants.find((x) => x.name === n);
              const isToday = !init.preview && date === init.date;
              const os = r ? (isToday ? openState(r.hours) : { state: 'neutral', text: r.hours?.length ? r.hours.map((h) => `${h.meal} ${fmtTime(h.open)}–${fmtTime(h.close)}`).join(' · ') : 'Hours not entered' }) : null;
              return <li key={n}><span>{n}</span>{os && os.state !== 'unknown' && os.text !== 'Hours not entered' && <Pill tone={os.state === 'open' ? 'ok' : os.state === 'closing' ? 'warn' : 'neutral'}>{os.text}</Pill>}</li>;
            })}
          </ul>
        </Section>
      )}

      <Section title="Dinner">
        {dinners.length === 0 ? <Empty>No group dinner booked for {dayLabel(date)} yet.</Empty> : dinners.map((d) => {
          return (
            <div className="card" key={d.id}>
              <div className="round-top">{d.time && <span className="round-time">{fmtTime(d.time)}</span>}<span className="round-course">{d.restaurant}</span>{!d.time && <Pill>No reservation</Pill>}</div>
              {d.note && <p className="small">{d.note}</p>}
              {restaurants.find((r) => r.name === d.restaurant)?.menu && <a className="small" href={restaurants.find((r) => r.name === d.restaurant).menu} target="_blank" rel="noreferrer">View menu</a>}
              {d.tables?.length > 0 && who && d.tables.some((tb) => tb.includes(who.id)) && <p className="small"><span className="label">Your table</span>{d.tables.find((tb) => tb.includes(who.id)).map((pid) => players[pid]?.initials).join(', ')}</p>}
              {(d.party || d.conf) && <p className="small muted">{d.party ? `Table for ${d.party}` : ''}{d.party && d.conf ? ' · ' : ''}{d.conf ? `Conf ${d.conf}` : ''}</p>}
            </div>
          );
        })}
      </Section>


      {nextDay && (
        <Section title={`Tomorrow · ${dayLabel(nextDay)}`}>
          {tomorrow.length === 0 ? <Empty>{nextDay === '2026-11-07' ? 'Matchups TBD based on prior results.' : 'No tee times.'}</Empty> : (
            <ul className="plain-list">
              {tomorrow.map((t) => <li key={t.id}><b className="mono">{fmtTime(t.time)}</b> <span>{courses[t.course]?.name}</span>{t.caddies?.[who.id] && <span className="muted small"> · {t.caddies[who.id]}</span>}</li>)}
            </ul>
          )}
        </Section>
      )}
    </div>
  );
}

function RoundCard({ t, who, players, courses, results, teeTimes, allResults, settings }) {
  const course = courses[t.course];
  const s = sides(t, players);
  const myTeam = who?.team;
  const partners = (s[myTeam] || []).filter((id) => id !== who.id);
  const opps = s[myTeam === 'DCBG' ? 'JES' : 'DCBG'] || [];
  const ms = matchStrokes(t, players, course, settings, { teeTimes, results: allResults });
  const mine = ms.rows.find((r) => r.pid === who.id);
  const leave = minToHHMM(toMin(t.time) - 30);
  const rt = teeResultText(t, results, players, settings);
  const shoe = t.kind === 'match' || t.kind === 'singles';
  const session = (settings.sessions || []).find((x) => x.id === t.session);

  let strokes;
  if (ms.format === 'foursomes') {
    const halfNote = ms.team.half && ms.team.halfHole ? ` (½ on ${ms.team.halfHole}: ${ms.team.team === myTeam ? 'you win ties' : 'you must win outright'})` : '';
    strokes = (ms.team.team === myTeam ? `Your team gets ${ms.team.strokes}` : `You give ${ms.team.strokes}`) + halfNote;
  } else if (ms.format === 'singles') {
    const mineP = (ms.pairs || []).filter((p) => p.a === who.id || p.b === who.id);
    strokes = mineP.length ? mineP.map((p) => {
      const opp = players[p.a === who.id ? p.b : p.a]?.initials || 'TBD';
      if (p.strokes === null) return `v ${opp}: TBD`;
      if (!p.receiver) return `v ${opp}: level`;
      return `v ${opp}: ${p.receiver === who.id ? 'get' : 'give'} ${p.strokes}`;
    }).join(' · ') : 'Set Friday night';
  } else {
    strokes = `${mine?.strokes ?? '—'}${mine?.holes && Object.keys(mine.holes).length ? ` on ${Object.keys(mine.holes).join(', ')}` : ''}`;
  }

  return (
    <button className="card round" onClick={() => go(`match-${t.id}`)}>
      <div className="round-top">
        <span className="round-time">{fmtTime(t.time)}</span>
        <span className="round-course">{course?.name}</span>
        {shoe ? <Pill tone="accent">{session?.format || 'Shoe match'}</Pill> : t.kind === 'optional' ? <Pill>Optional</Pill> : <Pill>Practice</Pill>}
        {t.paceSetter && <Pill tone="warn">Pace Setter</Pill>}
      </div>
      {shoe ? (
        <div className="round-people">
          {t.kind === 'match' && <div><span className="label">With</span> {partners.length ? partners.map((id) => players[id]?.name).join(', ') : 'TBD'}</div>}
          <div><span className="label">Against</span> {opps.length ? opps.map((id) => <Who key={id} pid={id} players={players} />) : 'TBD'}</div>
        </div>
      ) : (
        <div className="round-people"><div><span className="label">Group</span> {(t.players || []).filter((id) => id && id !== who.id).map((id) => players[id]?.initials).join(', ') || 'TBD'}</div></div>
      )}
      <div className="round-facts">
        <span><span className="label">Caddie</span> {t.caddies?.[who.id] || 'None'}</span>
        <span><span className="label">Strokes</span> {strokes}</span>
        <span><span className="label">Leave by</span> {fmtTime(leave)}</span>
      </div>
      {rt && <div className="round-result">{rt}</div>}
      <span className="round-cta">Match card ›</span>
    </button>
  );
}
