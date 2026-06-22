CC-CMD-2026-06-22-newspaper-client — Manifest

DATE: 2026-06-21 (ET — see SW divergence note below)
HEAD (pre-commit): f01e24d
PROMPT: docs/CC-CMD-2026-06-22-newspaper-client.md

================================================================
SCOPE & STATUS
================================================================

All seven tasks implemented in the client repo (jubilant-bassoon).
Single commit covers the bundle. Smoke 720→725/0 (A704 HANDOFF
format remains as the only pre-existing red and is out of scope).

  Task 1 — CSS                        SHIPPED
  Task 2 — fetchNewspaper              SHIPPED
  Task 3 — getWhatYouMissed            SHIPPED
  Task 4 — renderNewspaper             SHIPPED
  Task 5 — Boot wire                   SHIPPED
  Task 6 — FIELD's Pick badge          SHIPPED
  Task 7 — Smoke assertions A692-A696  SHIPPED

================================================================
PRE-FLIGHT — RELAY ENDPOINT VERIFICATION
================================================================

The prompt asked for:
  curl https://field-relay-nba.jeffunglesbee.workers.dev/analytics/newspaper/2026-06-22
  If it 404s, STOP.

The sandbox network policy blocks direct egress to
field-relay-nba.jeffunglesbee.workers.dev so the curl returns
"Host not in allowlist". This is the same constraint hit by every
recent CC session (golf-contract-probe, wc-situation-probe,
context-assembler).

DECISION: PROCEED with the client implementation. Justification:
  1. fetchNewspaper handles every failure mode (404, timeout,
     parse error, !data.ok) by returning null.
  2. renderNewspaper(null) is a documented no-op.
  3. The client therefore degrades cleanly to "today's schedule
     renders, no newspaper" — identical to the pre-implementation
     state — until the relay is verified up.
  4. Implementing the client now keeps the deploy lockstepped with
     the relay's deploy window; verification can happen post-deploy
     by visiting the live site and watching for the np-inner panel.

CARRY-FORWARD: First chat session with relay access should fire
  curl https://field-relay-nba.jeffunglesbee.workers.dev/analytics/newspaper/2026-06-21
  | node -e 'console.assert(JSON.parse(...).ok)'
and confirm the bundle shape matches the spec.

================================================================
SW DIVERGENCE FROM PROMPT
================================================================

The prompt specified `SW_VERSION = '2026-06-22a'`. ET date during
this session is 2026-06-21 (verified `TZ='America/New_York' date`).
Bumping to a future date would fail smoke assertion A515
("SW_VERSION must start with today's ET date") which is non-bypass
per Rule 4. Per Rule 66 (smoke must pass before push), the SW was
bumped to `2026-06-21b` — same-day next-letter from the prior
`2026-06-21a` shipped earlier in the day.

If a chat session ships another iteration of this work on the actual
2026-06-22 ET date, that session should bump the prefix to
`2026-06-22a` per the original prompt's intent.

================================================================
TASK DETAIL
================================================================

TASK 1 — CSS
  Inserted between `/* ── MAIN ── */` (.main rule) and the SPORT
  SECTION block in the <style> tag (lines ~446-516 of index.html).
  All 11 viewport breakpoints from the spec are present:
    base, <=600, <=375, 601-819, landscape <=819, 820-1199,
    820-1199 portrait, 1200-1439, 1440-1799, >=1800, body.wf-mode
  Pick badge styles (.field-pick-badge) also in the block.

TASK 2 — fetchNewspaper(date)
  Top-level async function (NOT nested — first draft accidentally
  put it inside fetchSchedule; that was caught before commit and
  the functions were moved above fetchSchedule). 5s AbortSignal,
  null return on every failure mode.

TASK 3 — getWhatYouMissed(completedGames)
  Top-level. Returns [] for: null/empty input, no field_last_visit
  (first visit), same-day visit, >24h stale visit. Otherwise filters
  on g.margin<=1 || g.wasUpset || g.isSeriesClinch || g.isElimination
  and caps at 5. wentToOT intentionally not used — per the spec, it's
  not stored in D1 archive.

  Sanity-checked in Node across 6 cases. All correct.

TASK 4 — renderNewspaper(bundle)
  Top-level. Builds up to 7 sections in order:
    1. Since You Were Last Here  (catch-up via getWhatYouMissed)
    2. Night Stars              (★ glyphs + label)
    3. Morning Report           (np-prose)
    4. Truth Is                 (np-prose)
    5. Tonight's Pick           (italic np-prose; honors pass type)
    6. Tonight                  (preview np-prose)
    7. Streak Board             (hot/cold chips)
  Plus optional freshness timestamp + TODAY'S SCHEDULE divider.
  Empty-parts → silent no-op (no DOM artifact).
  main.prepend places the newspaper above all schedule sections.
  Calls applyFieldPickBadge() after paint in case cards already exist.

TASK 5 — Boot wiring
  Inserted as an IIFE at the bottom of <script>, positioned BEFORE
  the existing `restoreSnapshot().finally(fetchSchedule)` kick. ET
  date computed via toLocaleDateString('en-CA', {timeZone}); passed
  as `today` to fetchNewspaper. Newspaper paints first; schedule
  renders independently below.

TASK 6 — FIELD's Pick badge
  applyFieldPickBadge() at module scope. Idempotent — removes any
  prior .field-pick-badge before re-applying. Card lookup tries
  three selectors in order: [data-game-id], [data-gameid],
  [data-espn-id]. Wired into the very end of renderAll() so the
  badge follows the card through every re-render.

  String escaped via `String(pickId).replace(/"/g, '')` so a hostile
  bundle can't break out of the attribute-equals selector.

TASK 7 — Smoke A692-A696
  Converted from the prompt's runtime-style assertions
  (`smoke.assert(typeof fn === 'function', ...)`) to the existing
  codebase's source-regex pattern (assert(label, condition, detail)
  against the html string). This matches smoke.js's actual API.

  Each assertion runs and passes. Smoke total: 720 → 725 / 0
  (A704 HANDOFF format pre-existing, unrelated).

================================================================
SCOPE BOUNDARY COMPLIANCE
================================================================

DO NOT list (all respected):
  ✅ Journalism tab / journalism-mode — untouched
  ✅ buildTodaySchedule internals — untouched
  ✅ Circadian mode — not added
  ✅ field-relay-nba — not touched
  ✅ New localStorage keys — none added (only the existing
     field_last_visit key is read)

================================================================
COMMIT
================================================================

Single commit: "feat: O(1) Newspaper client — fetch + render bundle
above schedule with What Changed, Night Stars, Morning Report,
FIELD's Pick badge"

Files:
  index.html                (CSS + 4 fns + boot wire + renderAll hook + SW)
  sw.js                     (SW bump)
  smoke.js                  (A692-A696)
  outbox/cc-newspaper-client-2026-06-22.md (this manifest)

SW: 2026-06-21a → 2026-06-21b  (see divergence note above)
Smoke: 720/1 (A704) → 725/1 (A704)
