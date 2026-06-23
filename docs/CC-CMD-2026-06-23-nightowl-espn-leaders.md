# CC-CMD — ESPN Summary leaders in Night Owl cold-cache path

**Repo:** jubilant-bassoon
**Date:** 2026-06-23
**Scope:** Single insertion in fetchNightOwlFromClaude (index.html)

---

## BACKGROUND (verified from source — Rule 68 + 88)

**Root cause of night_owl 150-156/245:** `_owlStatCtx` building relies on
in-memory caches (`_mlbBoxscoreCache`, `_bdlSeasonAvgByTeam`, etc.) that
are cold when the user opens Night Owl after a game ended. Cold cache =
`_owlStatCtx` empty = prompt has no player names or stats = brief hits the
fallback "No box stats available — write from score and margin only." branch.

**No player names → Dim 1 Specificity drops. No stats → Dim 2 StatDepth
drops. Both together → score floor around 120-140.**

**The fix:** When `_owlStatCtx` doesn't already contain player-specific data,
fetch ESPN Summary from the relay before calling Claude. The relay route
`/espn-summary/sports/{slug}/summary?event={id}` is live, proxies to
`site.web.api.espn.com`, returns `leaders[]` with top performers per category.

**Verified facts:**
- `fetchNightOwlFromClaude` is at L36098 in index.html
- `topGame.sourceId` is the ESPN event ID (used at L36174 for MLB box cache)
- `topGame.espnEventId` is also available (used in email script)
- Insertion point: between L36413 (end of stat-of-day try block) and L36418
  (`let _owlScoutPickCtx = ''`)
- Exact anchor for insertion: the line `} catch(e_) {}` that closes the
  stat-of-day try block at L36414, followed by blank line at L36415
- ESPN relay route already allowed by `espnSummaryAllowed` (L557-559):
  regex `/^\/sports\/[a-z]+\/[a-z]+\/summary$/.test(path.split('?')[0])`
- Relay base: `https://field-relay-nba.jeffunglesbee.workers.dev`
- `JOURNALISM_RESULT_RELAY` constant or `field-relay-nba.jeffunglesbee.workers.dev`
  directly — confirm from probe which constant is used in this function

---

## PRE-BUILD PROBES (Rule 68)

```bash
# 1. Confirm insertion point — read L36408-36422
sed -n '36408,36422p' index.html

# 2. Confirm topGame.sourceId usage
grep -n "topGame.sourceId\|topGame.espnEventId" index.html | head -10

# 3. Confirm relay base URL constant used in fetchNightOwlFromClaude
# Look for fetch() calls to the relay within this function
sed -n '36098,36560p' index.html | grep "field-relay-nba\|JOURNALISM_RESULT_RELAY\|RELAY_BASE" | head -10

# 4. Confirm espnSummaryAllowed regex covers the slugs we'll use
grep -n "espnSummaryAllowed\|sports.*summary" src/index.js 2>/dev/null || \
grep -n "espnSummaryAllowed\|sports.*summary" index.html | head -5
# (espnSummaryAllowed is in relay src/index.js — pattern: /^\/sports\/[a-z]+\/[a-z]+\/summary$/)
# Our slugs: baseball/mlb, basketball/nba, basketball/wnba, hockey/nhl, soccer/fifa.world
# All match the pattern — no relay code change needed.

# 5. Confirm _owlStatCtx detection strings (what's already in the string when hot)
grep -n "_owlStatCtx.includes\|\[MLB BOX\]\|\[PPG LEADERS\]\|\[NHL LIVE\]" index.html | head -10

# 6. Run smoke before any change
node smoke.js 2>&1 | tail -5
```

Write probe output to `outbox/cc-nightowl-espn-leaders-2026-06-23.md`.

---

## TASK 1 — Insert ESPN Summary fetch in fetchNightOwlFromClaude

Find the exact insertion point from probe #1 (L36414-36416 area). Insert
after the closing `} catch(e_) {}` of the stat-of-day try block and before
`// Scout's Pick: check if this game...`.

**Insert this block:**

```javascript
  // ── ESPN Summary leaders — cold-cache fallback ────────────────────────────
  // When in-memory caches are cold (user opens Night Owl post-game), _owlStatCtx
  // lacks player names and stats. Fetch ESPN Summary from relay to inject leaders.
  // Only fires when stat context is missing player-specific data. Fail-silent.
  try {
    const _espnId = topGame.sourceId || topGame.espnEventId;
    const _hasSportStats = _owlStatCtx && (
      _owlStatCtx.includes('[MLB BOX]') ||
      _owlStatCtx.includes('[PPG LEADERS]') ||
      _owlStatCtx.includes('[NHL LIVE]') ||
      _owlStatCtx.includes('[GOAL TIMELINE]') ||
      _owlStatCtx.includes('[NBA BOX]')
    );
    if (_espnId && !_hasSportStats) {
      const _sumSlug = _sp.includes('baseball') || _sp.includes('mlb')
        ? 'baseball/mlb'
        : _sp.includes('wnba')
        ? 'basketball/wnba'
        : _sp.includes('basketball') || _sp.includes('nba')
        ? 'basketball/nba'
        : _sp.includes('hockey') || _sp.includes('nhl')
        ? 'hockey/nhl'
        : (_sp.includes('soccer') || _sp.includes('world cup') ||
           _sp.includes('wc26') || _sp.includes('fifa'))
        ? 'soccer/fifa.world'
        : null;
      if (_sumSlug) {
        const _sumRes = await fetch(
          `https://field-relay-nba.jeffunglesbee.workers.dev/espn-summary/sports/${_sumSlug}/summary?event=${encodeURIComponent(String(_espnId))}`,
          { signal: AbortSignal.timeout(4000) }
        );
        if (_sumRes.ok) {
          const _sumData = await _sumRes.json();
          const _leaders = _sumData.leaders || [];
          const _leaderLines = [];
          for (const cat of _leaders.slice(0, 5)) {
            const ls = Array.isArray(cat.leaders)
              ? cat.leaders
              : (cat.leaders?.leaders || []);
            const top = ls[0];
            if (top?.athlete?.displayName && top.displayValue) {
              _leaderLines.push(`${cat.displayName}: ${top.athlete.displayName} ${top.displayValue}`);
            }
          }
          if (_leaderLines.length) {
            _owlStatCtx += (_owlStatCtx ? '\n' : '') +
              '  [ESPN LEADERS] ' + _leaderLines.join(' · ');
          }
        }
      }
    }
  } catch(_) {}

```

**Exact anchor:** Insert between `} catch(e_) {}` (stat-of-day close) and
`// Scout's Pick: check if this game was pre-designated as under-the-radar.`

Use `str_replace` with a unique enough surrounding context from probe #1
output to avoid a false match. The anchor text is distinctive — do NOT guess
the surrounding lines, read them from probe #1 output first.

---

## TASK 2 — Smoke

```bash
node smoke.js 2>&1 | tail -5
# Must pass before push
```

No new smoke assertions needed — this is a runtime behavior change with no
new DOM elements or URLs. Existing smoke covers the archive/brief endpoint.

---

## TASK 3 — Deploy and verify

```bash
# After deploy — check /quality/report for night_owl improvement
# (may need to wait for overnight briefs to accumulate — note baseline)
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/quality/report" \
  | node -e '
    const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8"));
    d.summary.filter(r=>r.brief_type==="night_owl")
      .forEach(r=>console.log("night_owl",r.sport,"avg:",r.avg_score,
        "failure_pct:", Math.round((r.below_150/r.scored)*100)+"%"));
  '

# Baselines to beat:
# night_owl Baseball (MLB): avg 150, failure 40%
# night_owl MLB: avg 156, failure 41%
# night_owl FIFA World Cup 2026: avg 154.5, failure 38%
```

**Done condition:** Code deploys (smoke green, CI green). Quality improvement
visible on next day's night_owl briefs — cannot verify same session since
existing archived rows are already scored. Confirm deploy success and note
baseline for next-day comparison.

---

## TASK 4 — Write outbox manifest

Write `outbox/cc-nightowl-espn-leaders-2026-06-23.md`:
- Commit hash + deploy run ID
- Smoke pass count
- Probe #1 output (exact insertion lines confirmed)
- Probe #3 output (relay URL constant confirmed)
- Baseline quality scores at time of deploy
- Note: improvement visible in next-day /quality/report

---

## SCOPE (Rule 69 — TOUCH-ONLY-A)

DO:
- Insert ESPN Summary fetch block in `fetchNightOwlFromClaude` (index.html)
- Single commit

DO NOT:
- Modify any other function in index.html
- Modify the relay (espn-summary route already live)
- Change the quality chain or scoring logic
- Touch field-relay-nba

---

## WHY THIS IS THE CORRECT ROUTE (Rule 88)

The shortcut would be lowering the failure_rate threshold so night_owl alerts
stop firing. The correct route is fixing the cold-cache gap that causes low
scores. ESPN Summary is already live on the relay, topGame.sourceId already
exists, the insertion point is one try/catch block. The correct route is
also the fast route here — 15 lines of code at a known line number.
