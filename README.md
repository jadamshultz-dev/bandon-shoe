# Halcyon Days Bandon Shoe — trip app

A private, phone-first web app for the 2026 Bandon Dunes trip (Nov 1–8). It runs the Shoe (live leaderboard, match cards with strokes by hole, result entry for Marc and Josh) and carries the trip binder: tee sheet, caddies, courses, dining, lodging, travel and resort info.

- **Hosting:** Netlify, deployed from this GitHub repo
- **Database and live updates:** Supabase (free tier is plenty)
- **No sign-in:** each golfer opens the link and taps his name. The phone remembers him; "Not you? Switch golfer" is on My Day and More.
- **Offline:** the app keeps the last data it loaded, and admin edits made without signal sync when it returns

## What's loaded already

Everything in `src/data/seed.json` (built by `scripts/build-seed.mjs`):

- 13 profiles: the 12-man roster plus Craig Lilly for Mon–Tue. Adam Whitehead takes Craig's DCBG spot from Wednesday.
- Tee times Tuesday through Saturday with every group and caddie from Marc's sheet. Saturday groups are blank except MS.
- Admins: Marc Schoenecker, Josh Shultz and Mike Prawdzik. Their tools unlock with the admin PIN (see below).
- Handicap Index for all 12 players (Oct 19 GHIN) and Marc's playing handicaps by course. SC, RW and Bonnie Jon play the Gold tees; everyone else Green.
- Shoe format: Wed AM Scotch foursomes (Marc's team strokes), Wed PM–Fri PM four-ball at 80%, Saturday singles at 100% (four matches per group, set at Friday dinner). 27 points; 14 wins. Equitable adjustment after each round (−1 for a win, +1 for a loss) is applied automatically.
- Dinners from Marc's itinerary and the Shoe local rules (Resort info page).
- 1 point per match, ½ each for a halve, $160 per player per round for caddies.
- Six courses, eight restaurants (hours marked "verify"), ten rooms, the church van legs and the rental car.
- Thursday Preserve RSVPs from the sheet.

Course ratings, slopes, pars and stroke indexes are **not** loaded. Enter them from the official scorecards under Courses → Edit scorecard (there's a quick-fill box for pasting a whole par or handicap row). Until then, match cards show the stroke count but not the stroke holes.

## Set it up (about 20 minutes)

### 1. Supabase
1. Create a project at supabase.com.
2. SQL editor → open `supabase/schema.sql`, change the admin PIN at the bottom (`CHANGE-ME-ADMIN`) to your own (the caddie PIN is spare; change it too or leave it), then run it.
3. Run `supabase/seed.sql`.
4. Project Settings → API: copy the **Project URL** and the **anon public** key.

### 2. GitHub
Push this folder to a new private repo.

### 3. Netlify
1. Add new site → Import from GitHub → pick the repo. Build command and publish folder come from `netlify.toml`.
2. Site configuration → Environment variables: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Deploy, then text the link to the group. Each golfer taps his name.

## Admin links for Marc, Josh and Mike

Instead of typing a PIN, each admin taps a private link once:

`https://YOUR-SITE.netlify.app/?admin=YOUR-ADMIN-PIN`

The app saves the code on that phone, removes it from the address bar, and unlocks the admin tools as soon as he taps his name. Send the link to each admin directly, never to the group thread: anyone who has it gets scoring rights. If it leaks, change the admin PIN in Supabase (see below) and send new links; old links stop working and say so.

iPhone: open the admin link in Safari, then Share → Add to Home Screen from that page, so the home-screen app starts unlocked. (Safari and home-screen apps keep separate storage.)

Typing the PIN under More → Unlock still works as a backup.

## PINs and who can change what

There's no sign-in, so anyone with the link can open the app and pick any name. Keep the link to the group. The PINs keep the scoring safe:

| Who | Can change | How |
|---|---|---|
| Marc, Josh, Mike | Everything: results, pairings, handicaps, settings, courses, dinners, rooms, announcements. Undo any change from Admin → Audit log. | Pick your name, then More → enter the **admin PIN** once on that phone |
| Every golfer | His own RSVPs (dinners, Preserve, van seat) and his profile details (GHIN #, tees, phone, flights, Sunday lodging) | Nothing to unlock |

The database enforces the PIN rules, not just the app. Names, teams and Handicap Index can only be changed with the admin PIN. Every change is logged with the initials of whoever made it.

To change a PIN later, run in the SQL editor: `update public.app_secrets set value = 'new-pin' where key = 'admin_pin';`

## Posting a result

Paper card → Marc checks it → Josh (or Marc) opens Admin → Results → the match → picks the winner and margin → ticks **Scorecard verified by MS** → Review → Post. The leaderboard updates on every phone within a second or two.

## Strokes

Course Handicap = Index × Slope ÷ 113 + (Course Rating − Par), rounded. Playing handicap = Course Handicap × allowance (90% unless a session sets its own). The low man in the match plays off zero; the others get the difference, on the holes with the lowest stroke index. Admins can add or take away a stroke for any player in a specific match from the match card.

## GHIN

Handicap Index is entered by hand by an admin under Admin → Handicaps. The USGA only allows automatic GHIN lookups through its approved developer programs, so the app stores each GHIN number and links to GHIN rather than pulling indexes itself.

## Local development

```
npm install
cp .env.example .env.local   # or set VITE_DEMO=1 to run with sample data, no sign-in
npm run dev
npm test                     # handicap and standings math
```

To change the starting data, edit `scripts/build-seed.mjs`, then `npm run seed` and re-run `supabase/seed.sql` (it skips rows that already exist; run `node scripts/gen-seed-sql.mjs --overwrite` to replace them).
