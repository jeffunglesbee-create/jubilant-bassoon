# CC-CMD: Circadian visual treatment (PRIME/PREVIEW/NIGHT) — "turn on the lights"

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** Pure CSS. No JS logic changes — the circadian classification
system (getCardCircadian, the sync registry, live refresh) is already
shipped, live, cross-sport, and verified correct. This CC-CMD makes it
visible for the first time.
**Why:** Live-verified 2026-07-04: only `.circadian-late` has any CSS
treatment at all (`opacity: var(--opacity-seen)`). PRIME, PREVIEW, and
NIGHT render with zero visual difference despite the classification
being fully correct and live-refreshing. This is the highest-leverage
unclaimed work from today's circadian effort — the entire data layer
is done; presentation is the only missing piece.
**Target time:** ~20 min (pure CSS addition, no logic)

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail
- eslint baseline first before any code edit (not usually relevant for pure CSS, run anyway per convention)

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95.

## PROBE BLOCK (run before any edits)
```bash
grep -n "\.game-card\.circadian-late{opacity" index.html
grep -n "\.card-accent{background" index.html
grep -n "\.game-card\.espn-live \.card-accent\|\.game-card\.espn-final \.card-accent" index.html
grep -n "^\s*--live:\|^\s*--gold:\|^\s*--edge2:\|^\s*--drama-watch:" index.html
```
Re-confirm all four token values and the exact existing `.card-accent`
rules before editing — this doc's design depends on `--live`=#ff3b3b,
`--gold`=#c9a84c, `--drama-watch`=#4a9eff being visually distinct from
each other and from `--edge2` (default) and the existing
`.espn-final .card-accent` dark gray (`#3a3a4a`). If any of these have
changed, STOP and reconsider the color mapping rather than proceeding
on stale values.

## CONTEXT — real existing pattern being extended, not invented

`.card-accent` (a 3px colored stripe, NOT a border-left — sport identity
does not use border-left in the actually-shipped CSS, despite an older
aspirational doc describing that approach) already has state-driven
color rules:
```css
.card-accent{background:var(--edge2);width:3px}
.game-card.live  .card-accent{background:var(--live)}
.game-card.soon  .card-accent{background:var(--gold)}
.game-card.espn-live .card-accent{background:var(--live)}
.game-card.espn-final .card-accent{background:#3a3a4a}
```
This CC-CMD extends the SAME mechanism for circadian classes, using
ONLY already-existing tokens — no new colors invented, matching the
precedent already set by `.circadian-late`'s own comment ("Reuses the
existing --opacity-seen token... not a new invented value").

**Deliberate design note:** MLB's circadian classification (via
`refreshMLBStatus`, shipped today) can be MORE accurate and FASTER than
`.espn-final`/`.espn-live` for MLB specifically, per today's own
dual-source investigation (ESPN's own score-matching can lag up to 15
min). Placing the circadian rules AFTER the existing espn-live/espn-final
rules in source order means circadian wins the cascade when both apply
to the same card — a deliberate choice, not an accident, since it's
the more accurate signal for the sport where the two can actually
disagree.

## TASK 1 — Add circadian accent rules

Find the existing block (index.html ~704-706, re-verify via probe):
```css
.card-accent{background:var(--edge2);width:3px}
.game-card.live  .card-accent{background:var(--live)}
.game-card.soon  .card-accent{background:var(--gold)}
```
And the existing `.circadian-late` rule (index.html ~689, re-verify):
```css
.game-card.circadian-late{opacity:var(--opacity-seen)}
```

Add immediately after the `.circadian-late` rule (keeping all circadian
rules grouped together for readability):
```css
/* Circadian PRIME/PREVIEW/NIGHT accent — "turn on the lights" pass.
   LATE already has opacity dimming (above). These three reuse existing
   .card-accent tokens, matching the already-shipped .live/.soon/.espn-*
   pattern above -- no new colors invented. Placed AFTER .espn-live/
   .espn-final intentionally: circadian is the more accurate signal for
   MLB specifically (refreshMLBStatus can beat ESPN's score-matching by
   up to ~15 min per 2026-07-04's dual-source investigation), so it
   should win the cascade where both classes apply to the same card. */
.game-card.circadian-prime .card-accent{background:var(--live)}
.game-card.circadian-preview .card-accent{background:var(--gold)}
.game-card.circadian-night .card-accent{background:var(--drama-watch)}
```

## TASK 2 — Smoke assertions

```javascript
smoke.assert(!!html.match(/\.game-card\.circadian-prime\s*\.card-accent\{background:var\(--live\)\}/), 'A[NEXT]: circadian PRIME has visual accent treatment');
smoke.assert(!!html.match(/\.game-card\.circadian-preview\s*\.card-accent\{background:var\(--gold\)\}/), 'A[NEXT+1]: circadian PREVIEW has visual accent treatment');
smoke.assert(!!html.match(/\.game-card\.circadian-night\s*\.card-accent\{background:var\(--drama-watch\)\}/), 'A[NEXT+2]: circadian NIGHT has visual accent treatment');
```
(CC: assign real sequential A-numbers.)

## SCOPE BOUNDARY

DO:
- Add exactly 3 new CSS rules, reusing existing tokens only
- Place them after the existing espn-live/espn-final accent rules (cascade order matters, see CONTEXT)
- 3 smoke assertions
- Bump SW_VERSION

DO NOT:
- Touch any JS logic — `getCardCircadian`, the sync registry, `refreshMLBStatus`, or anything data-related is out of scope and already correct
- Invent new colors or tokens — if the existing 3 tokens (`--live`, `--gold`, `--drama-watch`) don't feel visually right once seen live, that's a follow-up design decision for Jeff, not something to solve by adding new tokens in this pass
- Change `.circadian-late`'s existing rule
- Add card sorting/reordering logic (the original spec mentioned "PRIME first, then NIGHT, then PREVIEW, then LATE" sort order — that's a separate, distinct piece of work, not in scope here)

## DONE CONDITIONS
- [ ] Probe block re-run, all token values and existing rules reconciled with this doc
- [ ] 3 new CSS rules added exactly as specified, in the correct cascade position
- [ ] `node smoke.js index.html` exits 0 with all 3 new assertions green
- [ ] CI confirms deployed
- [ ] SW_VERSION bumped in index.html and sw.js
- [ ] Outbox manifest written to `docs/outbox/cc-circadian-visual-treatment-{date}.md`

**Deferred to chat — do NOT block your commit on this:**
- [ ] Real visual confirmation (screenshot or live check) that a genuine PRIME, PREVIEW, and NIGHT card each show a visually distinct accent color in production — CSS rules existing and matching the right selector is not the same as confirming they actually render as intended against real card markup.

## COMPLIANCE
- Rule 47/ADR-002/RUWT: pure color/opacity treatment of already-named states, no composite scores, no interest values
- Rule 68: probe block first, re-verify token values before editing
- Rule 87: self-completing on the CC-verifiable portion; live visual confirmation deferred

## CONFIDENCE SCORING TABLE
+30  3 CSS rules added exactly as specified, correct cascade position
+30  Confirmed via code read: only existing tokens used, no new colors invented
+20  Smoke 3/3 green
+20  CI confirms deployed

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-circadian-visual-treatment.md.
Re-confirm the four token values and existing .card-accent rules first
(see PROBE BLOCK). Implement exactly as specified — reuse existing
tokens only, do not invent new colors, and preserve the cascade order
(circadian rules after espn-live/espn-final). Do not commit unless
confidence ≥ 95. If score < 95 report verbatim and stop — do not invent
results.
