# CC-CMD — Odds API Adapter Proof Phase 2: Smoke + Feature Registry

**Date:** 2026-06-29
**Repo:** jeffunglesbee-create/jubilant-bassoon (CLIENT ONLY)
**Scope:** 8 AVV-ODDS smoke assertions + Feature Registry + SW_VERSION bump
**Target time:** 15 min

---

## CONFIDENCE GATE

Do not push unless confidence ≥ 95.

---

## DONE CONDITION

node smoke.js index.html exits 0 with 8 new AVV-ODDS assertions green.
'adapter-proof-odds-api' in Feature Registry.

Verify explicitly:
```bash
node smoke.js index.html 2>&1 | grep -E "AVV-ODDS|Results:"
```

---

## PROBE BLOCK

```bash
# What odds-related strings exist in index.html?
grep -n "ODDS\|odds\|extractOdds\|oddsStory\|moneyline\|draftkings\|ODDS_SPORT\|openingWP\|wpDelta" index.html | grep -v "//.*odds\|comment" | head -20

# Check Feature Registry
grep -n "adapter-proof-odds\|odds-api" index.html | head -5

# SW_VERSION baseline
grep -n "const SW_VERSION" index.html
grep -n "const SW_VERSION" sw.js

# Smoke baseline
node smoke.js index.html 2>&1 | tail -3
```

**Read probe output before writing any assertions.
Assertions must check strings that actually appear in index.html.**

---

## SMOKE ASSERTIONS

Add after AVV-KALI assertions in smoke.js:

```javascript
// ── Odds API Adapter Visible Value Proof (AVV-ODDS — 2026-06-29) ────────────

assert('AVV-ODDS-001 — docs/adapter-proof.manifest.json contains odds-api entry',
  require('fs').existsSync('./docs/adapter-proof.manifest.json') &&
  require('fs').readFileSync('./docs/adapter-proof.manifest.json', 'utf8').includes('odds-api'),
  'Odds API must have an entry in adapter-proof.manifest.json');

assert('AVV-ODDS-002 — ODDS_SPORT_KEYS or odds sport key map exists in client',
  html.includes('ODDS_SPORT_KEYS') || html.includes('baseball_mlb') || html.includes('soccer_fifa_world_cup'),
  'Odds sport key map must be referenced — routes MLB and WC26 odds to correct API sport key');

assert('AVV-ODDS-003 — extractOddsForGame function defined',
  html.includes('extractOddsForGame') || html.includes('moneyline') && html.includes('bookmakers'),
  'extractOddsForGame must exist — normalizes raw bookmaker response to {moneyline, spread, total}');

assert('AVV-ODDS-004 — opening_odds + closing_odds architecture referenced',
  html.includes('opening_odds') || html.includes('openingWP') || html.includes('wpDelta'),
  'Odds archive schema (opening_odds or derivative WP fields) must be present in client');

assert('AVV-ODDS-005 — buildOddsStoryContext or [ODDS STORY] journalism path referenced',
  html.includes('ODDS STORY') || html.includes('oddsStory') || html.includes('buildOddsStory'),
  '[ODDS STORY] journalism context must be referenced — fires when opening + closing odds exist in D1');

assert('AVV-ODDS-006 — Odds source registry entry exists',
  require('fs').existsSync('./docs/source-registry.json') &&
  require('fs').readFileSync('./docs/source-registry.json', 'utf8').includes('odds-api-the-odds-api'),
  'Odds source registry entry required — includes all sport keys and credit cost');

assert('AVV-ODDS-007 — adapter-fixtures-odds-story-wnba.json exists with expected[ODDS STORY] output',
  require('fs').existsSync('./docs/adapter-fixtures-odds-story-wnba.json') &&
  require('fs').readFileSync('./docs/adapter-fixtures-odds-story-wnba.json', 'utf8').includes('[ODDS STORY]'),
  'WNBA odds-story fixture must exist with real opening + closing odds and expected output');

assert("AVV-ODDS-008 — 'adapter-proof-odds-api' in Feature Registry",
  html.includes("'adapter-proof-odds-api'"),
  'Feature Registry must contain adapter-proof-odds-api entry');
```

---

## IMPORTANT — if probe shows strings absent

AVV-ODDS-003 and 005 are most likely to need adjustment. The client
`index.html` may not reference `extractOddsForGame` or `[ODDS STORY]`
by name — these live in relay source.

If that's the case:
- AVV-ODDS-003: rewrite to check `openingWP` or `wpDelta` (odds-derived fields proven present on MLB game objects)
- AVV-ODDS-005: rewrite to check relay integration string that IS in index.html

Same probe-first rule as Kali. Never assert against absent strings.

---

## FEATURE REGISTRY + SW_VERSION

Add to Feature Registry in index.html:
```javascript
'adapter-proof-odds-api':          '2026-06-29',
```

Bump SW_VERSION in BOTH index.html and sw.js:
```bash
grep -n "const SW_VERSION" index.html  # read current
# bump patch letter: 2026-06-29d → 2026-06-29e
```

---

## COMMIT

```bash
git add smoke.js index.html sw.js
git commit -m "feat(odds): adapter proof Phase 2 — AVV-ODDS-001-008 + Feature Registry"
git push origin main  # 2 attempts max
```

---

## OUTBOX MANIFEST

| Item | Status |
|------|--------|
| Run probe block | ⏳ |
| Rewrite any assertions if strings absent | ⏳ |
| Add 8 AVV-ODDS assertions to smoke.js | ⏳ |
| Add Feature Registry entry to index.html | ⏳ |
| Bump SW_VERSION in index.html + sw.js | ⏳ |
| node smoke.js exits 0, +8 assertions green | ⏳ |
| Commit + push (2 attempts max) | ⏳ |

---

## CONFIDENCE SCORING

| Factor | Points | Check |
|--------|--------|-------|
| All 8 AVV-ODDS assertions green | 40 | grep AVV-ODDS in output |
| No assertions against absent strings (probe ran first) | 25 | probe block output reviewed |
| Feature Registry entry present | 20 | grep confirms |
| Smoke count increased by 8 | 15 | Results line shows +8 |

Score < 95: do not push. Fix assertions from probe output first.

---

**Session: 2026-06-29 · CLIENT ONLY · 15 min · Confidence gate: 95**
