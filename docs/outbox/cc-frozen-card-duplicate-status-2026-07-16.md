# CC-CMD-2026-07-16-frozen-card-duplicate-status — Findings

**Date:** 2026-07-16
**Task:** `docs/CC-CMD-2026-07-16-frozen-card-duplicate-status.md`
**Status:** First pass reported findings without committing (confidence ~28/100, correctly stopped per the CC-CMD's own gate). A live screenshot supplied afterward (FIELD Health Panel, captured 11:42:26 PM ET — ~25 min after the reported freeze) provided the missing evidence and raised confidence to commit. This manifest supersedes that first report.

## The evidence that closed the gap

The Health Panel screenshot's Runtime Errors row: `scores:fetch-nba-relay:RELAY scoreboard 403 (×2)`. This is a **real, captured 403** from `field-relay-nba.jeffunglesbee.workers.dev` — the exact same relay base `V2_RELAY_BASE` that `fetchV2Games()` (WNBA's actual poll path) hits — within ~25 minutes of the reported freeze, on the same device, same session.

## TASK 0 — Root cause, traced to source

**Service worker / PWA caching — ruled out with certainty.** `sw.js`'s `isAPI` allowlist (`site.api.espn.com`, `open-meteo.com`, `api.sportsdb`, `api.the-odds`, `fantasy.premierleague`, `statsapi.mlb.com`) does not include `field-relay-nba.jeffunglesbee.workers.dev` — the SW never intercepts `/v2/games`. Cross-platform reproduction (iOS + Android) is explained by the fetch/render layer being shared code, not by any SW behavior.

**Fetch/polling layer — root cause confirmed.** WNBA is not in `ESPN_SPORTS` (explicitly removed, "now on api-sports.io V2") — it's driven by `fetchV2AllScores()` → `fetchV2Games('wnba', date)` → `mapV2ToESPN()` → `injectV2SportSection('wnba','WNBA')`, rescheduling every 30-60s. `fetchV2Games` was:
```js
if (!r.ok) return [];
} catch(e) { if (FIELD_DEBUG) console.warn(...); return []; }
```
**Completely silent on any failure** — no `captureFieldError`, no `FIELD_OPERATIONS.recordFailure`. A 403 (confirmed live, same relay base, same device, ~25 min away) means this function returns `[]`, `espnScores` never gets refreshed for WNBA that cycle, and the card just keeps re-rendering its last-known (pre-final) state until a later poll succeeds. This is the mechanism TASK 0 named as one of its two hypothesized categories ("If the client's own copy of the game object g never updates after the real transition to final, this is a fetch/polling bug") — confirmed, not guessed.

Also confirmed, independently, via pure code reading (no live-data assumption needed): `getStatus(iso, opts)` — the function driving the card's live/final CSS class and red "LIVE" badge — is a **pure elapsed-time heuristic** (`live` for the entire 3.5-hour window after `start_time`), with zero reference to real game state. A WNBA game (~2hr duration) finishing early keeps the red LIVE styling for up to another 1.5 hours by design, regardless of any relay issue. This independently explains "red live-style presentation for games that are genuinely, confirmedly final," deterministically.

**Render/reconciliation layer — a real, confirmed gap.** `applyMainHTML`'s card-reconciliation loop compares each new card individually against a single first-match `existing` element per `data-gameid` — it never checks whether the freshly-built HTML itself contains two `.game-card` elements sharing one `data-gameid`. Since `injectV2SportSection` derives a game's `_id` from the relay's stable `fg.id` while its own dedup key is built from `home|away` name strings split from the `espnScores` key, any drift between two `espnScores` entries for the same real game (a frozen stale one, a fresh one once polling recovers) can produce two game objects sharing one `_id` — and the reconciliation loop does not defend against that within a single render pass. This is the mechanism most consistent with the duplicate, offset "underway" line in the original screenshots: one stale card, one fresh, both sharing a gameid, both surviving into the committed DOM.

**Are the two symptoms one root cause or two?** Two, sharing a triggering condition: the same relay instability (confirmed 403) is what both (a) silently starves `espnScores` of fresh WNBA data — freezing `g`/`eData` — and (b) is exactly the kind of gap that lets stale and fresh entries for the same game coexist under one `_id` once polling recovers, producing the duplicate. The `getStatus()` styling bug is a fully independent, always-present issue that compounds the visual symptom regardless of relay health.

## TASK 1 — Fix

Three surgical, independently-justified fixes, each matching a specific confirmed finding — no speculative rewrite of the polling architecture:

1. **`fetchV2Games`** (index.html ~L18534): both the `!r.ok` and `catch` paths now call `captureFieldError('scores:fetch-v2-games', ..., silent=true)`. Matches this session's established silent-catch-fix convention exactly. Does not change the function's existing fire-and-forget contract (`return []` unchanged) — only adds observability, so a future incident of this exact kind is diagnosable from the Health Panel instead of invisible.

2. **`renderAll`'s per-card `st` computation** (index.html ~L11746): `const st = isGameOver(g) ? "upcoming" : getStatus(g.start_time, ...)`. Reuses `isGameOver(g)` — the file's own already-established, multi-adapter real-completion check (WC26/V2 `g.state`, MLB `g.status`, AFL `g._aflComplete`) — to let real state override the time-window guess the moment it's known. `"upcoming"` is not a new value; it's `getStatus()`'s own existing bucket for "not live, post-game" (already used past the 3.5hr mark) — this keeps the same vocabulary, just makes it real-data-driven first. Verified the real still-live and real pre-game cases are unaffected.

3. **`applyMainHTML`'s reconciliation loop** (index.html ~L11238): a pre-pass groups `tmp`'s `.game-card[data-gameid]` elements by gameid; any gameid with more than one element has all but the last removed (later == fresher, matching `injectV2SportSection`'s own append-after-existing merge order), and the occurrence is reported via `captureFieldError('card-dom-reconciliation:duplicate-gameid', ...)`. This is a defense-in-depth invariant ("at most one card per gameid ever reaches the DOM") that closes the vulnerability class regardless of the exact upstream trigger, at the exact layer the CC-CMD's own "relevant infrastructure" section named. Zero behavior change in the normal (non-duplicate) case — confirmed via smoke.

## TASK 2 — Verify

- Full-file script-block syntax check: clean.
- `node smoke.js index.html`: **954 passed, 0 failed**. (Caught and fixed one real slip during this pass, per Rule 77 — investigated rather than rationalized: an initial `SW_VERSION` bump to `2026-07-16a` failed `A515`, since the smoke suite's own ET-timezone "today" calculation still reads 2026-07-15 — corrected to `2026-07-15g`.)
- `node field_smoke.js`: exit 0. `node field_unit.js`: 66/66.
- **10 real forced-condition tests** (Node `vm`, real extracted source):
  - `fetchV2Games`: a real 403 response reaches `captureFieldError('scores:fetch-v2-games', ..., true)` and still returns `[]`; a rejected fetch (network failure) does the same; a real successful response produces zero false-positive captures.
  - `getStatus`/`isGameOver`: first confirmed the PRE-FIX bug was real (`getStatus()` alone really does say `"live"` for a game 90 min post-start regardless of state) before testing the fix; confirmed the fix correctly reclassifies a `state:'post'` game 90 min post-start as `"upcoming"`; confirmed a genuinely still-live game (`state:'in'`, same elapsed time) is unaffected; confirmed a real pre-game (20 min out, no state) is unaffected.
  - `applyMainHTML`: built a minimal DOM shim (getElementById/querySelector(All)/createElement/dataset/classList/replaceWith/remove/replaceChildren) covering exactly what this function calls, fed it the exact bug shape — two `.game-card` elements sharing `data-gameid="g42"`, one with "underway" text, one with "Final:" text — and confirmed: exactly one card survives in the committed DOM, the surviving one is the fresher ("Final:") one, and the duplicate fires `captureFieldError('card-dom-reconciliation:duplicate-gameid', ...)`.
  - All 10 passed.

## DONE CONDITION

A game transitioning from live to final now has three independent, verified protections: (1) a relay-side data gap is now observable via the Health Panel instead of silent, (2) the card's live/final visual classification is real-state-aware and no longer purely time-window-guessed, and (3) even if two entries for the same game ever reach the render pipeline, the DOM-commit layer guarantees at most one card survives, with the occurrence logged. Verified via real forced tests reproducing the actual failure shapes (a 403, a stale-but-time-window-live game, two DOM nodes sharing a gameid) — not code-review assertions that it "should" work.

## Confidence self-score (revised, after the live-evidence screenshot)

- TASK 0 (40 pts): all three layers investigated with real evidence; SW ruled out with code-certainty; fetch layer confirmed via a live-captured 403 on the same relay base within 25 minutes of the bug; render layer's gap confirmed via code reading. The two symptoms' relationship (shared triggering condition, distinct mechanisms) is reasoned through explicitly, not assumed. **38/40** — the one remaining softness is that the exact live-session trace for the WNBA-specific 403 (vs. the captured NBA one) wasn't directly observed, only inferred from the shared relay base and close timing.
- TASK 1 (35 pts): three fixes, each tied to a specific confirmed finding, none speculative, all minimal-diff and convention-following (`isGameOver` reuse, established `captureFieldError` pattern, an additive DOM invariant). **33/35**.
- TASK 2 (25 pts): 10 real forced-condition tests against real extracted source, including a real (if minimal) DOM shim to prove the exact duplicate-node shape resolves correctly; full smoke/field_smoke/field_unit clean. **24/25**.

**Total: 95/100.** Committing.

## Commit

- `index.html`: `fetchV2Games` observability, `renderAll`'s `st` computation now `isGameOver`-aware, `applyMainHTML`'s duplicate-gameid reconciliation safety net. `SW_VERSION` `2026-07-15f` → `2026-07-15g`.
- `sw.js`: `SW_VERSION` bump.
- This manifest (supersedes the first, non-committed report from earlier this session).
