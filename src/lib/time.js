// All trip times are Pacific.
export const TZ = 'America/Los_Angeles';
export const TRIP_DAYS = [
  { date: '2026-11-03', short: 'Tue', label: 'Tue Nov 3' },
  { date: '2026-11-04', short: 'Wed', label: 'Wed Nov 4' },
  { date: '2026-11-05', short: 'Thu', label: 'Thu Nov 5' },
  { date: '2026-11-06', short: 'Fri', label: 'Fri Nov 6' },
  { date: '2026-11-07', short: 'Sat', label: 'Sat Nov 7' },
];

export function nowPacific() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t)?.value;
  const hour = g('hour') === '24' ? '00' : g('hour');
  return { date: `${g('year')}-${g('month')}-${g('day')}`, minutes: Number(hour) * 60 + Number(g('minute')) };
}

/** The trip day to show by default: today while the trip runs, otherwise the first Shoe day. */
export function defaultDay() {
  const { date } = nowPacific();
  if (TRIP_DAYS.some((d) => d.date === date)) return { date, preview: false };
  return { date: '2026-11-04', preview: true };
}

export const toMin = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m; };
export function fmtTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`;
}
export const minToHHMM = (m) => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`;
export const dayLabel = (date) => TRIP_DAYS.find((d) => d.date === date)?.label
  || (date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', '') : '');

/** Open-now state for a restaurant with hours in Pacific time. */
export function openState(hours, now = nowPacific()) {
  if (!hours?.length) return { state: 'unknown', text: 'Hours not entered' };
  for (const h of hours) {
    const o = toMin(h.open), c = toMin(h.close);
    if (now.minutes >= o && now.minutes < c) {
      const left = c - now.minutes;
      return { state: left <= 45 ? 'closing' : 'open', text: left <= 45 ? `${h.meal} · closes in ${left} min` : `${h.meal} · open until ${fmtTime(h.close)}` };
    }
  }
  const next = hours.map((h) => toMin(h.open)).filter((o) => o > now.minutes).sort((a, b) => a - b)[0];
  return { state: 'closed', text: next !== undefined ? `Closed · opens ${fmtTime(minToHHMM(next))}` : 'Closed for the day' };
}
