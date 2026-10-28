import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { courseHandicap, matchStrokes, strokeHoles, standings, matchUnits, equitableAdjustments } from '../src/lib/golf.js';

const seed = JSON.parse(readFileSync(new URL('../src/data/seed.json', import.meta.url), 'utf8'));
const P = Object.fromEntries(seed.players.map((p) => [p.id, p]));
const C = Object.fromEntries(seed.courses.map((c) => [c.id, c]));
const S = seed.settings[0];
const T = Object.fromEntries(seed.tee_times.map((t) => [t.id, t]));

// Stroke holes
const holes = Array.from({ length: 18 }, (_, i) => ({ n: i + 1, par: 4, si: ((i * 7) % 18) + 1 }));
const sh = strokeHoles(20, holes); assert.equal(Object.values(sh).reduce((s, v) => s + v, 0), 20);

// Four-ball at 80% uses Marc's numbers: Thu 11:30 Pac Dunes AW 11, RW 8, SC 10, Josh 7 → low Josh
const m = matchStrokes(T['thu-1130-pd'], P, C['pacific-dunes'], S);
const g = Object.fromEntries(m.rows.map((r) => [r.pid, r.strokes]));
assert.deepEqual(g, { aw: 4, rw: 1, sc: 3, josh: 0 });

// Foursomes use Marc's team strokes
const f = matchStrokes(T['wed-0740-sr'], P, C['sheep-ranch'], S);
assert.equal(f.format, 'foursomes'); assert.equal(f.team.team, 'DCBG'); assert.equal(f.team.strokes, 7);

// Saturday singles at 100%: four matches per full group
const sat = { ...T['sat-0930-bd'], players: ['ms', 'gn', 'josh', 'mt'] };
const sm = matchStrokes(sat, P, C['bandon-dunes'], S);
assert.equal(sm.pairs.length, 4);
const msJosh = sm.pairs.find((p) => p.a === 'ms' && p.b === 'josh');
assert.equal(msJosh.receiver, 'ms'); assert.equal(msJosh.strokes, 2); // 10 v 8

// 27 points, 14 to win
const st = standings(seed.tee_times, [], S, P);
assert.equal(st.total, 27); assert.equal(st.toWin, 14); assert.equal(st.matchCount, 27);

// Equitable: a Wed AM win lowers the winners by 1 for Wed PM
const res = [{ id: 'wed-0720-sr', status: 'posted', winner: 'DCBG' }];
const eq = equitableAdjustments(seed.tee_times, res, P, S, 'wed-pm');
assert.deepEqual(eq, { ms: -1, rw: -1, sc: 1, mp: 1 });
const after = matchStrokes(T['wed-1220-bd'], P, C['bandon-dunes'], S, { teeTimes: seed.tee_times, results: res });
assert.equal(after.rows.find((r) => r.pid === 'ms').ph, 7); // 8 − 1

// Singles results count toward the 12 singles points
const units = matchUnits([sat], P);
const st2 = standings([sat], units.map((u) => ({ id: u.id, status: 'posted', winner: 'JES' })), { ...S, totalPoints: null, toWin: null }, P);
assert.equal(st2.pts.JES, 4);
assert.equal(courseHandicap(10, { rating: 72.4, slope: 131, par: 72 }, null).value, 12);
console.log('golf math OK');
const half = matchStrokes(T['wed-0720-sr'], P, C['sheep-ranch'], S);
assert.equal(half.team.strokes, 2.5);
assert.equal(C['sheep-ranch'].holes.find((h) => h.n === half.team.halfHole).si, 3);
assert.equal(Object.keys(half.team.holes).length, 2);
console.log('half stroke on hole', half.team.halfHole, 'OK');
