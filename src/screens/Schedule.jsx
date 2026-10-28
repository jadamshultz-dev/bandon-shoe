import React, { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { TRIP_DAYS, fmtTime } from '../lib/time.js';
import { Pill, Who, go, useLookups, PageHead } from '../ui.jsx';
import { teeResultText } from './MatchCard.jsx';

export default function Schedule() {
  const { me, canCaddie, settings } = useStore();
  const { players, courses, teeTimes, results } = useLookups();
  const [mineOnly, setMineOnly] = useState(false);
  const days = TRIP_DAYS.filter((d) => teeTimes.some((t) => t.date === d.date));
  const shown = mineOnly ? teeTimes.filter((t) => (t.players || []).includes(me?.id)) : teeTimes;

  return (
    <div className="page">
      <PageHead kicker="Tuesday Nov 3 – Saturday Nov 7 · all times Pacific" title="Tee sheet">
        <div className="seg" role="group" aria-label="Filter">
          <button className={!mineOnly ? 'on' : ''} onClick={() => setMineOnly(false)}>Everyone</button>
          <button className={mineOnly ? 'on' : ''} onClick={() => setMineOnly(true)}>Just me</button>
        </div>
      </PageHead>
      {days.map((d) => {
        const rows = shown.filter((t) => t.date === d.date);
        if (!rows.length) return null;
        const needed = new Set(rows.flatMap((t) => Object.values(t.caddies || {}).filter(Boolean))).size;
        return (
          <section key={d.date} className="section">
            <div className="section-head"><h2>{d.label}</h2><span className="muted small">{needed} caddie{needed === 1 ? '' : 's'} booked</span></div>
            <div className="tee-list">
              {rows.map((t) => {
                const rt = teeResultText(t, results, players, settings);
                const ids = (t.players || []).filter(Boolean);
                return (
                  <div key={t.id} className={`tee ${ids.includes(me?.id) ? 'mine' : ''}`}>
                    <button className="tee-main" onClick={() => go(`match-${t.id}`)}>
                      <div className="tee-when"><span className="mono">{fmtTime(t.time)}</span><span className="tee-course">{courses[t.course]?.name}</span></div>
                      <div className="tee-tags">
                        {(t.kind === 'match' || t.kind === 'singles') && <Pill tone="accent">{(settings.sessions || []).find((s) => s.id === t.session)?.label} · {(settings.sessions || []).find((s) => s.id === t.session)?.format}</Pill>}
                        {t.kind === 'optional' && <Pill>Optional</Pill>}
                        {t.kind === 'casual' && <Pill>Practice</Pill>}
                        {t.paceSetter && <Pill tone="warn">Pace Setter</Pill>}
                        {rt && <Pill tone="ok">{rt}</Pill>}
                      </div>
                      <ul className="tee-players">
                        {ids.length === 0 && <li className="muted">{t.kind === 'optional' ? 'Groups from the Preserve RSVP list' : t.kind === 'singles' ? 'Singles set Friday night at dinner' : 'Players TBD'}</li>}
                        {ids.map((pid) => (
                          <li key={pid}><Who pid={pid} players={players} me={me} /><span className={t.caddies?.[pid] ? '' : 'muted'}>{t.caddies?.[pid] || (t.kind === 'optional' ? '' : 'No caddie')}</span></li>
                        ))}
                      </ul>
                    </button>
                    {canCaddie && <button className="link-btn tee-edit" onClick={() => go(`edit-${t.id}`)}>Edit group</button>}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      {!shown.length && <p className="empty">No tee times for you yet.</p>}
    </div>
  );
}
