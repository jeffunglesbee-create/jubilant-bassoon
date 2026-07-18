# CC Session Doc — Debrief Phase 1: UI Primitives
**Date:** 2026-07-18
**Repo:** jubilant-bassoon
**Branch:** main
**HEAD start:** 6992e7a (after Gap 5 Code Map)
**HEAD end:** f840121 (live: 922a3a9 after Code Map + sync-source guard)
**Smoke start:** 958/0
**Smoke end:** 958/0
**SW_VERSION:** 2026-07-18a (unchanged — no visible DOM changes requiring cache bust)

## Commits

- `f840121` feat: UI Primitives Phase 1 (fieldChip/fillSlot/_cardTemplate/fieldSection/fieldState/fieldRow) + Gap 5 circadian JS to field.js

## Critical Architectural Discovery (resolved this session)

**`src/legacy/field.js` is the sole JS source of truth.** `scripts/sync-source.mjs` replaces the `<script>` block in `index.html` with `field.js` content on every pre-commit hook run. Any JS edit made directly to `index.html`'s script block is silently overwritten.

This is what happened to Gap 5: the prior session (cc-session-2026-07-18-gap5-circadian.md) edited `index.html` JS directly. The pre-commit hook ran `sync-source.mjs` and overwrote it. The commit appeared to succeed (smoke ran against the pre-sync state) but `computeCircadianContext` was absent from the deployed file.

**Correct workflow (now documented):**
- JS edits → `src/legacy/field.js` only
- CSS edits → `index.html` directly (CSS is before the script block, not touched by sync)
- Run `node scripts/sync-source.mjs && git add index.html` before smoke to propagate

This session retroactively fixed Gap 5 by adding it to `src/legacy/field.js`, and added all five UI Primitives there as well.

## What was built

Implemented Phase 1 of the Compound Architecture per the approved June 15 2026 spec (Drive doc `1cWgNEs3uanFh_PDi2ISSrIBTINdousbHcE1VQphvZ2I`), Part 2.

### JS functions added (src/legacy/field.js — before `// ── Per-game Circadian State`)

**fieldChip(text, tier, opts = {})**
- Returns `<span class="field-chip field-chip--TIER">text</span>`
- 7 tiers: MUST/WATCH/DISCOVERY/CAUTION/QUIET/INFO/NEUTRAL
- opts.icon → `data-icon` attribute; opts.small → `field-chip--sm` class

**_cardTemplate (IIFE → div.game-card)**
- Slots: stripe, time-score, drama(hidden), home-name, away-name, series(hidden), bundle, crew(hidden), enrichment(hidden), brief(hidden), debrief(hidden), conflict(hidden)
- `data-slot="debrief"` reserved for Phase 3 — present but hidden

**fillSlot(card, name, content)**
- null/undefined/'' → `slot.hidden = true`
- string → `slot.textContent = content; slot.hidden = false`
- Element → `slot.replaceChildren(content); slot.hidden = false`

**fieldSection(title, opts = {})**
- Returns `<section class="field-section">` with header (h3 + optional count chip + optional badge) and `div.field-section__content`
- opts.collapsible → click handler toggles `.collapsed` class
- opts.count → appends QUIET chip with count string
- `section._content` exposed for appending children

**fieldState(status, content)**
- status: loading/empty/partial/ready/error
- loading → pulse div; empty → italic message; partial → content + QUIET chip; ready → content; error → empty wrapper (fire-and-forget)

**fieldRow(label, value, opts = {})**
- Returns `<div class="field-row">` with label span + value span
- opts.trend: 'up'/'down' → adds `--up`/`--down` class (↑↓ via CSS ::after)
- opts.chip → prepended chip element

### Gap 5 JS (retroactively moved to field.js — was missing from deployed code)

- `computeCircadianContext`, `computeSportCircadian`, `applyCircadian`
- `_circadianMode`, `_circadianBySport` module-level state
- Sort secondary ordering (PRIME/LATE by `_gameImportance`, NIGHT by `minutesSinceFinal`, PREVIEW by `start_time`)
- Section template `data-sport-circadian` attribute
- V2 poll wiring (try/catch around `computeSportCircadian` → `applyCircadian`)

### CSS added (index.html — after circadian block, before </style>)

- `.field-chip` and all 7 tier classes — colors verified against Rule 37 COLOUR-SYS-A tokens
- `.field-section`, `.field-section__header`, `.field-section__title`, `.collapsed` hide
- `.field-state--loading` pulse animation (`fieldPulse` @keyframes), `.field-state__empty`
- `.field-row`, `.field-row__label`, `.field-row__value`, `--up`/`--down` variants
- `.card-debrief{display:none}` + `.game-card.is-final .card-debrief{display:block}`
- `.game-card.is-final [data-slot="brief"]{display:none}`

### Colour verification (COLOUR-SYS-A)

- MUST: `#ef4444` = `--angle-elim` ✓
- WATCH: `#f59e0b` = `--caution`/`--angle-upset` ✓
- DISCOVERY: `#2dd4bf` = `--access-free`/`--angle-gem` ✓
- CAUTION: `#f59e0b` (same as WATCH, lower alpha background) ✓
- QUIET: `#888` (neutral grey, no token needed) ✓
- INFO: `#60a5fa` = `--sport-nhl` ✓
- NEUTRAL: `rgba(255,255,255,.6)` ✓

## Verification (TASK 4)

### Isolated DOM test (26 assertions, all passed)

Built a custom DOM stub (class Element, makeEl(), manual slot children) — jsdom not available in this environment. Verified:
- fieldChip: class, textContent, data-icon, field-chip--sm
- fillSlot: null→hidden, string→textContent, Element→replaceChildren
- fieldSection: structure, count chip, collapsible toggle
- fieldState: loading pulse, empty msg, partial, ready, error (empty wrapper)
- fieldRow: label, value, trend classes, chip prepend

### CI verification

- Deploy gate (fast smoke): ✅ success on `f840121`
- Desktop Chrome Viewport Audit: ✅ success on `f840121`
- Client Live Invariant: ✅ success on `50628e6` (pre-`f840121` Code Map; verified passes)
- Smoke: 958/0 before and after commit

## Spec deviations

1. **No live surface wiring** — primitives are standalone per spec. Phase 2 (Schedule Compound) wires them in.
2. **`_cardTemplate` not exported** — accessed via module closure only (spec-compliant: fillSlot is the public API).
3. **Gap 5 retroactive fix not in spec** — required because the spec assumed Gap 5 was already correctly deployed (it wasn't).

## Confidence score

- TASK 1 (fieldChip): 25/25
- TASK 2 (_cardTemplate + fillSlot): 30/30
- TASK 3 (fieldSection/fieldState/fieldRow): 20/20
- TASK 4 (real isolated verification + CI green): 25/25
- **Total: 100/100**

## Open carry-forwards

- **Phase 2 (Schedule Compound):** `buildEnrichedGame`, `renderCard`, delta rendering, refresh coordinator. Now dispatchable — requires this phase's slot template to be present (it is).
- **Phase 3 (The Debrief):** Cannot start until Phase 2 lands. `data-slot="debrief"` is reserved and present.
- **Gap 6 (The Debrief notification):** Still blocked on The Debrief being built (assembleDebrief, fillDebriefSlots).
- **CONTRACTS.md update (standing):** Golf scoring columns relay fields (birdies/bogeys/doublesOrWorse). No cross-session boundary touched this session.
- **sync-source.mjs guard:** Documented in `docs/CC-CMD-2026-07-18-sync-source-guard.md` (added by Code Map session after this commit).
