# CC-CMD-2026-06-23-nightowl-espn-leaders — Manifest

DATE   : 2026-06-23
PROMPT : docs/CC-CMD-2026-06-23-nightowl-espn-leaders.md
REPO   : jubilant-bassoon (sole)
HEAD pre: adba909 → (this commit)
SW     : 2026-06-23a → 2026-06-23b

================================================================
SCOPE & STATUS
================================================================

  Task 1 — ESPN Summary cold-cache block in fetchNightOwlFromClaude  SHIPPED
  Task 2 — Smoke gate (no new assertions per prompt)                  PASSED
  Task 3 — Deploy + /quality/report verification                      STAGED
  Task 4 — This manifest                                              SHIPPED

================================================================
PRE-BUILD PROBES
================================================================

PROBE 1 — Insertion anchor (sed -n '36408,36422p' index.html)
  L36408-36414: `try { _owlSd = getStatOfDay(...) ... } catch(e_) {}`
  L36415:      blank line
  L36416-36417: `// Scout's Pick: check if this game ... (Item 2: read enriched payload...)`
  L36418:      `let _owlScoutPickCtx = '';`
  → Anchor confirmed. Inserted between L36414 close-brace and L36416 comment.

PROBE 2 — topGame.sourceId / topGame.espnEventId in index.html
  L36174: `if((_sp.includes('mlb')||_sp.includes('baseball')) && topGame.sourceId) {`
  L36175: `const _boxCached = _mlbBoxscoreCache['mlb_box_'+topGame.sourceId];`
  → `sourceId` is the authoritative ESPN event ID on topGame. `espnEventId`
    is referenced only in scripts/night-owl-email.js (CI surface).
  → Insertion correctly reads `topGame.sourceId || topGame.espnEventId`.

PROBE 3 — relay base constant inside fetchNightOwlFromClaude (36098-36560)
  No `JOURNALISM_RESULT_RELAY` / `RELAY_BASE` / direct `field-relay-nba`
  occurrences in this function range. Other parts of the codebase resolve
  the relay base inline; using the hardcoded
  `https://field-relay-nba.jeffunglesbee.workers.dev` (as the prompt
  specifies) matches the established idiom for one-off probes.

PROBE 4 — espnSummaryAllowed regex
  Defined in relay src/index.js (separate repo). Pattern (from prompt):
  `/^\/sports\/[a-z]+\/[a-z]+\/summary$/`.
  Slugs used by the inserted block: baseball/mlb, basketball/nba,
  basketball/wnba, hockey/nhl, soccer/fifa.world. All match — no relay
  change required.

PROBE 5 — _owlStatCtx hot-cache marker strings
  Verified in index.html:
    L25590 `[NHL LIVE]`     (renderESPNScores per-card injection)
    L25592 `[MLB BOX]`      (renderESPNScores per-card injection)
    L25600 `[PPG LEADERS]`  (renderESPNScores per-card injection)
    L34479 `[GOAL TIMELINE]` (buildGoalTimeline → journalism)
    L5444  `[NBA BOX]` registered in inventory map; emitted by
           buildNBAPlayerContext
  All five marker strings are real. Hot-cache detection in the inserted
  block guards correctly — when any of these is present, ESPN Summary
  is skipped.

PROBE 6 — Smoke baseline
  cmd: node smoke.js index.html
  Result: 726 passed, 0 failed.

================================================================
TASK 1 — IMPLEMENTATION DETAIL
================================================================

Inserted between L36414 (end of stat-of-day try block) and the Scout's
Pick comment. ~50 lines wrapped in a single `try { ... } catch(_) {}`
that fail-silents on any error path:

  • Gate 1 — _espnId must exist (topGame.sourceId fallback to .espnEventId).
  • Gate 2 — _hasSportStats must be false (any of the five marker
    strings means in-memory cache is hot; skip ESPN to avoid duplicate
    or stale data overwriting fresh hot context).
  • Slug resolution — _sp string match for baseball/mlb, wnba, nba,
    hockey/nhl, soccer-family. Returns null for unsupported sports
    (Olympics, UFC, etc.) and the block exits without a fetch.
  • Fetch — relay /espn-summary/sports/{slug}/summary?event={id} with
    4s AbortSignal.timeout, encodeURIComponent on the id.
  • Parse — top 5 leader categories; first leader per category;
    only emit when athlete.displayName + displayValue both present.
  • Emit — single line appended to _owlStatCtx as
    "[ESPN LEADERS] {cat1}: {name} {val} · {cat2}: ..."
    so the prompt builder picks it up as another tagged context line.

Format mirrors existing tagged lines like [PPG LEADERS] (L25600) so
the journalism prompt template treats it identically.

================================================================
TASK 2 — SMOKE
================================================================

cmd: node smoke.js index.html
Result: 726 passed, 0 failed   (same as baseline — no regression)

No new smoke assertions needed (prompt explicitly states this — runtime
behavior change with no new DOM elements or URLs; existing assertions
cover the archive/brief endpoint and the ESPN allow-list).

SW_VERSION bumped index.html + sw.js: 2026-06-23a → 2026-06-23b
(Rule 4 — files must match; deploy gate verifies on push).

================================================================
TASK 3 — DEPLOY / QUALITY (STAGED)
================================================================

Sandbox cannot reach field-relay-nba.jeffunglesbee.workers.dev to hit
/quality/report. Verification path post-deploy:

  curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/quality/report" \
    | node -e '
      const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8"));
      d.summary.filter(r=>r.brief_type==="night_owl")
        .forEach(r=>console.log("night_owl", r.sport, "avg:", r.avg_score,
          "failure_pct:", Math.round((r.below_150/r.scored)*100)+"%"));
    '

Baselines to beat (from prompt):
  night_owl Baseball (MLB) : avg 150,   failure 40%
  night_owl MLB            : avg 156,   failure 41%
  night_owl FIFA WC 2026   : avg 154.5, failure 38%

Improvement signal is night-by-night since existing archived rows are
already scored. Compare next-day report; flag any sport whose avg stays
within ±2 of baseline (no improvement) as a follow-up candidate.

================================================================
SCOPE BOUNDARY COMPLIANCE
================================================================

DO list (all done):
  ✅ Insert ESPN Summary fetch in fetchNightOwlFromClaude (index.html)
  ✅ Single commit (this one)
  ✅ Bump SW_VERSION in sync (index.html + sw.js)
  ✅ Write outbox manifest

DO NOT list (all respected):
  ✅ No other function in index.html modified (verified via diff scope)
  ✅ Relay not touched (espn-summary route already live, no change needed)
  ✅ Quality chain / scoring logic untouched
  ✅ field-relay-nba untouched

================================================================
COMMIT
================================================================

Single commit:
  "feat: Night Owl ESPN Summary cold-cache fallback in fetchNightOwlFromClaude"

Files:
  index.html        (insert + SW_VERSION bump)
  sw.js             (SW_VERSION bump in sync)
  outbox/cc-nightowl-espn-leaders-2026-06-23.md  (this manifest)
