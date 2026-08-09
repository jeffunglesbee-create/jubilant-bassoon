# CC-CMD-2026-08-09-condition-tag-semantic-styling

**Repo:** jubilant-bassoon — commit directly to `main`.

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-09-condition-tag-semantic-styling.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## Supersedes CC-CMD-2026-08-03-review-field-identity-test

That CC-CMD is **closed, not abandoned** — see
`outbox/cc-session-2026-08-03-review-field-identity-test.md` and its
addendum. It was mis-scoped against two assumptions that both turned out
false, and this re-scope exists because of what executing it revealed:

1. **It said the token values live in field-playground and must be copied
   from there.** They must not. `COLOUR-SYS-A` (Drive
   `1NWToUpUMPnn3LMZllJdybTyGOZuoEA6DyXEXDHy90rs`) is the canonical token
   spec, governed by **STANDARDS Rule 37**, and it states: *"No raw hex
   values in component JavaScript, template strings, or inline styles"*
   and *"using a color in a context that contradicts its semantic meaning
   = DO NOT SHIP."* Importing playground hex would have been a Rule 37
   violation. **field-playground is not needed for any task here.**
2. **It assumed production has a bracketed-condition display to restyle.**
   It does not — the tags are interpolated into plain-text strings.
   Creating the element is now explicitly in scope (confirmed 2026-08-09).

## Facts established, so no task re-derives them

- **Emit sites** (`src/legacy/field.js`): 3918 `pf.badge`, 3924
  `ump.badge`, 3934 `tempo.badge`, plus the `opts.badge` path at 2281.
  All push into `lines[]` as text, e.g.
  `lines.push(\`  Park: [${pf.badge}] ${pf.context}\`)`.
- **Tier source:** `_otwGetLiveTier()` (~35019) returns named conditions
  `CRUNCH` / `EXTRA_TIME` / `CLOSE_FINISH` / `LIVE_GAME`;
  `_otwTierLabel()` (~35075) maps them to display strings. ADR-002 Tier
  Foundation: *"every consumer reads a named tier, never a raw number."*
- **Render helper:** `fieldChip()` (~2280) is this codebase's established
  way to render a small labelled chip as a real element. **Use it. Do not
  invent a span convention.**
- **Font:** `DM Mono` is already loaded and already used on adjacent
  chip-like elements (`.otw-changed`, `.otw-changed-stamp`,
  `.fan-out-chip`). **No new font. Do not add IBM Plex Mono.**

## The tier → token mapping (from COLOUR-SYS-A; do not invent)

| tier | token | meaning per spec |
|---|---|---|
| `CRUNCH` | `var(--drama-must)` | GOLD usage list names *"CRUNCH TIME pulse"* and *"OTW FIRE state"* explicitly |
| `EXTRA_TIME` | `var(--drama-must)` | maximum urgency |
| `CLOSE_FINISH` | `var(--drama-watch)` | "worth your time" |
| `LIVE_GAME` | `var(--drama-low)` | "low stakes, honest" |

Re-read the spec before relying on this table (Rule 72 — it is an
inherited claim). If a tier has no clean token, **stop and ask** rather
than picking the nearest colour.

## Task 1 — BLOCKING GATE: do these strings reach non-DOM consumers?

`lines.join(...)` appears at four sites (~483, ~16160, ~16713, ~18678).
The emit function is named `getMLBAnalyticsContext` — "context" strongly
suggests it feeds **journalism prose**, not only the DOM. Putting markup
into a string that is later sent to a model or written to KV would be a
real defect, not a cosmetic one.

Trace **every** consumer of the `lines` array from each of the four emit
sites. **Artifact:** a list of each consumer and whether its output is
(a) innerHTML/DOM, or (b) prose — a prompt, KV value, D1 column, or
journalism context string.

- **If ANY consumer is prose: STOP.** Do not proceed to Task 3. Report
  which one, and propose the split (separate structured field vs display
  string) as a follow-up CC-CMD. Do not solve it inline.
- If all consumers are DOM, continue.

## Task 2 — the glow decision, made BEFORE any CSS is written

The playground direction included a tier-coloured **glow**. `COLOUR-SYS-A`
shows the established emphasis patterns as `border-left` and
`box-shadow: inset` — not an outer glow. Rule 37 requires that any new
token be defined first with (1) its meaning in one sentence, (2) what it
must never be confused with, (3) confirmation it conflicts with nothing.

**Decide and state which:**
- (a) reuse the existing emphasis pattern, no new token — preferred,
  ships inside the system; or
- (b) define a glow token per Rule 37's three requirements, which is a
  governance change and needs sign-off before it ships.

**Do not add an un-tokenised `box-shadow` with a hex value.** That is the
exact Rule 37 violation this re-scope exists to avoid.

## Task 3 — pilot ONE emit site

Convert **one** site only — recommend 3918 (`pf.badge`, park factor) as
the simplest. Render the bracketed condition through `fieldChip()`,
carrying a tier class whose colour comes from the mapping above.

Leave the other three sites untouched. A pilot that works is evidence; a
sweep that works is a bigger change than this CC-CMD is scoped for
(Rule 69).

## Task 4 — verification artifacts (Rule 90)

1. `node smoke.js index.html` → **0 failed**.
2. **No raw hex introduced:** `git diff` shows zero new `#rrggbb` values
   in JS or template strings. Quote the grep.
3. **Rule 37 smoke parity:** the spec's own assertions (`--drama-must`,
   `--drama-watch`, `--drama-low` present; no raw drama hex) still pass.
4. **Visual proof via the CI-as-proxy Playwright pattern** — a real
   browser against the LIVE deployed URL, committing a screenshot plus a
   structured manifest with boolean fields (e.g. `chipPresent`,
   `chipComputedColor`), not prose. See `ambient-skeleton-probe.yml` as
   the reference implementation. Sandbox browser access has proven
   unreliable in this project; do not substitute an ad-hoc headless run.
5. SW_VERSION bumped in **both** `src/legacy/field.js` and `sw.js`, then
   `node scripts/sync-source.mjs`. Never edit `index.html`'s script block.

## Explicitly NOT in scope

- Do not convert the other three emit sites.
- Do not change any other part of the visual system.
- Do not add a font.
- Do not introduce a colour outside `COLOUR-SYS-A`.
- Do not touch `_otwGetLiveTier` / `_otwTierLabel` logic — read only.

## Outbox

`outbox/cc-session-2026-08-09-condition-tag-semantic-styling.md`: the
Task 1 consumer trace, the Task 2 glow decision with its reasoning, and
all five Task 4 artifacts.
