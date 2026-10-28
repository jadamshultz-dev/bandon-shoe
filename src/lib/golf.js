// Handicap and match math for the Halcyon Days Bandon Shoe.
//
// Formats (set per tee time / session):
//   Wed AM  Scotch foursomes: Marc sets the team strokes on the tee time (teamStrokes).
//   Wed PM–Fri PM  Four-ball at 80%: lowest player in the group plays off zero.
//   Sat  Singles at 100%: each player plays both opponents in his group (4 matches per group).
// Playing handicaps come from Marc's table (settings.playingHcp) when he has listed one,
// otherwise from the WHS formula. The equitable adjustment (+1 for a loss, −1 for a win in
// earlier Shoe sessions) is added on top, then any manual stroke override on the match.

/** Course Handicap = Index × (Slope ÷ 113) + (Course Rating − Par), unrounded. */
export function courseHandicapRaw(index, tee, course) {
  if (index === null || index === undefined || index === '' || isNaN(Number(index))) return null;
  const par = num(tee?.par) ?? sumPar(course) ?? 72;
  const slope = num(tee?.slope) ?? 113;
  const rating = num(tee?.rating) ?? par;
  return Number(index) * (slope / 113) + (rating - par);
}

export function courseHandicap(index, tee, course) {
  const raw = courseHandicapRaw(index, tee, course);
  return { value: raw === null ? null : Math.round(raw), estimated: num(tee?.slope) === null || num(tee?.rating) === null };
}

export function sumPar(course) {
  const holes = course?.holes || [];
  if (!holes.length || holes.some((h) => num(h.par) === null)) return null;
  return holes.reduce((s, h) => s + Number(h.par), 0);
}

export function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export function teeFor(player, course) {
  const tees = course?.tees || [];
  return tees.find((t) => t.name === player?.tee) || tees.find((t) => t.default) || tees[0] || null;
}

export function sessionOf(teeTime, settings) {
  return (settings?.sessions || []).find((x) => x.id === teeTime?.session) || null;
}

export function allowanceFor(teeTime, settings) {
  return num(sessionOf(teeTime, settings)?.allowance) ?? num(settings?.allowance) ?? 1;
}

export function formatOf(teeTime, settings) {
  if (teeTime?.kind === 'singles') return 'singles';
  if (teeTime?.teamStrokes) return 'foursomes';
  if (teeTime?.kind === 'match') return 'fourball';
  return 'casual';
}

export const isShoe = (t) => t?.kind === 'match' || t?.kind === 'singles';

/** A player's playing handicap for one round, before the equitable and manual adjustments. */
export function basePlaying(player, teeTime, course, settings) {
  const allowance = allowanceFor(teeTime, settings);
  const marc = num(settings?.playingHcp?.[course?.id]?.[Math.round(allowance * 100)]?.[player?.id]);
  const tee = teeFor(player, course);
  const ch = courseHandicap(player?.index, tee, course);
  if (marc !== null) return { ph: marc, ch: ch.value, tee, source: 'marc', estimated: false };
  const raw = courseHandicapRaw(player?.index, tee, course);
  return { ph: raw === null ? null : Math.round(Math.round(raw) * allowance), ch: ch.value, tee, source: 'calc', estimated: ch.estimated };
}

/** Every point-scoring match: one per four-ball/foursomes group, four per singles group. */
export function matchUnits(teeTimes, playersById) {
  const units = [];
  for (const t of teeTimes) {
    if (!isShoe(t)) continue;
    const ids = (t.players || []).filter(Boolean);
    const D = ids.filter((id) => playersById[id]?.team === 'DCBG');
    const J = ids.filter((id) => playersById[id]?.team === 'JES');
    if (t.kind === 'match') units.push({ id: t.id, tt: t, session: t.session, DCBG: D, JES: J, singles: false });
    else {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        const d = D[i], jj = J[j];
        units.push({ id: d && jj ? `${t.id}~${d}~${jj}` : `${t.id}~slot${i}${j}`, tt: t, session: t.session, DCBG: d ? [d] : [], JES: jj ? [jj] : [], singles: true, slot: `${i}${j}` });
      }
    }
  }
  return units;
}

/** Equitable adjustment from Shoe sessions played before this one: −1 per win, +1 per loss. */
export function equitableAdjustments(teeTimes, results, playersById, settings, beforeSession) {
  const out = {};
  if (settings?.equitable === false) return out;
  const order = (settings?.sessions || []).map((s) => s.id);
  const cut = order.indexOf(beforeSession);
  if (cut <= 0) return out;
  const byId = Object.fromEntries((results || []).map((r) => [r.id, r]));
  for (const u of matchUnits(teeTimes, playersById)) {
    if (order.indexOf(u.session) < 0 || order.indexOf(u.session) >= cut) continue;
    const r = byId[u.id];
    if (!r || r.status !== 'posted' || r.winner === 'halved') continue;
    const loser = r.winner === 'DCBG' ? 'JES' : 'DCBG';
    for (const p of u[r.winner] || []) out[p] = (out[p] || 0) - 1;
    for (const p of u[loser] || []) out[p] = (out[p] || 0) + 1;
  }
  return out;
}

/**
 * Strokes for a tee time. Returns rows (one per player) plus, depending on format:
 *   fourball / casual: rows[].strokes off the low man
 *   foursomes: team = { team, strokes, holes }
 *   singles: pairs = [{ id, a, b, receiver, strokes, holes }]
 */
export function matchStrokes(teeTime, playersById, course, settings, ctx = {}) {
  const format = formatOf(teeTime, settings);
  const allowance = allowanceFor(teeTime, settings);
  const holesHaveSI = (course?.holes || []).length > 0 && course.holes.every((h) => num(h.si) !== null);
  const eq = ctx.teeTimes ? equitableAdjustments(ctx.teeTimes, ctx.results, playersById, settings, teeTime?.session) : {};
  const rows = (teeTime?.players || []).filter(Boolean).map((pid) => {
    const p = playersById[pid];
    const b = basePlaying(p, teeTime, course, settings);
    const equitable = eq[pid] || 0;
    const adjust = num(teeTime?.adjust?.[pid]) ?? 0;
    return { pid, player: p, tee: b.tee, index: num(p?.index), ch: b.ch, source: b.source, estimated: b.estimated, base: b.ph, equitable, adjust, ph: b.ph === null ? null : b.ph + equitable + adjust };
  });
  const out = { format, allowance, rows, holesHaveSI };

  if (format === 'foursomes') {
    const ts = teeTime.teamStrokes;
    // A half stroke goes on the next-hardest hole after the full strokes: the receiving team wins that hole on a tie.
    const full = Math.floor(ts.strokes);
    const half = ts.strokes % 1 !== 0;
    const halfHole = half && holesHaveSI ? course.holes.find((h) => Number(h.si) === (full % course.holes.length) + 1)?.n ?? null : null;
    out.team = { ...ts, holes: holesHaveSI ? strokeHoles(full, course.holes) : null, half, halfHole };
    for (const r of rows) { r.strokes = null; r.holes = null; }
    return out;
  }

  if (format === 'singles') {
    const byPid = Object.fromEntries(rows.map((r) => [r.pid, r]));
    out.pairs = matchUnits([teeTime], playersById).map((u) => {
      const a = byPid[u.DCBG[0]], b = byPid[u.JES[0]];
      if (!a || !b || a.ph === null || b.ph === null) return { id: u.id, a: u.DCBG[0], b: u.JES[0], receiver: null, strokes: null, holes: null };
      const diff = a.ph - b.ph;
      const strokes = Math.abs(diff);
      return { id: u.id, a: a.pid, b: b.pid, receiver: diff > 0 ? a.pid : diff < 0 ? b.pid : null, strokes, holes: strokes && holesHaveSI ? strokeHoles(strokes, course.holes) : null };
    });
    for (const r of rows) { r.strokes = null; r.holes = null; }
    return out;
  }

  const known = rows.filter((r) => r.ph !== null).map((r) => r.ph);
  const low = known.length ? Math.min(...known) : null;
  for (const r of rows) {
    r.strokes = r.ph === null || low === null ? null : Math.max(0, r.ph - low);
    r.holes = r.strokes === null || !holesHaveSI ? null : strokeHoles(r.strokes, course.holes);
  }
  out.low = low;
  return out;
}

/** Map of hole number → strokes received on that hole, by stroke index. */
export function strokeHoles(strokes, holes) {
  const n = holes.length;
  const out = {};
  for (const h of holes) {
    const si = Number(h.si);
    const full = Math.floor(strokes / n);
    const extra = strokes % n;
    const s = full + (si <= extra ? 1 : 0);
    if (s > 0) out[h.n] = s;
  }
  return out;
}

/** Team points from posted results. 27 points in all; 14 wins the Shoe. */
export function standings(teeTimes, results, settings, playersById = {}) {
  const win = num(settings?.pointsWin) ?? 1;
  const halve = num(settings?.pointsHalve) ?? 0.5;
  const units = matchUnits(teeTimes, playersById);
  const byId = Object.fromEntries(results.map((r) => [r.id, r]));
  const pts = { DCBG: 0, JES: 0 };
  let played = 0;
  const sessionPts = {};
  for (const u of units) {
    const sp = (sessionPts[u.session] ??= { DCBG: 0, JES: 0, played: 0, total: 0, count: 0 });
    sp.total += win; sp.count++;
    const r = byId[u.id];
    if (!r || r.status !== 'posted') continue;
    played++; sp.played++;
    if (r.winner === 'halved') { pts.DCBG += halve; pts.JES += halve; sp.DCBG += halve; sp.JES += halve; }
    else if (r.winner === 'DCBG' || r.winner === 'JES') { pts[r.winner] += win; sp[r.winner] += win; }
  }
  const total = num(settings?.totalPoints) ?? units.length * win;
  const remaining = Math.max(0, total - played * win);
  const toWin = num(settings?.toWin) ?? total / 2 + 0.5;
  let clinched = null;
  for (const t of ['DCBG', 'JES']) if (pts[t] >= toWin) clinched = t;
  return { pts, total, remaining, played, toWin, clinched, sessionPts, matchCount: units.length, units };
}

export function playerRecords(teeTimes, results, playersById) {
  const rec = {};
  const byId = Object.fromEntries(results.map((r) => [r.id, r]));
  for (const u of matchUnits(teeTimes, playersById)) {
    const r = byId[u.id];
    if (!r || r.status !== 'posted') continue;
    for (const team of ['DCBG', 'JES']) for (const pid of u[team]) {
      rec[pid] ??= { w: 0, l: 0, h: 0, pts: 0 };
      if (r.winner === 'halved') { rec[pid].h++; rec[pid].pts += 0.5; }
      else if (r.winner === team) { rec[pid].w++; rec[pid].pts += 1; }
      else rec[pid].l++;
    }
  }
  return rec;
}

export const MARGINS = ['1 up', '2 up', '2&1', '3&1', '3&2', '4&2', '4&3', '5&3', '5&4', '6&4', '6&5', '7&5', '7&6', '8&6', '8&7', '9&7', '9&8', '10&8', 'Won 19th', 'Won 20th'];
