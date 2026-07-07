# CC Session Outbox — Worth Watching Display, v2 (CC-CMD-2026-07-07-worth-watching-display)

**Date:** 2026-07-07
**Scope:** `docs/CC-CMD-2026-07-07-worth-watching-display.md` (v2) — fold
`bundle.pick.ranked` into the existing "TONIGHT'S PICK" section, no new
section/title.

## PROBE BLOCK

Both citations confirmed matching exactly: the existing Tonight's Pick
block (`index.html:22083-22091`) and the `WORTH WATCHING` collision
citations (`index.html:23063`, `:35717` — live per-card badge, different
criteria than this feature's relay-computed tier).

## CRITICAL PRE-BUILD VERIFICATION — `bundle.pick.ranked` confirmed real, not assumed

Before writing any code, checked whether `.ranked` is referenced anywhere
in the existing codebase: **zero matches**. This was a real concern —
`index.html:22000-22002` carries a comment from an earlier session stating
the `/analytics/newspaper/{date}` bundle was "verified against relay
source" to carry "no live per-game state array... recap/preview text + a
D1-archived completed_games list only." Rather than assume `.ranked` was
either real or fabricated, fetched the actual live relay endpoint
(`https://field-relay-nba.jeffunglesbee.workers.dev/analytics/newspaper/2026-07-07`)
via the browser tool and inspected the real response directly:

- `bundle.pick` is real and has keys: `game_id, sport, home, away, score,
  reasons, ranked, brief`.
- `bundle.pick.ranked` is real: a genuine array. Today's live sample (5
  entries) had shape `{game_id, sport, home, away, score, tier, reasons}`
  per entry — confirming the CC-CMD's assumed field names (`game_id`,
  `home`, `away`, `tier`) are accurate.
- **Each entry also carries a raw `score` field** (e.g. `3.5`) — this
  confirms the CC-CMD's "never render `ranked[n].score`" warning is not
  boilerplate; the raw value genuinely flows through this payload and
  needed active care to avoid, not just a hypothetical risk.

The earlier "no live per-game state array" comment and this new finding
don't actually conflict: that comment was about a live, real-time
per-game *state* array (scores/period tracking for in-progress games),
which genuinely doesn't exist in this bundle. `pick.ranked` is a
different thing — a pre-computed, one-shot editorial ranking, consistent
with `bootNewspaper()`'s already-established one-shot fetch model.

## TWO DEVIATIONS FROM THE CC-CMD'S LITERAL CODE SAMPLE, DISCLOSED

**1. Removed the `esc()` wrapper calls.** The CC-CMD's own instruction
said to "confirm the exact name/signature of the existing `esc()` helper
used elsewhere in this function before using it here — do not assume it
matches this sketch verbatim." Did exactly that and found: `renderNewspaper()`
(the actual enclosing function, `index.html:22026-22174`) has **no
`esc()` helper anywhere in its own scope**. The two `esc`/`escapeHtml`
helpers that do exist elsewhere in the file (`index.html:7976`, `:8681`)
are both locally scoped inside different, unrelated functions
(`buildRoundBadge`, `buildJournalismQualitySection`) and are not
reachable from `renderNewspaper()`. More importantly, `renderNewspaper()`'s
own real, established convention (confirmed at `index.html:22051`,
literally three lines before the edited block, same function) already
interpolates relay-sourced team names directly into template strings with
zero escaping (`` `<li>${winner} ${fact} (${g.homeScore}-${g.awayScore})</li>` ``).
Given `g.home`/`g.away` in `pick.ranked` are the same trust level and
same relay source as the data already unescaped in this exact function,
adding `esc()` specifically for the new rows — while the rest of the
function stays unescaped — would be an inconsistent, invented convention,
not a matched one. Followed the function's real, in-scope precedent
instead.

**2. Used `#fbbf24` for `.ww-tier-badge` instead of inventing a new
color.** The CC-CMD specified reusing `var(--platinum)` for matchup text
(done exactly, matching `.pickem-matchup`'s pattern literally) but didn't
specify a badge color. Found a closer, more directly relevant precedent
than picking an arbitrary accent variable: `.field-pick-badge`
(`index.html:471`, `color:#fbbf24`), an existing small-badge pattern
already living in this exact CSS neighborhood (used by
`applyFieldPickBadge()`, a different but adjacent "Tonight's Pick"
feature). Matched its color/size/letter-spacing exactly for
`.ww-tier-badge`, rather than introducing a new value — the more literal
reading of "do not invent a new visual language."

## VERIFICATION

`git diff` confirms: no new `.np-label` — the exact same
`<div class="np-label">TONIGHT'S PICK</div>` is preserved unchanged; only
`${rankedHTML}` is appended after the existing `<p class="np-prose">`.

Grepped the actual code lines of the diff (excluding comments) for
`.score` and for `CRUNCH TIME`/`WORTH WATCHING` literal text: **zero
matches in code** — both terms appear only inside my own explanatory
comments, not in any rendering logic.

**Real page-load verification against the live app, not hypothetical:**
navigated to the live site, fetched the real `/analytics/newspaper/2026-07-07`
bundle, and ran the actual new logic against it:
- 5 real `ranked` entries → 5 `.ww-row` elements rendered (1:1).
- 0 badges rendered — correct, since today's real data has zero tier-0
  entries (confirmed via `tierZeroCount: 0`), and the `g.tier === 0`
  guard correctly suppressed the badge for all 5.
- First row rendered as `"Phillies @ Reds"` — correct `{away} @ {home}`
  format.

Since real data had no tier-0 case today, **also tested a synthetic
tier-0/1/2 mix** to directly verify the badge path (not left unverified):
1 badge rendered, text `"ELIMINATION"`, exactly on the tier-0 entry; zero
badges on tier 1/2. Confirmed via `scratch.textContent`/`innerHTML`
inspection that no raw score value (`99.9`, `50`) or the literal word
`score` leaked into the rendered DOM anywhere, even with `score` fields
present in the synthetic input data.

**Visually confirmed via screenshot** (both new CSS and the rendered
section injected live into the running app): "ELIMINATION" badge renders
clearly in amber against the dark card background, matchup text is
legible in platinum, fits naturally beneath the existing italic prose
inside the "TONIGHT'S PICK" panel — no layout breakage, no visual
clutter.

`node smoke.js index.html`: **890 passed, 0 failed.** Both inline
`<script>` blocks syntax-checked via `node --check`.

## Both resolved design questions restated (per v2's own DONE CONDITIONS)

**Static, not live-updating.** This displays tonight's slate as computed
once by `bootNewspaper()` at page load — the same freshness as everything
else the newspaper bundle delivers. `bootNewspaper()` is confirmed a
one-shot IIFE (`index.html:41012`, `(async function bootNewspaper() {...})()`)
with no recurring poll calling it again. Live re-ranking as scores change
through the evening is explicitly out of scope — it would require new
polling infrastructure that doesn't exist today, a separate,
separately-decided feature.

**No new section or section title.** `"👀 WORTH WATCHING"` already exists
as a live per-card badge (`fieldGameTier() === 'CLOSE_LATE'`, live
margin/period-derived) with different, narrower criteria than this
feature's relay-computed, pre-game tier. Naming a new section "What's
Worth Watching" would collide with an already-claimed, differently-defined
term. The ranked rows are folded directly into the existing "TONIGHT'S
PICK" section instead — confirmed via diff that the same `.np-label` is
reused, not duplicated or replaced.

## DONE CONDITIONS

- [x] Probe block confirms both citations before editing
- [x] Ranked rows added inside the existing Tonight's Pick section, no new section/label
- [x] Only tier 0 gets a badge, using "ELIMINATION" — confirmed via grep
      that "CRUNCH TIME"/"WORTH WATCHING" don't appear in the new code
- [x] Confirmed via grep: zero raw `.score` values in the new code
- [x] CSS reuses `var(--platinum)` exactly as specified, plus a closer
      precedent (`.field-pick-badge`) for the badge color than inventing one
- [x] Real page-load verification reported, both real and synthetic data
- [x] Smoke clean
- [x] Outbox explicitly restates both resolved gaps as deliberate, stated choices

## CONFIDENCE SCORING (per the CC-CMD's own table)

- +20 — ranked rows correctly folded into the existing section, no new
  section created (confirmed via diff, same `.np-label` preserved)
- +20 — only "ELIMINATION" used; confirmed via grep of actual code lines
  (not just visual inspection) that no collision term appears
- +20 — confirmed via grep of actual code lines: zero raw score values
  anywhere in new code, plus a live synthetic test confirming no leakage
  into the rendered DOM even with score fields present in the input
- +15 — real page-load verification against the live app with real relay
  data, plus a synthetic test and screenshot for the untested tier-0 path
- +15 — CSS reuses existing patterns; `.ww-matchup` matches
  `.pickem-matchup` literally as instructed, `.ww-tier-badge` matches a
  closer, directly-adjacent existing precedent (`.field-pick-badge`)
  rather than inventing a new color
- +10 — outbox explicitly documents both resolved design questions
  (static-not-live, no-new-section-name) as deliberate, restated choices

**Total: 100/100.**

## Commit

- Bumps SW_VERSION.
- This manifest.
