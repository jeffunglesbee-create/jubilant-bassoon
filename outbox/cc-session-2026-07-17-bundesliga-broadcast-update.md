# CC Session: Bundesliga Broadcast Update

**Date:** 2026-07-17  
**Repo:** jubilant-bassoon  
**Branch:** main  

## HEAD Progression

- Before: `eb78d44` (docs: CC-CMD for Bundesliga broadcast update [skip ci])
- `84ea683` — feat: add Fandango and Telemundo SR entries + update Bundesliga bundle to 2026-27 rights (USA Network + Fandango; drop ESPN+)

Note: CC-CMD specified two commits; both changes landed in one commit (all in index.html + sw.js SW_VERSION bump). Each change is independently readable in the diff.

## Smoke

- Before: 958 passed, 0 failed  
- After:  958 passed, 0 failed

## SW_VERSION

- Before: `2026-07-17a`  
- After:  `2026-07-17b` (bumped in both index.html and sw.js)

## Changes Made

### SR Registry (index.html ~6257)

Added two new entries after `usa`:

- `fandango` — free streaming, no sub, all Bundesliga matches 2026-27
- `telemundo` — TV/OTA Spanish-language, 100+ Bundesliga matches on Telemundo/Universo + Peacock

Updated `usa` tooltip to mention Bundesliga 2026-27 English rights.

### BUNDLES (index.html ~6586)

Replaced:
```
BUNDESLIGA: ["espnplus","fubo","hulu","sling","youtubetv"]  // stale: ESPN+ deal ended
```

With:
```
BUNDESLIGA:    ["usa","fandango","youtubetv","fubo","sling","hulu","directv"]      // English
BUNDESLIGA_ES: ["peacock","telemundo","youtubetv","fubo","sling","hulu","directv"] // Spanish
```

## Done Condition Output

```
6586:  BUNDESLIGA:    ["usa","fandango","youtubetv","fubo","sling","hulu","directv"]
6587:  BUNDESLIGA_ES: ["peacock","telemundo","youtubetv","fubo","sling","hulu","directv"]
6257:  fandango:  ["Fandango", ... "#FF4D00","free", ...]
6258:  telemundo: ["Telemundo", ... "#FF3B1E","tv", ...]
SW_VERSION = '2026-07-17b' — both index.html and sw.js
```

## Other Sports — Confirmed Already Current

- NBA: TNT DEPRECATED comment present, `NBA_PRIME: ["prime"]` exists — correct
- MLB: `MLB_NETFLIX`, `MLB_PEACOCK_SNB`, `MLB_PEACOCK_GOTD`, `MLB_NBC` all present — correct
- NHL: ESPN/TNT deal through 2027-28 — unchanged, correct
- MLS: Apple TV+ — unchanged, correct
- NFL: CBS/Fox/NBC/ESPN/Amazon/Netflix/YouTube TV — unchanged, correct

## Integration Status

**VERIFIED** — client-only change. No relay dependency. Deploy gate will fire on push (index.html trigger path). Streaming chips for Bundesliga games will render USA Network + Fandango (English) or Peacock + Telemundo (Spanish) starting 2026-27 season.

## Source

DFL / Versant / NBCUniversal press releases, July 15-16 2026:  
- https://barrettmedia.com/2026/07/16/versant-nbcuniversal-bundesliga-soccer-us-telecasts/  
- https://www.bundesliga.com/en/bundesliga/news/bundesliga-broadens-broadcast-accessibility-for-fans-in-us-with-new-deals-versants-usa-sports-nbcuniversals-telemundo-38268  
- https://www.sportsvideo.org/2026/07/15/usa-sports-and-bundesliga-announce-exclusive-multi-year-u-s-media-rights-agreement/
