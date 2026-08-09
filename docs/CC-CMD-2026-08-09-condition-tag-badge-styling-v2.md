# CC-CMD-2026-08-09-condition-tag-badge-styling-v2

**Repo:** jubilant-bassoon — commit directly to `main`.

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-09-condition-tag-badge-styling-v2.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## Why v2 exists

`CC-CMD-2026-08-09-condition-tag-semantic-styling` stopped at its Task 1
gate: both consumers of the emit sites it named are **model prompts**, not
DOM. Wrapping those strings in HTML would inject markup into journalism
prompts. See `outbox/cc-session-2026-08-09-condition-tag-semantic-styling.md`.

The trace found the real target. Production already renders bracketed
badges as DOM elements in a **separate function** from the prose path:

```js
function buildParkFactorBadge(game) {            // src/legacy/field.js ~3940
  return `<span class="mlb-park-badge mlb-park-${pf.badgeClass}"
                title="${pf.context}">${pf.badge}</span>`;
}
```
with CSS already at `.mlb-park-badge` (+ `.park-hitter`,
`.park-hitter-extreme` variants). The same `pf.badge` value feeds two
consumers: a prompt string (**stays text — do not touch**) and this card
badge (**already an element — this is the target**).

## Task 1 — re-verify, and settle the semantic question FIRST

- Confirm `buildParkFactorBadge` and its call sites at HEAD.
- Enumerate the sibling badge spans (`grep -oE 'class="[a-z-]*badge[a-z-]*'`)
  — several exist; decide whether this is one shared treatment or one
  badge's styling, and say which.

**The blocking question:** a park factor is **not** a drama tier.
`_otwGetLiveTier`'s CRUNCH/EXTRA_TIME/CLOSE_FINISH/LIVE_GAME mapping does
NOT apply. Re-read `COLOUR-SYS-A` (Drive
`1NWToUpUMPnn3LMZllJdybTyGOZuoEA6DyXEXDHy90rs`) and determine which
semantic token a park-factor badge legitimately takes — or whether the
spec's single-sentence test says it needs a token defined first.

**If no existing token fits, STOP.** Defining a new token is a governance
change under Rule 37 requiring (1) meaning, (2) what it must never be
confused with, (3) no conflict — and sign-off. Do not pick the nearest
colour.

## Task 2 — apply, one badge only

Monospace via the already-loaded `DM Mono` (no new font), and the token
chosen in Task 1. No raw hex — Rule 37. Do not restyle sibling badges.

## Task 3 — artifacts (Rule 90)

1. `node smoke.js index.html` → 0 failed.
2. `git diff` shows **zero** new `#rrggbb` in JS, template strings or
   inline styles. Quote the grep.
3. Playwright CI-as-proxy against the LIVE URL: screenshot + structured
   manifest with boolean/computed fields (`badgePresent`,
   `badgeComputedColor`, `badgeFontFamily`), not prose. Reference
   implementation: `ambient-skeleton-probe.yml`.
4. SW_VERSION bumped in `src/legacy/field.js` AND `sw.js`, then
   `node scripts/sync-source.mjs`.

## Explicitly NOT in scope

- Do not modify `getMLBAnalyticsContext` or any prose emit site.
- Do not restyle other badge families.
- Do not fix the existing raw-hex violation — that is
  `CC-CMD-2026-08-09-park-badge-token-compliance`.

## Outbox
`outbox/cc-session-2026-08-09-condition-tag-badge-styling-v2.md`
