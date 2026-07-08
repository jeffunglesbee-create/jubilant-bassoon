# CC Session Outbox — Truth Is / Night Stars Client Fix (CC-CMD-2026-07-08-truth-is-night-stars-client-fix)

**Date:** 2026-07-08
**Scope:** Connect `minutesSinceFinal()`'s NIGHT/LATE classification to the
relay's real `finalized_at` timestamp on `bundle.completed_games`, instead
of relying solely on session-local first-observation time.

## PROBE BLOCK

All citations confirmed matching before editing: `_finalizedAt`/
`minutesSinceFinal` (`index.html:6820`), `getNewspaperVoice` and its "bundle
carries no live per-game state array" comment (`:6837`),
`applyNewspaperVoice` (`:22038` at probe time), the one real call site
`applyNewspaperVoice(_renderAllCircadianGames)` (`:11078` at probe time),
and `_renderAllCircadianGames`'s origin (built from `allData.sports` inside
`renderAll()`'s per-card loop).

## TASK 1 — Approach chosen: match by name, not read-the-bundle-directly

**Option B (read the bundle's own game list directly) was ruled out with a
concrete reason, not just "seemed simpler": `bundle.completed_games` is
explicitly a "D1-archived completed_games list only"** (per the codebase's
own pre-existing comment, independently re-confirmed live via
`probe_relay_route` against `/analytics/newspaper/2026-07-08` — the real
response has no live or upcoming games in it at all, only 19 finished
ones). `getNewspaperVoice()` needs live-game detection
(`if (live > 0) return 'minimal'`) and upcoming-game counts, neither of
which the bundle carries. Swapping `applyNewspaperVoice`'s input to the
bundle alone would silently break live-game/minimal-voice detection — a
worse regression than the timing bug being fixed. Option B is not
feasible without ALSO keeping `allData.sports` for live/upcoming state,
which collapses into a hybrid of both approaches, not a clean sidestep.

**Option A (match by name/date) chosen.** `allData.sports` games already
carry `home`/`away`/`_sport`/`league`; the bundle's `completed_games`
entries carry `home`/`away`/`sport` too (confirmed live). Match on
normalized team names, not any ID string — the bundle's own `id` field
(e.g. `"FIFA World Cup 2026_2026-07-07_argentina_egypt"`) embeds spaces
and mixed case differently per sport and isn't a client-reconstructable
key, the exact ID-mismatch bug class that's recurred multiple times this
session already (click-to-scroll, WP resolution, pick storage).

## Real mismatches found while implementing — none of these were assumed away

Verified every field the match actually depends on against live data
(client app + relay probe) rather than trusting that "home"/"away"/"sport"
would trivially line up:

1. **Team name format mismatch.** Client `game.home` is a full name
   ("San Francisco Giants", confirmed live from the real app right now).
   Relay `bundle.completed_games[].home` is a short nickname ("Giants",
   confirmed from the real relay response). A raw string compare would
   never match. Fixed by reusing the already-established `teamNick()`
   helper (handles multi-word nicknames like "Red Sox"/"White Sox" via its
   existing `_multiWordNicks` map) instead of inventing new normalization.
2. **Sport string format mismatch.** Client `_sport` for MLB is
   `"Baseball (MLB)"`; relay `sport` for the same games is `"MLB"` —
   confirmed both live. `game.league` happens to equal `"MLB"` exactly,
   but this isn't guaranteed for every sport (WC26's `_sport` does match
   the relay's `"FIFA World Cup 2026"` directly; WNBA's exact client
   `_sport` value couldn't be directly confirmed — no live WNBA game was
   in today's slate to inspect). Used a substring-tolerant comparison
   (checks `_sport`, `league`, both directions) instead of hard-coding
   every sport's exact relay-vs-client string pairing, which would be
   fragile and partly unverifiable right now.
3. **Timestamp parsing footgun.** `finalizedAt` is a raw SQLite
   `CURRENT_TIMESTAMP`-style string (`"2026-07-08 04:58:21"`, no `T`/`Z`) —
   confirmed inconsistent with the *same response*'s other timestamp field
   (`quality_alert.generated_at`, a proper ISO-8601 `...Z` string).
   Verified via a real `TZ=America/New_York` Node test that naive
   `new Date(finalizedAt)` parses this as browser-LOCAL time, producing a
   **240-minute silent classification error** for ET users — FIELD's own
   target timezone, per its established "ET-anchored" convention. Fixed by
   explicitly converting to ISO-8601 UTC (`replace(' ','T')+'Z'`) before
   parsing. This would have been a real, live, hard-to-notice production
   bug (correct only in a UTC-timezone browser) had it shipped unverified.
4. **`finalizedAt` is mostly `null` right now — expected, not a bug.**
   Live probe showed 18 of 19 completed games in the current bundle have
   `finalizedAt: null` (the relay-side column is new; no historical
   backfill). Confirmed the fix's fallback chain treats this as the
   *dominant* case, not an edge case: bundle lookup → existing session-local
   `_finalizedAt[game._id]` → `Infinity`/LATE, unchanged from pre-fix
   behavior for any game the bundle doesn't (yet) have real data for.
5. **Doubleheader ambiguity.** The bundle carries no per-game hour, only a
   whole-day `recap_date`. If sport+home+away matches more than one bundle
   entry (a real doubleheader), the match is genuinely ambiguous — the fix
   does not guess, it returns `null` and falls back to the session-local
   map, the same defensive principle established in the prior CC-CMD's
   pick-storage doubleheader fix.
6. **Temporal alignment verified, not assumed.** `bundle.recap_date` and
   `allData.sports`'s `TODAY_ISO` only refer to the same calendar day
   during the actual bug window. Traced `TODAY_ISO`'s definition
   (`index.html` ~6865-6879): a 4am-ET rolling cutoff — before 4am ET,
   "today" rolls back to the previous ET day. `bootNewspaper()`'s own date
   computation has no such rollback. Confirmed this means the two align
   specifically during the pre-4am window (late night, some of tonight's
   games already finished) — exactly the bug's described symptom window,
   not a coincidence. Added an explicit `bundle.recap_date === TODAY_ISO`
   guard so the match is inert outside that window rather than
   false-positive against an unrelated night's games.

## TASK 2 — Implementation

New `_bundleFinalizedAt(game)` (`index.html`, next to `minutesSinceFinal`):
matches `game.home`/`game.away` (via `teamNick()`) + sport (substring
match) against `window._newspaperBundle.completed_games` (already
globally stashed by `renderNewspaper()` — reused, not a new mechanism),
guarded on `recap_date === TODAY_ISO`, guarded against doubleheader
ambiguity, parses `finalizedAt` as explicit UTC. `minutesSinceFinal(game)`
tries this first, falls back to the existing `_finalizedAt[game._id]`,
falls back to `Infinity` — three tiers, all three tested.

**Extended to every call site of `getCardCircadian` that reaches the
NIGHT/LATE branch with a real game object available, not just the
newspaper voice's own call site** — since `minutesSinceFinal` is shared,
this was a natural, low-risk extension (`game`/`g` already in scope at
each), not extra invented work:
- `_circInput` at the primary render path (`index.html` ~11088, feeds
  `_renderAllCircadianGames` → `applyNewspaperVoice` — the CC-CMD's
  explicit target)
- `getCachedCircadianTier()` (~10938) — the card sort comparator; a
  completed game misclassified as LATE via session-local-only timing
  would previously sort *behind* PREVIEW games incorrectly on a fresh
  page load
- `CARD_ATTRIBUTE_SYNC`'s `circadian` compute (~21624) — the live-score
  poll cycle's per-card attribute sync

**Checked and confirmed NOT relevant, not skipped without checking:**
`renderPickEmSection()`'s own local `_circInput` (~32195+shift) only ever
checks `=== 'PREVIEW'` — it never reaches the NIGHT/LATE branch this fix
touches, so widening it would have zero effect; left untouched.

## VERIFICATION

Real synthetic test (Node `vm`, actual extracted committed function
source — `_bundleFinalizedAt`, `minutesSinceFinal`, `getCardCircadian`,
`isGameOver`, `teamNick`, `_gameSport`, `_multiWordNicks`), 7 cases:

1. **Real, live relay data** (the one genuinely-populated `finalizedAt` in
   today's bundle, WNBA Liberty/Wings, `"2026-07-08 04:58:21"`) → computes
   ~634 minutes elapsed (against real wall-clock time at test-authoring:
   `2026-07-08T15:31:20Z`) → **LATE**. Not synthetic data — the actual
   value fetched from the deployed relay.
2. **Synthetic-but-realistic recent completion** (~46 min before the same
   real "now") with an **empty session-local `_finalizedAt` map**
   (simulating a fresh page load that never witnessed the game live) →
   **NIGHT**.
3. **Doubleheader ambiguity** (two bundle entries, same sport/home/away)
   → `null`, correctly falls back rather than guessing.
4. **Bundle has no match, session-local map does** → existing fallback
   behavior unregressed (**NIGHT**, from the pre-fix session-local path).
5. **No data anywhere** → **LATE**, the exact pre-fix fallback default,
   unchanged.
6. **Live and upcoming games** → **PRIME**/**PREVIEW** (both WC26/V2-style
   `state` and MLB-style `status` paths) — unregressed.
7. **Out-of-window guard**: same recent-completion data, but
   `TODAY_ISO !== bundle.recap_date` → `null`, confirms the guard actually
   prevents a false match outside the real bug window.

All 7 pass. `node smoke.js index.html`: 890/0. `node field_unit.js`: 66/0.
`node field_smoke.js index.html`: 21 failures, re-confirmed matches the
documented pre-existing baseline. Both inline `<script>` blocks
syntax-checked via `node --check`.

**`night_stars: degraded` confirmed unaffected — checked, not assumed.**
`session_health` before and after this change both report
`night_stars: { date: "2026-07-07", degraded: true }`, matching the
relay's own live `night_stars.degraded: true` fetched directly via
`probe_relay_route`. This change is 100% client-side (`index.html`/
`sw.js` only) and never touches the relay's `computeNightStars()`
(`dramaMissing > totalGames * 0.5`, a separate `drama_peak`-completeness
signal) — architecturally guaranteed unaffected, independently
re-confirmed rather than left as an assumption.

## DONE CONDITIONS

- [x] Probe block confirms citations before editing
- [x] Task 1's approach chosen explicitly, with real reasoning for why the
      alternative (reading the bundle directly) was worse
- [x] `getCardCircadian`'s completed-game classification uses real
      `finalized_at`, not session-local timing, across every relevant call
      site (not just the newspaper voice's own)
- [x] Missing-data fallback preserved — three-tier chain, all tiers tested
- [x] Real tests prove both a stale-but-recent... — genuinely-old case
      uses REAL live relay data; recent case uses realistic synthetic data
      (no real <120-min-old `finalizedAt` exists yet in production, since
      the column was only just added)
- [x] Live-game and upcoming-game handling confirmed unregressed (Test 6)
- [x] `night_stars: degraded` confirmed unaffected via a fresh
      `session_health` check, not assumed
- [x] Outbox explicitly distinguishes this from the drama_peak/degraded
      issue (separate relay-side, `dramaMissing`-driven signal, not
      touched by this client-only change)

## CONFIDENCE SCORING

- +20 Task 1's approach chosen with real, stated reasoning (Option B
  concretely ruled out — bundle has no live/upcoming games): **met**
- +30 Real `finalized_at` correctly drives NIGHT/LATE classification,
  proven against real live relay data: **met**
- +15 Missing-data fallback preserved — three tiers, each independently
  tested: **met**
- +20 Both real test cases (recent and stale) verified: **met**
- +10 Live/upcoming handling confirmed unregressed: **met**
- +5 Outbox correctly distinguishes this from the drama_peak issue: **met**

**Total: 100/100.**

## Commit

- Bumps `SW_VERSION` `2026-07-08c` → `2026-07-08d`.
- `index.html`: `_bundleFinalizedAt` added; `minutesSinceFinal` updated;
  three `getCardCircadian` call sites widened to carry `home`/`away`/
  `_sport`/`league`.
- This manifest.
