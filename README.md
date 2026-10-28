# Halcyon Days Bandon Shoe — trip app

A phone-first web app for the 2026 Bandon Dunes trip (Nov 3–7). Each golfer opens the link, taps his name, and sees his day: tee times, partners, opponents, strokes by hole, caddie and dinner. Everyone sees the live leaderboard, the full tee sheet, courses, dining and the Shoe rules.

**Live site:** https://bandon-shoe.netlify.app

## How it stays up to date

The app is read-only. There's no database, no sign-in and no admin screens.

1. Marc hands Josh the signed scorecards.
2. Josh snaps a photo and sends it to Claude.
3. Claude records the results, commits to this repo and pushes.
4. Netlify republishes in a minute or two. Phones pick up the new version when the app is reopened or brought back to the foreground.

The same goes for any other change: caddie swaps, Saturday singles groups, dinner changes, wording. Josh asks Claude; Claude edits the files and pushes.

The paper scorecard is always the official record.

## Where the data lives

| File | What's in it | How it changes |
|---|---|---|
| `src/data/results.json` | Every posted match result and a last-updated time | `node scripts/results.mjs post <match-id> <DCBG\|JES\|halved> [margin]` |
| `scripts/build-seed.mjs` | Players, handicaps, tees, tee times, groups, caddies, dinners, rules, Marc's playing handicaps | Edit, then `npm run seed` to rebuild `src/data/seed.json` |
| `scripts/scorecards.mjs` | Par, stroke index, yardage, rating and slope for each course (from GolfPass; not yet checked against the resort's cards) | Edit, then `npm run seed` |

`node scripts/results.mjs list` shows every match id with its players and any posted result. Saturday singles ids (for example `sat-0930-bd~ms~josh`) appear once the Saturday groups are filled in `build-seed.mjs`.

## What the app works out on its own

- Strokes for every match, by format: Scotch foursomes uses Marc's team strokes (a half stroke wins its hole on a tie); four-ball at 80% and singles at 100% use Marc's playing handicaps by course, off the low man.
- The equitable adjustment: −1 to a player's handicap for each Shoe match he wins, +1 for each loss, applied to his later sessions.
- Team points (27 in all, 14 to win), session totals, player records and the clinch banner.

## Hosting

GitHub (`jadamshultz-dev/bandon-shoe`) → Netlify. Every push to `main` deploys. Netlify needs no environment variables.

Save to the home screen: on iPhone, open the link in Safari → Share → Add to Home Screen. On Android, open it in Chrome → ⋮ → Add to Home screen.

## Local development

```
npm install
npm run dev
npm test        # handicap, strokes and standings math
```
