# CC Session Outbox — Isolate per-card build failures (CC-CMD-2026-07-11-per-card-render-isolation)

**Date:** 2026-07-11
**Scope:** jubilant-bassoon (sole). All tasks executed.

## TASK 1 — Confirmed, list expanded to the real complete set

Re-read the render-signature gate fresh from HEAD (index.html:11523,
matches the doc's `~line 11523` exactly). Confirmed the doc's own
scope claim: `try { if (window.FIELD_RENDER_PIPELINE)
window.FIELD_RENDER_PIPELINE.lastSignature = _fieldVisibleRenderSignature(); }
catch(_) {}` sits immediately after `applyMainHTML(_renderAllHTML)`
(line 11517), which itself requires the full per-card `.map()` (which
builds `_renderAllHTML`) to have completed without an unhandled throw.
A genuine throw during card-building — before this CC-CMD's fix — never
reaches the stamp line at all, leaving `lastSignature` stale, so the
next `scheduleRenderAll` cycle correctly sees a signature mismatch and
retries. The doc's correction of the ChatGPT claim holds up under
direct tracing.

Re-read the full per-card template builder (`games.map((g,gi)=>{...})`,
index.html:11418-11507 before this fix) and grepped every function
call inside it — the doc's own listed 11 names were accurate but
explicitly hedged as partial ("and others"). The real, complete list
of unwrapped calls (23 total):

`computeInsights`, `getStatus`, `fmtTime`, `findESPNScore` (3 call
sites: line 11445, 11487, 11489), `getCardCircadian`, `_cardTierClass`,
`matchupHTML`, `isRivalGame`, `buildSeriesMarginsDots`,
`buildViewerIntelChip`, `streamsHTML`, `buildParkFactorBadge`,
`buildUmpWatchBadge`, `buildNHLAnalyticsBadges`, `buildRoundBadge`,
`buildVibeChips`, `buildWCBars`, `buildDramaLineTiers`,
`buildCheapSeats`, `assessInjuryPriceImpact`, `_buildUFLEpaHTML`,
`buildMobileSmartChip`, `streamsHTMLCapped`.

Confirmed correctly wrapped (matching the doc's claim, not touched):
`buildCardTimeDisplay` (line 11497, `catch(_) { return timeStr; }`)
and `window.getPulseChip` (line 11498, `catch(_){ return ''; }`).

## TASK 2 — Whole per-card build wrapped in one boundary, `captureFieldError` reused, omit-vs-fallback decision reasoned

Wrapped the entire per-card build — from `g._insights=computeInsights(...)`
(the first real computation after the cache-hit early return) through
`return _html;` — in a single `try { ... } catch(_cardErr) { ... }`.
On failure: `captureFieldError(\`card:${sec.sport}:${g._id||gi}\`, _cardErr)`
then `return ''`. Two edits only (opening `try {` + comment, closing
`} catch(...) {...}`); zero lines of the actual card-building logic
touched — confirmed via `git diff`: 6 insertions, 0 deletions.

**Decision: empty string (card silently omitted), not a fallback
shell — reasoned against the doc's own stated criterion ("less
disruptive to the surrounding grid layout"):**

1. `games-list` is a grid/flex container of `.game-card` items.
   Omitting one item is a clean N-1 reflow — standard, zero-disruption
   grid behavior. A hand-built "minimal shell" card risks looking
   visually inconsistent if its markup doesn't exactly match what the
   surrounding CSS expects from a full card (uniform sizing,
   `.card-right`, `.stream-row`, etc.).
2. A safe fallback shell would need to avoid referencing whatever data
   caused the original throw — but that's often the *same* input
   (`g.home`/`g.away`/`timeStr`) the fallback itself would need.
   `fmtTime(g.start_time)` (which produces `timeStr`) is itself one of
   the 23 unwrapped calls — if that's what threw, a fallback relying
   on `timeStr` isn't safely computable either.
3. A second hand-maintained mini-template is a second thing that must
   stay in sync with the CSS grid's real card structure forever, for
   an edge case — more surface area, not less.
4. `captureFieldError` is the actual mitigation TASK 3 asks about: the
   failure is never silent to a developer (visible in
   `_fieldErrors`/Health Panel) even though it's silent to the end
   user. This matches the exact principle already established twice
   tonight (relay-init-staleness-visibility, render-surface-visibility):
   "don't remove the isolation — fix the silence."

## TASK 3 — Tradeoff stated explicitly, not glossed over

**Before this fix:** one malformed game object → the whole `.map()`
throws synchronously → `renderAll()` itself throws → `applyMainHTML`
and the signature-stamp line are never reached → `main.innerHTML`
stays whatever it was (stale/prior render) → `lastSignature` stays
stale too → the *next* `scheduleRenderAll` cycle sees a signature
mismatch and retries the full structural render (which will fail
again, identically, until the malformed game's data changes). Net
effect: the **entire page's structural render is blocked** by one bad
game, with zero durable trace of why (an uncaught exception in a timer
callback / click handler just logs to the browser console and is
gone) — but the failure is at least *loud* in the sense that nothing
updates at all.

**After this fix:** the same malformed game is isolated — the rest of
the section renders correctly, `applyMainHTML` succeeds,
`lastSignature` **does** get stamped (since the render call now always
reaches that line). This means: the render "succeeds" from the gate's
perspective even with one card missing, and — because the signature
comparison sees no material change on the next cycle — the malformed
card is **not automatically retried** on subsequent
`scheduleRenderAll` calls unless something else in the visible-render
signature changes (which would trigger a fresh full attempt that would
try, and likely fail again, on that same card each time — silently
omitted again, not blocking the rest).

**This is a real tradeoff, not a strict improvement:** trading "one
bad game blocks the whole page, forcing perpetual retry" for "the rest
of the page always works, but one bad game can silently and
persistently vanish from view." The stated mitigation —
`captureFieldError` making the failure durably visible in
`_fieldErrors`/Health Panel — is what keeps this an acceptable
tradeoff rather than a regression: a developer checking the Health
Panel now sees exactly which card/sport failed and why, something that
was **not available at all** before this fix (an uncaught exception
had zero durable trace). The render-signature gate's own comparison
logic is unchanged and still correct; what changed is that the render
call now reliably reaches the stamp line every time, which is the
intended effect of isolating the failure, not an accidental
side-effect that breaks the gate.

## VERIFICATION

- **Real forced-failure test** (Node `vm`, extracted verbatim — the
  exact `games.map((g,gi)=>{...})` callback body plus
  `captureFieldError`, not reimplemented): built a realistic mock for
  every one of the 23 unwrapped calls plus the 2 already-wrapped ones,
  ran 3 game objects through it with `buildViewerIntelChip` throwing a
  real `Error` for exactly one (`_id: 'BAD_GAME'`). Result:
  - `cards.length === 3` (all 3 slots present in the array).
  - Card 0 and Card 2 (the healthy games) rendered normally, each
    containing their real matchup text (`Celtics`, `Mavericks`).
  - Card 1 (`BAD_GAME`) is exactly `''` — cleanly omitted, no partial
    HTML fragment.
  - `window._fieldErrors` captured **exactly one** entry:
    `{fn: "card:NBA:BAD_GAME", err: "Cannot read properties of
    undefined (reading toFixed) — forced test failure", ts: ...}` —
    correct tag format (`card:{sport}:{gameId}`), correct message.
  - Test harness was extraction-only (a throwaway copy in `/tmp`,
    deleted after the test); the committed `index.html` was never
    touched by the test itself, confirmed via `git diff --stat`
    showing 6 insertions / 0 deletions, unchanged since the original
    edit.
- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: 21 failures — confirmed
  pre-existing and unrelated (same count as every prior commit
  tonight).
- No existing card's non-failure-case output changed: confirmed via
  `git diff` — the only lines touched are the new `try {`/`catch{}`
  wrapper; every line of actual card-building logic between them is
  byte-for-byte identical to before.

## DONE CONDITION

A single malformed game object can no longer take down the entire
structural render — it fails in isolation, is logged via the existing
`_fieldErrors` mechanism with a specific `card:{sport}:{gameId}` tag,
and the rest of the section renders normally. Verified with a real
forced-failure test showing correct tag capture, clean omission, and
unaffected siblings — not asserted.

## CONFIDENCE SCORING

- +15 — TASK 1 confirms complete, accurate list of unwrapped calls,
  not assumed: **met** (expanded the doc's own hedged partial list to
  the real, complete 23-call enumeration via direct grep + read)
- +35 — TASK 2 correctly wraps the whole per-card build in one
  boundary, reuses `captureFieldError`, stated fallback choice with
  reasoning: **met**
- +20 — TASK 3 tradeoff explicitly stated and reasoned, not glossed
  over: **met**
- +20 — Real forced-failure test constructed and verified, correct tag
  captured, rest of section unaffected: **met**
- +10 — `node smoke.js` clean, no non-failure-case output changed:
  **met**

**Total: 100/100.**

## Commit

- `index.html`: per-card build in `renderAll()`'s `.map()` wrapped in
  one try/catch, reusing `captureFieldError`. `SW_VERSION` bumped
  `2026-07-11h` → `2026-07-11i`.
- `sw.js`: `SW_VERSION` synced to `2026-07-11i`.
- This manifest.
- **No out-of-scope findings this time** — the render-signature gate's
  own correctness was directly traced and confirmed sound (matching
  the doc's own correction of the ChatGPT claim); no further audit
  needed beyond the one function this CC-CMD targeted.
