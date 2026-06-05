# FIELD HANDOFF — 2026-06-06 (Session END — AFL/CFL journalism surfaces complete)

## State
jubilant-bassoon HEAD: d2026c4 · Smoke: 509/0 · Unit: 66/0
field-relay-nba HEAD: 981d474
SW_VERSION: 2026-06-05a

## AFL/CFL Journalism Surface Audit — COMPLETE ✅

### Gaps found and fixed (d2026c4 / 602532c)

| Surface | AFL before | AFL after | CFL before | CFL after |
|---|---|---|---|---|
| `_terms` Night Owl voice | ✅ | ✅ | ❌ | ✅ |
| `dramaScoreLive` calibration | ✅ | ✅ | ❌ | ✅ |
| `classifySport` isSport flag | ✅ | ✅ | ❌ | ✅ |
| `_leagueTag` in compound | ✅ | ✅ | ❌ "CANADIAN FOOTBAL" | ✅ "CFL" |
| `getFieldVoice` | ❌ | ✅ inline | ❌ | ✅ inline |
| `SPORT_VOCAB_VIOLATIONS` | ❌ | ✅ | ❌ | ✅ |
| `detectSportClass` | ❌ | ✅ | ❌ | ✅ |
| `_terms` bottom-sheet recap | ❌ | ✅ | ❌ | ✅ |

### CFL specifics added
- Voice: 3 downs (not 4), rouge=1pt, wider field, convert, major
- Forbidden vocab: "four downs", "fourth down", NBA/MLB/soccer terms, "NFL game"
- Drama: NFL-equivalent calibration (one-score = 8pts), Q4 urgency
- `detectSportClass` → 'cfl', `SPORT_VOCAB_VIOLATIONS.cfl` entry
- `_leagueTag` → 'CFL' (was falling through to raw.toUpperCase → "CANADIAN FOOTBAL")

### AFL specifics added (gaps were narrower)
- `getFieldVoice` inline: marks, handballs, clearances, inside-50s, goals.behinds.total
- `SPORT_VOCAB_VIOLATIONS.afl` entry with forbidden American/basketball/baseball terms
- `detectSportClass` → 'afl'
- Bottom-sheet `_terms` block: goals.behinds.total scoring

### What remains NOT wired for CFL
- Live scores (no api.cfl.ca key — free registration at tech@cfl.ca)
- `getStatisticalExtremes` — no CFL-specific extreme detection (not a gap; no live scores)
- `getStatOfDay` — no CFL stat tracking (not a gap; no data source)
- `getQualityTarget` — no CFL quality history tracking (small; low priority)

### What remains NOT wired for AFL
- `getStatOfDay` — no AFL stat (Squiggle doesn't provide enough for stat-of-day)
- `getQualityTarget` — no AFL quality history tracking (same)
- `getStatisticalExtremes` — no AFL Q4 surge detection (Squiggle has period scores but it's a minor gap)

## Priority List
1. JQ Gate brand-safe fallback (~60 lines)
2. Drama Dial header chip (~20 lines)
3. Arc Poster (~200 lines, BLOCKER: verify getDramaHistory() populated live)
4. State Transition PerformanceObserver (~30 lines)
5. iOS PWA Add-to-Home (~40 lines)

## Key Refs
jubilant-bassoon HEAD: d2026c4
field-relay-nba HEAD: 981d474
Smoke: 509/0 · Unit: 66/0
