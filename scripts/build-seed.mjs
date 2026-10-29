// Builds src/data/seed.json — the starting data for the app and the Supabase seed.
// Edit here, then run: npm run seed
import { writeFileSync } from 'node:fs';
import { applyScorecard } from './scorecards.mjs';

const P = (id, name, initials, team, emails, extra = {}) => ({
  id, name, initials, team,
  role: 'player', captain: false, index: null, tee: '', phone: '',
  homeClub: '', activeFrom: '2026-11-02', activeTo: '2026-11-08',
  sundayLodging: 'Bandon Inn', flightIn: '', flightOut: '', dietary: '', notes: '',
  ...extra,
});

const players = [
  P('mp', 'Mike Prawdzik', 'MP', 'JES', ['mike.prawdzik@gmail.com'], { captain: true, role: 'admin' }),
  P('josh', 'Josh Shultz', 'Josh', 'JES', ['jadamshultz@gmail.com'], { captain: true, role: 'admin' }),
  P('sc', 'Steve Cook', 'SC', 'JES', ['swcook522@gmail.com']),
  P('ap', 'Austin Piephoff', 'AP', 'JES', ['Austinpiephoff@hotmail.com']),
  P('mt', 'Marc Tardif', 'MT', 'JES', ['mtardif@gmail.com']),
  P('court', 'Court Lanio', 'Court', 'JES', ['court.lanio@gmail.com']),
  P('ms', 'Marc Schoenecker', 'MS', 'DCBG', ['marc.schoenecker@verizon.com', 'marcschoenecker@yahoo.com'], { captain: true, role: 'admin' }),
  P('aw', 'Adam Whitehead', 'AW', 'DCBG', [], { homeClub: 'Las Colinas Country Club, Irving, TX', activeFrom: '2026-11-04', notes: '' }),
  P('gn', 'Greg Noschese', 'GN', 'DCBG', ['gnoschese@munsch.com'], { captain: true }),
  P('rw', 'Rick Wiley', 'RW', 'DCBG', ['rick.wiley@verizon.net']),
  P('joel', 'Joel Schoenecker', 'Joel', 'DCBG', ['jschoe0309@gmail.com']),
  P('jon', 'Bonnie Jon Schoenecker', 'Bonnie Jon', 'DCBG', ['getjon62@gmail.com'], { nickname: 'Bonnie Jon' }),
  P('cl', 'Craig Lilly', 'CL', 'DCBG', [], { guest: true, activeTo: '2026-11-03', notes: 'Monday and Tuesday practice rounds only. Not in the Shoe.' }),
];

// Handicap Index from Marc's final sheet, locked as of Oct 19, 2026.
const INDEX = { gn: 2.7, ms: 9.2, rw: 10.6, joel: 11.1, aw: 11.5, jon: 29, ap: 6.9, josh: 7.8, court: 10.1, mt: 11.6, mp: 12.7, sc: 12.8 };
const GOLD = ['sc', 'rw', 'jon']; // everyone else plays the Green tees
for (const p of players) { if (INDEX[p.id] !== undefined) p.index = INDEX[p.id]; p.tee = GOLD.includes(p.id) ? 'Gold' : 'Green'; }

// Caddies from Marc's updated sheet (Oct 26). Adam Schneck and Conrad are out; PK Deveraux and Jackson Jeffries are in.
const SD = 'Surfer Dave', BJ = 'Bob Janus', BH = 'Ben Horton', PK = 'PK Deveraux', JJ = 'Jackson Jeffries';
const T = (id, date, time, course, session, kind, list, extra = {}) => ({
  id, date, time, course, session, kind,
  players: list.map((x) => x[0]),
  caddies: Object.fromEntries(list.map((x) => [x[0], x[1] ?? null])),
  paceSetter: false, adjust: {}, ...extra,
});

const teeTimes = [
  // Monday practice rounds from Marc's sheet. (The open 12:00 Bandon Trails time was dropped.)
  T('mon-1210-om', '2026-11-02', '12:10', 'old-macdonald', null, 'casual', [['gn'], ['sc'], ['mt'], ['ap']]),
  T('mon-1220-bd', '2026-11-02', '12:20', 'bandon-dunes', null, 'casual', [['ms'], ['cl'], ['rw'], ['mp']]),

  T('tue-1200-bt', '2026-11-03', '12:00', 'bandon-trails', null, 'casual', [['mp'], ['mt'], ['josh'], ['court']]),
  T('tue-1200-bd', '2026-11-03', '12:00', 'bandon-dunes', null, 'casual', [['ms'], ['cl'], ['jon'], ['joel']]),
  T('tue-1210-sr', '2026-11-03', '12:10', 'sheep-ranch', null, 'casual', [['gn'], ['rw'], ['sc'], ['ap']]),

  T('wed-0720-sr', '2026-11-04', '07:20', 'sheep-ranch', 'wed-am', 'match', [['ms', SD], ['rw', SD], ['sc', BJ], ['mp', BJ]], { paceSetter: true, teamStrokes: { team: 'JES', strokes: 2.5, calc: 'MS/RW 3 + 2.4 = 5.4 · SC/MP 4.2 + 3.6 = 7.8' } }),
  T('wed-0730-sr', '2026-11-04', '07:30', 'sheep-ranch', 'wed-am', 'match', [['gn', PK], ['aw', PK], ['josh', BH], ['court', BH]], { paceSetter: true, teamStrokes: { team: 'JES', strokes: 2, calc: 'GN/AW 0.6 + 3.2 = 3.8 · Josh/Court 3 + 2.8 = 5.8' } }),
  T('wed-0740-sr', '2026-11-04', '07:40', 'sheep-ranch', 'wed-am', 'match', [['joel'], ['jon'], ['mt', JJ], ['ap']], { paceSetter: true, teamStrokes: { team: 'DCBG', strokes: 7, calc: 'Joel/Bonnie Jon 4.8 + 7.6 = 12.4 · AP/MT 2.4 + 3.2 = 5.6' } }),
  T('wed-1220-bd', '2026-11-04', '12:20', 'bandon-dunes', 'wed-pm', 'match', [['ms', SD], ['aw', SD], ['mt', BH], ['josh', BH]]),
  T('wed-1220-pd', '2026-11-04', '12:20', 'pacific-dunes', 'wed-pm', 'match', [['gn', PK], ['joel'], ['sc', PK], ['ap']]),
  T('wed-1230-bd', '2026-11-04', '12:30', 'bandon-dunes', 'wed-pm', 'match', [['rw', JJ], ['jon'], ['mp', BJ], ['court', BJ]]),

  T('thu-0800-bp', '2026-11-05', '08:00', 'bandon-preserve', null, 'optional', []),
  T('thu-0815-bp', '2026-11-05', '08:15', 'bandon-preserve', null, 'optional', []),
  T('thu-1120-pd', '2026-11-05', '11:20', 'pacific-dunes', 'thu', 'match', [['ms', SD], ['gn', SD], ['ap', PK], ['court', PK]]),
  T('thu-1130-pd', '2026-11-05', '11:30', 'pacific-dunes', 'thu', 'match', [['aw', BH], ['rw', BH], ['sc', JJ], ['josh', JJ]]),
  T('thu-1140-pd', '2026-11-05', '11:40', 'pacific-dunes', 'thu', 'match', [['joel'], ['jon'], ['mp', BJ], ['mt', BJ]]),

  T('fri-0730-pd', '2026-11-06', '07:30', 'pacific-dunes', 'fri-am', 'match', [['ms', SD], ['jon'], ['sc', SD], ['ap']], { paceSetter: true }),
  T('fri-0740-pd', '2026-11-06', '07:40', 'pacific-dunes', 'fri-am', 'match', [['rw', PK], ['gn', PK], ['court', JJ], ['mt', JJ]], { paceSetter: true }),
  T('fri-0750-pd', '2026-11-06', '07:50', 'pacific-dunes', 'fri-am', 'match', [['aw', BH], ['joel', BH], ['josh', BJ], ['mp', BJ]], { paceSetter: true }),
  T('fri-1230-om', '2026-11-06', '12:30', 'old-macdonald', 'fri-pm', 'match', [['ms', SD], ['joel', SD], ['mp', BJ], ['court', BJ]]),
  T('fri-1230-sr', '2026-11-06', '12:30', 'sheep-ranch', 'fri-pm', 'match', [['gn', PK], ['jon'], ['ap'], ['josh', PK]]),
  T('fri-1240-sr', '2026-11-06', '12:40', 'sheep-ranch', 'fri-pm', 'match', [['rw', BH], ['aw', BH], ['sc', JJ], ['mt', JJ]]),

  T('sat-0930-bd', '2026-11-07', '09:30', 'bandon-dunes', 'sat', 'singles', []),
  T('sat-0940-bd', '2026-11-07', '09:40', 'bandon-dunes', 'sat', 'singles', []),
  T('sat-0950-bd', '2026-11-07', '09:50', 'bandon-dunes', 'sat', 'singles', []),
];

const blankHoles = (n) => Array.from({ length: n }, (_, i) => ({ n: i + 1, par: null, si: null, yards: {}, note: '' }));
const C = (id, name, designer, opened, holes, shop, nearby, blurb) => ({
  id, name, designer, opened, holeCount: holes, shop, nearby, blurb,
  tees: [], holes: blankHoles(holes), verified: false, flyover: '', mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' golf course Bandon Oregon')}`,
});

const courses = [
  C('bandon-dunes', 'Bandon Dunes', 'David McLay Kidd', 1999, 18, '(541) 347-5888', 'The Gallery & Puffin Bar · McKee\'s Pub', 'The original. Clifftop holes along the Pacific, starting from the Main Lodge.'),
  C('pacific-dunes', 'Pacific Dunes', 'Tom Doak', 2001, 18, '(541) 347-5831', 'Pacific Grill', 'Big dunes and blowout bunkers above the Pacific.'),
  C('bandon-trails', 'Bandon Trails', 'Coore & Crenshaw', 2005, 18, '(541) 347-5958', 'Trails End', 'Dunes to meadow to forest and back. The most inland of the courses.'),
  C('old-macdonald', 'Old Macdonald', 'Tom Doak & Jim Urbina', 2010, 18, '(800) 742-0172', '', 'A tribute to C.B. Macdonald: huge greens and template holes.'),
  C('sheep-ranch', 'Sheep Ranch', 'Coore & Crenshaw', 2020, 18, '(800) 742-0172', '', 'Wide-open headland with greens along the cliff edge.'),
  C('bandon-preserve', 'Bandon Preserve', 'Coore & Crenshaw', 2012, 13, '(541) 347-5958', 'Trails End', '13-hole par-3 course. Optional Thursday morning, not part of the Shoe.'),
];

for (let i = 0; i < courses.length; i++) courses[i] = applyScorecard(courses[i]);

const H = (meal, open, close) => ({ meal, open, close });
// Menus: the latest menu the resort has posted for each outlet, or its current dining page where no
// recent menu is posted (the Gallery reopened in 2026 with a new Italian menu). Phones from the resort's dining page.
const DINING = 'https://bandondunesgolf.com/dining/restaurants/';
const UP = 'https://bandondunesgolf.com/wp-content/uploads/';
const restaurants = [
  { id: 'ghost-tree', name: 'Ghost Tree Grill', kind: 'Steakhouse and raw bar', where: '', phone: '(855) 220-6710', booking: 'Reservations', hours: [H('Dinner', '17:00', '22:00')], verified: false, menu: UP + '2026/10/GTG-Menu-10-26-26-Dinner.pdf', menuNote: 'Dinner menu, Oct 26, 2026' },
  { id: 'gallery', name: 'The Gallery & Puffin Bar', kind: 'Main dining room; new Italian menu for lunch and dinner', where: 'Main Lodge', phone: '(541) 347-5220', booking: 'Reservations recommended for dinner', hours: [H('Breakfast', '06:00', '11:00'), H('Lunch', '11:00', '17:00'), H('Dinner', '17:00', '22:00')], verified: false, menu: DINING, menuNote: 'New 2026 menu on the resort site' },
  { id: 'mckees', name: "McKee's Pub", kind: 'Scottish-style pub', where: '', phone: '(541) 347-5861', booking: 'Walk-in only', hours: [H('Dinner', '16:00', '23:00')], verified: false, menu: UP + '2025/08/McKees-Pub-Menu-8-1-25-Dinner.pdf', menuNote: 'Dinner menu, Aug 2025' },
  { id: 'pacific-grill', name: 'Pacific Grill', kind: 'Clubhouse restaurant', where: 'Pacific Dunes clubhouse', phone: '(541) 347-8432', booking: '', hours: [], verified: false, menu: UP + '2024/08/Pacific-Grill-Dinner-Menu-8.26.24.pdf', menuNote: 'Dinner menu, Aug 2024' },
  { id: 'trails-end', name: 'Trails End', kind: 'Pacific Rim plates', where: 'Bandon Trails / Preserve clubhouse', phone: '(541) 347-8431', booking: '', hours: [], verified: false, menu: DINING, menuNote: 'Current menus on the resort site' },
  { id: 'sheep-ranch-club', name: 'Sheep Ranch Clubhouse', kind: 'Clubhouse food and drink', where: 'Sheep Ranch', phone: '(541) 347-8434', booking: '', hours: [], verified: false, menu: DINING, menuNote: 'Current menus on the resort site' },
  { id: 'charlottes', name: "Charlotte's", kind: 'Quick bite before a round (may be closed for the season)', where: 'Practice Center', phone: '(541) 347-5778', booking: '', hours: [], verified: false, menu: UP + '2023/04/Charlottes-PC-Menu.pdf', menuNote: 'Menu, 2023' },
  { id: 'shortys', name: "Shorty's", kind: 'Quick-serve street food', where: "Shorty's clubhouse", phone: '(541) 347-5881', booking: '', hours: [], verified: false, menu: UP + '2024/05/Shortys-Menu.pdf', menuNote: 'Menu, May 2024' },
  { id: 'library', name: 'The Library Lounge', kind: 'Lounge at the Inn', where: 'The Inn', phone: '(541) 347-5277', booking: '', hours: [], verified: false, menu: UP + '2023/10/Library-Lounge-Menu-10.18.23.pdf', menuNote: 'Menu, Oct 2023' },
  { id: 'bunker-bar', name: 'Bunker Bar', kind: 'Late-night bar', where: 'Main Lodge', phone: '(541) 347-5220', booking: '', hours: [], verified: false, menu: DINING, menuNote: 'Current menus on the resort site' },
  { id: 'wheelhouse', name: 'The Wheelhouse', kind: 'Restaurant in Bandon (off resort)', where: '125 Chicago St, Old Town Bandon', phone: '(541) 347-9331', booking: 'Reservation (Marc)', hours: [], verified: false, menu: 'https://thewheelhouserestaurant.com/', menuNote: 'Restaurant website' },
];

const rooms = [
  { id: 'r-ms-jon', type: 'Golf Double', occupants: ['ms', 'jon'], number: '', conf: '', checkout: '2026-11-07' },
  { id: 'r-joel-ap', type: 'Golf Double', occupants: ['joel', 'ap'], number: '', conf: '', checkout: '2026-11-07' },
  ...['mp', 'josh', 'sc', 'mt', 'court', 'gn'].map((p) => ({ id: `r-${p}`, type: 'Golf King', occupants: [p], number: '', conf: '', checkout: '2026-11-07' })),
  { id: 'r-rw', type: 'Golf King', occupants: ['rw'], number: '', conf: '', checkout: '2026-11-08' },
  { id: 'r-aw', type: 'Golf King', occupants: ['aw'], number: '', conf: '', checkout: '2026-11-08', note: 'Confirm Adam\'s checkout.' },
];

const rides = [
  { id: 'van-sun', name: 'Church van · Sunday arrivals', date: '2026-11-01', time: '', detail: 'Pickups at PDX (~2 pm) or EUG (~5 pm). Booked by GN.', capacity: 8, passengers: [], driver: 'gn' },
  { id: 'van-sat', name: 'Church van · Saturday return', date: '2026-11-07', time: '', detail: 'Back to EUG or PDX Saturday afternoon/evening.', capacity: 8, passengers: [], driver: 'gn' },
  { id: 'rental', name: 'Rental car (MS & RW)', date: '', time: '', detail: 'MS and RW arrive early to hike. Spare seats available.', capacity: null, passengers: ['ms', 'rw'], driver: 'ms' },
];

const sessions = [
  { id: 'wed-am', label: 'Wed AM', date: '2026-11-04', format: 'Scotch foursomes', allowance: null, points: 3 },
  { id: 'wed-pm', label: 'Wed PM', date: '2026-11-04', format: 'Four-ball', allowance: 0.8, points: 3 },
  { id: 'thu', label: 'Thu', date: '2026-11-05', format: 'Four-ball', allowance: 0.8, points: 3 },
  { id: 'fri-am', label: 'Fri AM', date: '2026-11-06', format: 'Four-ball', allowance: 0.8, points: 3 },
  { id: 'fri-pm', label: 'Fri PM', date: '2026-11-06', format: 'Four-ball', allowance: 0.8, points: 3 },
  { id: 'sat', label: 'Sat', date: '2026-11-07', format: 'Singles', allowance: 1, points: 12 },
];

// Marc's playing handicaps by course and allowance (from his final sheet).
const playingHcp = {
  'pacific-dunes': { 80: { gn: 2, ms: 9, rw: 8, joel: 10, aw: 11, jon: 25, ap: 6, josh: 7, court: 9, mt: 11, mp: 12, sc: 10 } },
  'bandon-dunes': {
    80: { gn: 2, ms: 8, rw: 7, joel: 10, aw: 10, jon: 23, ap: 6, josh: 7, court: 9, mt: 10, mp: 11, sc: 9 },
    100: { gn: 2, ms: 10, rw: 9, joel: 12, aw: 13, jon: 29, ap: 7, josh: 8, court: 11, mt: 13, mp: 14, sc: 11 },
  },
  'sheep-ranch': { 80: { gn: 1, rw: 5, aw: 8, jon: 19, ap: 4, josh: 5, mt: 8, sc: 7 } },
  'old-macdonald': { 80: { ms: 9, joel: 10, court: 9, mp: 12 } },
};

const localRules = [
  'Play the ball down everywhere, except embedded-ball and divot relief in fairways and light rough: one club length for an embedded ball, one grip length for a divot, no closer to the hole.',
  'Penalty areas, OB and lost balls are all played the same: drop within two club lengths of where the ball crossed into the area, one penalty stroke.',
  'The MP Rule: you drop where the ball crossed into the water, gorse or OB, not level with where it finished.',
  'The Shahin Boat Race Rule: if you or your team is 4 up or more, any strokes you would get on the remaining holes are waived until you are 3 up or less.',
  'Equitable adjustment after each round: win a match and your course handicap goes down 1; lose and it goes up 1.',
  'Saturday singles: four separate matches in each group. Only the player in that match can concede a putt, so assume you putt everything out.',
];

const settings = [{
  id: 'main', allowance: 0.8, pointsWin: 1, pointsHalve: 0.5, caddieRate: 160, handicapLock: '2026-10-19', equitable: true,
  totalPoints: 27, toWin: 14, playingHcp, localRules,
  caddies: [SD, BJ, BH, PK, JJ, 'TBD'], sessions, teams: {
    DCBG: { name: 'DCBG', full: 'DisHonourable Company of Bandon Golfers' },
    JES: { name: 'Jesters', full: 'Team Jesters' },
  },
}];

const dinners = [
  { id: 'd-mon', date: '2026-11-02', time: '', restaurant: "McKee's Pub", party: '', conf: '', split: '', note: 'No reservation. Marc is walking over for dinner by the fireplace; all welcome.', tables: [] },
  { id: 'd-tue', date: '2026-11-03', time: '19:00', restaurant: 'Ghost Tree Grill', party: 12, conf: '', split: '', note: 'Three tables.', tables: [['ms', 'cl', 'ap', 'joel', 'jon'], ['court', 'josh', 'mp', 'mt'], ['rw', 'gn', 'sc', 'aw']] },
  { id: 'd-wed', date: '2026-11-04', time: '', restaurant: "McKee's Pub", party: '', conf: '', split: '', note: 'No reservation. Several will eat by the McKee’s fireplace; some may have pizza delivered to the library bar at the Inn.', tables: [] },
  { id: 'd-thu', date: '2026-11-05', time: '17:30', restaurant: 'Pacific Grill', party: 12, conf: '', split: '', note: 'Three tables of 4, no assigned seating.', tables: [] },
  { id: 'd-fri', date: '2026-11-06', time: '19:00', restaurant: 'The Wheelhouse', party: 12, conf: '', split: '', note: 'Upstairs, in town. Saturday singles matches are set at this dinner. Also a table downstairs for Dave, Kelly, Liam and Alivia.', tables: [] },
];

const rsvps = [
  ...['sc', 'joel', 'mp', 'mt', 'jon', 'ap', 'aw', 'court'].map((p) => ({ id: `preserve:${p}`, kind: 'preserve', ref: 'preserve', player: p, status: 'in' })),
  ...['ms', 'gn', 'josh'].map((p) => ({ id: `preserve:${p}`, kind: 'preserve', ref: 'preserve', player: p, status: 'out' })),
];

const announcements = [
  { id: 'a1', at: '2026-10-19T17:30:00-07:00', by: 'ms', pinned: true, text: 'Final pairings, caddies and handicaps are loaded. Results go up after Marc checks each card. 27 points in the Shoe; 14 wins it.' },
];

const seed = { players, tee_times: teeTimes, courses, restaurants, rooms, rides, settings, rsvps, announcements, dinners, results: [] };
writeFileSync(new URL('../src/data/seed.json', import.meta.url), JSON.stringify(seed, null, 2));
console.log('seed.json written:', Object.fromEntries(Object.entries(seed).map(([k, v]) => [k, v.length])));
