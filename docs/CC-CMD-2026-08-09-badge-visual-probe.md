# CC-CMD-2026-08-09-badge-visual-probe

**Repo:** jubilant-bassoon — commit directly to `main`.

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-09-badge-visual-probe.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## Why this exists

`CC-CMD-2026-08-09-condition-tag-badge-styling-v2` shipped a CSS change
(`.mlb-park-badge` → DM Mono + `var(--smoke)`) and produced every artifact
**except** the visual one. Rule 90 requires, for visual/rendering changes,
a real Playwright browser against the LIVE deployed URL committing a
screenshot and a structured manifest — not an ad-hoc headless run, because
sandbox browser access has proven unreliable in this project.

No such workflow exists for card badges. `ambient-skeleton-probe.yml` is
the reference implementation but targets the ambient panel.

**Until this runs, "the badge renders monospace in smoke on a real card"
is unverified.** Smoke passing and zero-hex-in-diff do not prove render.

## Task 1 — read the reference before writing a new one

Read `.github/workflows/ambient-skeleton-probe.yml` and its
`ambient-skeleton-probe-manifest-*.json` output. Match its structure:
`outbox/.trigger-*` path trigger, real browser, live URL, screenshot +
manifest committed back to `outbox/`.

Do not invent a second pattern.

## Task 2 — the probe

Navigate to the live URL, find a card carrying `.mlb-park-badge` (MLB
in-season; if none is present the run must SAY SO and exit without
claiming verification — an empty slate proves nothing).

**Manifest fields — booleans and computed values, never prose:**
```json
{ "badgePresent": true,
  "badgeFontFamily": "DM Mono",     // computed style, not the CSS source
  "badgeComputedColor": "rgb(106, 106, 138)",   // --smoke #6a6a8a
  "variantsFound": ["park-hitter", "park-pitcher"],
  "distinctColors": 1 }
```

`distinctColors` is the one that proves the collapse actually landed: all
park variants must now render the SAME colour. If it is > 1, the CSS
specificity did not win and the change is not live regardless of what the
file says.

## Task 3 — artifacts

1. Committed screenshot at a named viewport.
2. Committed manifest with the fields above.
3. `badgeComputedColor` must equal the resolved `--smoke` value and must
   NOT be any of the four retired hues (`#f59e0b`, `#22c55e`, `#60a5fa`,
   `#818cf8`) — a specific known-bad set, per Rule 90's artifact form.

## Explicitly NOT in scope
- Do not change the CSS. This verifies; it does not fix.
- If the probe FAILS, write a follow-up CC-CMD; do not patch inline.

## Outbox
`outbox/cc-session-2026-08-09-badge-visual-probe.md`
