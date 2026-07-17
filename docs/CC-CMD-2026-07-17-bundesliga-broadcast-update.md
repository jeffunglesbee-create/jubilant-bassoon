# CC-CMD: Bundesliga Broadcast Update (ESPN+ → USA Network / Fandango / Peacock)

**Repo:** jubilant-bassoon  
**File:** `index.html`  
**Branch:** main — commit directly, do not create a feature branch or PR.  
**Date:** 2026-07-17  
**Source:** DFL / Versant / NBCUniversal press releases, July 15-16 2026  

## Background

The Bundesliga's US broadcast rights changed effective 2026-27 season (starts ~August 2026):

- **Old deal:** ESPN / ESPN+ (exclusive English-language)
- **New deal (announced July 15-16 2026):**
  - English: USA Sports (Versant) — 30+ matches on **USA Network** (linear), all remaining matches free on **Fandango**
  - Spanish: NBCUniversal Telemundo — 100+ matches on **Telemundo / Universo** (linear), all matches on **Peacock**
  - Reaches 80M+ homes; ESPN/ESPN+ deal is dead

The existing `BUNDESLIGA` bundle at line 6580 points to `espnplus` — now incorrect.

No other sport bundles need changing — NBA (TNT→Prime already updated with DEPRECATED comment), MLB (Peacock/Netflix bundles already current), NHL (ESPN/TNT through 2027-28, unchanged), MLS (Apple TV+, unchanged), NFL (unchanged).

## Probe Block (run first — confirm current state)

```bash
git log --oneline -5

# Confirm BUNDESLIGA bundle current value
grep -n "BUNDESLIGA" index.html

# Confirm usa SR key exists
grep -n '"usa"' index.html | head -5

# Confirm fandango and telemundo do NOT yet exist in SR
grep -n "fandango\|telemundo" index.html | head -10

# Check where soccer SR section ends (for insertion point)
grep -n "\/\/ ── Tennis\|\/\/ ── Golf\|\/\/ ── WNBA\|\/\/ Soccer\|\/\/ ── Soccer" index.html | head -10
```

Expected: BUNDESLIGA at `["espnplus","fubo","hulu","sling","youtubetv"]`, `usa` key exists, `fandango` and `telemundo` absent.

## Changes

### Commit 1 — Add `fandango` and `telemundo` to SR registry

**Where:** Inside `const SR`, in the soccer/international section.  
Insert after the `usa` entry (currently line ~6256).

Add immediately after the `usa` entry:

```javascript
  fandango:  ["Fandango",        "https://www.fandango.com/sports",                "#FF4D00","free","Free live streaming — no subscription required. All Bundesliga matches streamed free on Fandango starting 2026-27 season (Versant/USA Sports deal). Available on web, iOS, Android."],
  telemundo: ["Telemundo",       "https://www.telemundo.com/deportes",              "#FF3B1E","tv",  "Free over-the-air (OTA antenna) or cable/satellite (Spanish-language). NBC/Telemundo deal: 100+ Bundesliga matches/season on Telemundo and Universo. All matches also stream on Peacock (Spanish). Telemundo simulcasts in same markets as NBC OTA."],
```

**Commit message:** `feat: add Fandango and Telemundo SR entries for Bundesliga 2026-27 rights`

### Commit 2 — Update `BUNDESLIGA` bundle + add `BUNDESLIGA_ES`

**Where:** `const BUNDLES`, line ~6580.

**Current line 6580:**
```javascript
  BUNDESLIGA:   ["espnplus","fubo","hulu","sling","youtubetv"],            // Bundesliga: ESPN+
```

**Replace with:**
```javascript
  // Bundesliga 2026-27: Versant/USA Sports (English) + NBCUniversal Telemundo (Spanish)
  // Announced July 15-16 2026. ESPN/ESPN+ deal ended. Effective 2026-27 season (~Aug 2026).
  // English: 30+ matches on USA Network (linear) + ALL matches free on Fandango (no sub req'd)
  // Spanish: 100+ matches on Telemundo/Universo + ALL matches on Peacock
  BUNDESLIGA:    ["usa","fandango","youtubetv","fubo","sling","hulu","directv"],   // English: USA Network (cable) + Fandango (free stream, all matches)
  BUNDESLIGA_ES: ["peacock","telemundo","youtubetv","fubo","sling","hulu","directv"], // Spanish: Peacock stream + Telemundo/Universo OTA
```

**Commit message:** `feat: update Bundesliga bundle to 2026-27 rights (USA Network + Fandango; drop ESPN+)`

## Scope Boundary — Do Not Touch

- All other BUNDLES entries — NBA/MLB/NHL/MLS/NFL are already current
- All other SR entries
- `renderBroadcastArchaeology()`, `chipHTML()`, `resolveBundle()` — no logic changes needed; SR + BUNDLES update is sufficient
- `sw.js` — no touch (no deploy-triggering path change)
- `wrangler.jsonc` — do not touch

## Commits

1. `feat: add Fandango and Telemundo SR entries for Bundesliga 2026-27 rights`
2. `feat: update Bundesliga bundle to 2026-27 rights (USA Network + Fandango; drop ESPN+)`

**Note on SW_VERSION:** These changes are in `index.html` and will trigger the deploy gate. Bump SW_VERSION in both `index.html` and `sw.js` on commit 1 (or commit 2 — either is fine, but must be bumped before push).

## Done Condition

```bash
node smoke.js index.html
# → 0 failed

# Confirm BUNDESLIGA no longer references espnplus
grep -n "BUNDESLIGA" index.html
# → BUNDESLIGA:    ["usa","fandango",...]
# → BUNDESLIGA_ES: ["peacock","telemundo",...]
# → no espnplus in either line

# Confirm new SR entries present
grep -n "fandango\|telemundo" index.html
# → fandango entry with free auth type
# → telemundo entry with tv auth type

# Confirm usa SR key still intact
grep -n '"usa":' index.html
# → ["USA Network", "https://www.usanetwork.com/live", ...]
```

## Outbox Manifest (last task)

Write `outbox/cc-session-2026-07-17-bundesliga-broadcast-update.md` containing:
- HEAD before and after (both commits)
- Smoke count before and after
- Done-condition grep output
- SW_VERSION bumped value
- Integration status: VERIFIED (client-only change, no relay dependency)
