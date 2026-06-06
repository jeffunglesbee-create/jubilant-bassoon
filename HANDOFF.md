# FIELD HANDOFF — 2026-06-06 (Session END — PM-31 Score Hardening + Scout's Pick)

## State
jubilant-bassoon HEAD: 600c6c7 · Smoke: 511/0
field-relay-nba HEAD: 981d474

## Score Hardening — Commits Shipped This Session

### Tier 1 recalibration (4947808)
Gemini 3.1 Flash-Lite confirmed 4,000 RPM / 4M TPM (screenshot from AI Studio). _jqDelay 2000→200ms, QUEUE_INTERVAL 3000→500ms, budgets 12→50/15→50. Night Owl multi-game: re-fires for better-drama game when second Finals ends (10+ peak delta). Cost: ~$0.013/session, ~$0.40/month.

### stale eData.state=post on pre-game cards (4a42a9e)
computeCardStage: don't trust eData.state='post' for games starting within 30min. Stale espnScores match from previous game with same teams was classifying today's pre-game as 'final' (showing · 52 drama peak).

### stale-final guard + score display fix (7062a22)
V2 stale-final guard compared gameUtcDate only against utcDate. 7pm ET games (23:xx UTC) finish after midnight UTC — guard dropped them as "yesterday." Fix: allow finals matching etDate OR utcDate. Also: 'final' stage now shows actual score ("Orioles 13–3 Blue Jays F · 52") not just drama peak.

### hydrateEspnScoresFromFinals (be89224)
Novel approach: treat localStorage tonight-finals as authoritative for completed games. V2 reliably returns null scores for finished games — route around it rather than fix V2. Runs after renderAll() and at end of each V2 poll cycle. Writes to espnScores only when entry missing or shows 0-0 on a final.

### buildSafeScoreWrap (c86da0f)
4-layer defensive score display replacing single-path scoreHTML in renderESPNScores:
- Layer 1: computeGameNarrative with score as-is
- Layer 2: force state='in' retry when Layer 1 returns empty (api-sports state:'pre' for live game)
- Layer 3: read from loadTonightFinals() localStorage
- Layer 4: raw homeScore/awayScore numbers — never blank for live/final

### .game-time updated every poll cycle (573b5cf)
buildCardTimeDisplay baked at renderAll() time with null eData (V2 not polled yet). renderESPNScores now updates .game-time on every poll cycle via buildCardTimeDisplay(isLive||isFinal, score, existingText) + live-t class toggle.

### pre-overwrite guard (b148e59)
ROOT CAUSE of 0-0 on ALL live MLB games tonight: V2 returns both today's finished game AND tomorrow's scheduled game for same teams in same response. forEach processed pre-game (null scores) AFTER final (real scores), clobbering it. Fix: if v2Entry.state==='pre' && prev.state in ['in','post'] → skip write entirely.

### buildScoreNarrativeContext floor fix (7c53ee1)
"Led by as many as 4" for 13-3 game. Score snapshot log corrupted by score outage showed artificially low maxLead. Fix: use finalMargin = |finalH - finalA| as floor for winnerMaxLead. 13-3 = margin 10 overrides snapshot max of 4.

---

## Scout's Pick Journalism — Commits Shipped

### 3 missing surfaces wired (685c923)
- buildWatchWindowReason: '🔍 Scout's Pick' chip when isScoutsPick and no series record
- buildDramaLineTiers pre fallback: pick label when no series/narrative/matchupNote
- buildRightNowTiers: teal '🔍 Scout's Pick' chip in row 2 for pre-game non-series cards

### Scout's Pick brief + Night Owl verdict (600c6c7)
**Part 1 — Brief:** [SCOUT'S PICK — under-the-radar game worth flagging] tag added to regularSection game lines in compound prompt. Gemini now writes "hidden gem" angle brief for picks. Rule: "write with hidden-gem angle, never echo tag verbatim."

**Part 2 — Postgame verdict:** Designation persisted to localStorage at injectDramaBadges time:
- Key: field_scout_pick_{game._id}
- Value: {home, away, signal: 'series'|'playoff'|'milestone', t: timestamp}
- Written once (first badge injection only) — isScoutsPick() may not match at game-end if V2 state changes
Night Owl reads this at game-end, injects [SCOUT'S PICK PREDICTION] context into prompt, adds rule: "End with one sentence grading delivery — 'Delivered' or 'Fell short'."

---

## V2 Architecture — Final State

```
etDate = new Date(_now - 4*3600*1000).toISOString().slice(0,10)
utcDate = new Date().toISOString().slice(0,10)
datesToQuery = utcDate===etDate ? [utcDate] : [etDate, utcDate]

Stale-final guard: if fg.state==='final' && gameUtcDate!==date && gameUtcDate!==etDate → skip
Pre-overwrite guard: if v2Entry.state==='pre' && prev && prev.state in ['in','post'] → skip

Score chain: V2 poll → hydrateEspnScoresFromFinals → renderESPNScores → buildSafeScoreWrap (4 layers) + .game-time update
```

---

## Open Items / Priority Queue
1. P0: Finals prompts not incorporating narrative context — R2 Finals Narrative Context Phase 1 unresolved
2. P0: Scoreboard not working (first exposed NBA Finals G1) — score display much improved but full scoreboard verification needed
3. JQ Gate brand-safe fallback (~60 lines)
4. Drama Dial header chip (~20 lines)
5. Arc Poster SVG (~200 lines)
6. State Transition PerformanceObserver (~30 lines)
7. WC 2026 opens June 11 — auto-activation in place, no deploy needed

## Key Refs
jubilant-bassoon HEAD: 600c6c7
field-relay-nba HEAD: 981d474
Smoke: 511/0 · Unit: 66/0
Drive Part 1: 1XKT-6RB2ktFkGsgr-r-AqLoO6XOl0c59
