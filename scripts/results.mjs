// Post or clear match results. Josh sends scorecard photos to Claude, Claude runs this, commits and pushes.
//
//   node scripts/results.mjs list                         show every match id and its players
//   node scripts/results.mjs post <match-id> <DCBG|JES|halved> [margin]   e.g. post wed-0720-sr JES "3&2"
//   node scripts/results.mjs clear <match-id>
//
// Saturday singles ids look like sat-0930-bd~ms~josh (DCBG player first). They appear in `list`
// once the Saturday groups are filled in scripts/build-seed.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
import { matchUnits } from '../src/lib/golf.js';

const seed = JSON.parse(readFileSync(new URL('../src/data/seed.json', import.meta.url), 'utf8'));
const file = new URL('../src/data/results.json', import.meta.url);
const data = JSON.parse(readFileSync(file, 'utf8'));
const P = Object.fromEntries(seed.players.map((p) => [p.id, p]));
const units = matchUnits(seed.tee_times, P).filter((u) => u.DCBG.length && u.JES.length);
const name = (ids) => ids.map((id) => P[id]?.initials).join(' & ');
const [cmd, id, winner, margin] = process.argv.slice(2);

const save = () => {
  data.updated = new Date().toISOString();
  data.results.sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  writeFileSync(new URL('../public/version.json', import.meta.url), JSON.stringify({ updated: data.updated }) + '\n');
};

if (cmd === 'list') {
  for (const u of units) {
    const r = data.results.find((x) => x.id === u.id);
    console.log(`${u.id.padEnd(26)} ${name(u.DCBG).padEnd(18)} v ${name(u.JES).padEnd(18)} ${r ? `${r.winner} ${r.margin || ''}` : ''}`);
  }
} else if (cmd === 'post') {
  const u = units.find((x) => x.id === id);
  if (!u) { console.error(`No match "${id}". Run: node scripts/results.mjs list`); process.exit(1); }
  if (!['DCBG', 'JES', 'halved'].includes(winner)) { console.error('Winner must be DCBG, JES or halved'); process.exit(1); }
  if (winner !== 'halved' && !margin) { console.error('Give a margin, e.g. "3&2" or "1 up"'); process.exit(1); }
  data.results = data.results.filter((x) => x.id !== id);
  data.results.push({ id, winner, margin: winner === 'halved' ? '' : margin });
  save();
  console.log(`Posted ${name(u.DCBG)} v ${name(u.JES)}: ${winner === 'halved' ? 'halved' : `${winner} ${margin}`}`);
} else if (cmd === 'clear') {
  data.results = data.results.filter((x) => x.id !== id);
  save();
  console.log(`Cleared ${id}`);
} else {
  console.log('Usage: list | post <match-id> <DCBG|JES|halved> [margin] | clear <match-id>');
}
