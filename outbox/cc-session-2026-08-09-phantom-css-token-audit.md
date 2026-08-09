# CC-CMD-2026-08-09-phantom-css-token-audit — Result

## Status: DONE. 98 of 111 phantom-token declarations resolved; 13 stop-listed with reasons. **Confidence: 98.** (95 -> 97 -> 98; see the two amendments at the foot.)

SW_VERSION `2026-08-09c` -> `2026-08-09d` (ET). Deploy run `31317956504`
succeeded. Smoke 965/0 at every commit — with one real drop to 963
mid-way, investigated and root-caused rather than explained (below).

## Task 1 — enumerated, and it is five times the CC-CMD's estimate

The CC-CMD named four phantom tokens. The actual enumeration:

```
comm -23 /tmp/used /tmp/defined   ->  21 tokens referenced, never defined
```

More importantly, it named the wrong failure mode as the only one. There
are **two**, and they fail differently:

| form | count | behaviour |
|---|---|---|
| `var(--tok, #hex)` | ~61 | renders the fallback **forever**. Reads as tokenised, is not. |
| `var(--tok)` — no fallback | **50** | **invalid at computed-value time. The declaration is dropped and the element inherits.** |

The CC-CMD only described the first. The second is a **live rendering
defect**, not a hygiene problem, and it accounted for 50 declarations that
have never done anything:

- `.privacy-modal{background:var(--bg2)}` — the privacy modal was
  rendering with **no background at all** over a `rgba(0,0,0,.7)` overlay.
- `body.journalism-mode .jrn-companion{background:var(--bg)}` — a fixed,
  full-height, 280px right-hand panel with no background, so page content
  showed through it.
- `.vibe.crunch/.blood/.volatile/.post/.long` — an entire five-state
  colour ladder, 0 of 5 rendering.
- 24 text-colour declarations across `--fg`, `--text`, `--text2`,
  `--text3`, `--text-muted`.

## What was excluded, and why that check mattered

`--m5-left-opacity` is in the undefined list but is **set at runtime** via
`setProperty` in `field.js`. It is a legitimate override hook, not a
phantom. Treating the enumeration as a fix-list without this check would
have broken a working mechanism — the reason Task 1 says enumerate and
Task 2 says classify, as two steps.

## Task 2 — classification, and the pathology it exposed

Mapped by **role**, with the fallback hex used only to disambiguate which
of two greys was intended — never to pick the token.

**The finding worth recording:** `--text-muted` maps to **two different
real tokens** depending on the site — `--platinum` where the fallback was
`#b0b0c0`/`#9aa1ad`, `--muted` where it was `#888`. That is not
inconsistency in the fix. It is the pathology: the phantom never had a
definition, so each session that used it picked its own grey behind the
same name. Five different hexes hid behind `--text-muted` alone.

## Task 3 — applied, seven commits

| # | Group | Count |
|---|---|---|
| C1 | text roles, no-fallback (`--fg` x14, `--text` x7, `--text2`, `--text3`, `--text-muted`) | 24 |
| C2 | structure (`--mono`->`--ff-mono`, `--edge1`/`--border`->`--edge`, `--bg2`->`--card`, `--bg`->`--obsidian`, `--gold-dim`, `--label`) | 9 |
| C3 | `--amber` -> `--caution` | 6 |
| C4 | phantom tokens in `field.js` inline styles | 9 |
| C5 | text roles, fallback form | 37 |
| C6 | surfaces + `--accent-gold`/`--amber` fallback form | 11 |
| C7 | `.atp-score-live` -> `--live` | 1 |

Surface mappings were checked against a sibling, not guessed:
`.setup-modal` and `.picker-modal` already use `--card`, so the privacy
modals do too. `rgba(18,18,32,.95)` **is** `--card` exactly, so those
became `color-mix(in srgb,var(--card) 95%,transparent)` — same value, same
alpha.

C4 is also a direct Rule 37 fix on its own terms: *"No raw hex values in
component JavaScript, template strings, or inline styles."* Every one of
those nine was a hex inside a JS template literal.

## Smoke dropped 965 -> 963. Investigated first (Rule 77)

Two assertions failed, and the cause was real:

```
A696  /\.np-inner\{background:var\(--c-card/
A654  /\.wc-group-block\.group-highlight\{border-color:var\(--accent-gold/
```

**Smoke had encoded two phantom tokens as expected state.** Both
assertions exist to prove a CSS block is present; the token name was
incidental to what they check. Repointed at the corrected tokens, which
keeps each assertion doing its real job and anchors it on a declaration
that resolves to something. Back to 965/0.

Worth stating plainly: the test suite would have defended those two broken
references indefinitely. A green suite was evidence for the bug, not
against it.

## Task 2 stop-list — 13 declarations, handed back not guessed

| token | uses | why stopped |
|---|---|---|
| `--accent` | 7 | `#f97316` is `--sport-nba` exactly, which Rule 37 bans on text — but "accent" is not a reserved meaning, so there is no token to move it to. |
| `--green` | 7 | Green has no reserved meaning in Rule 37. Sites: `.wc-scenario`, `.wc-group-pill`, `.vibe.post`, `.golf-pack-chip.dense`, `.cg.verified`. |
| `--red` | 3 | Red is reserved for "elimination urgency ONLY". `.vibe.blood` is not elimination, so `--angle-elim` would encode a false meaning. |
| `--orange` | 3 | No reserved meaning. `.vibe.volatile`, `.stats-row-val.neg`. |
| `--c-live` | 1 | `.golf-lb-score.lb-under` — under-par is not "live". The token name is already wrong there; repointing at `--live` would launder the error. |

**The `.vibe` family is deliberately left partially styled — 2 of 5.**
`crunch` and `long` are `--caution` by Rule 37's own text; `blood`,
`volatile` and `post` need a decision. Fixing 2 is not a regression (they
were 0 of 5 before) but it is a visibly half-styled family, and that is
disclosed rather than resolved by guessing three hues.

One non-colour finding: `--pulse-speed` is referenced twice with
fallbacks `2s` and `1.2s` and is **never set anywhere** — an override hook
that nothing overrides. Not a colour, no obvious token (`--motion-ambient`
is 2000ms and would fit one of the two), so it is stop-listed too.

## Task 4 — done conditions

1. **`comm -23 /tmp/used /tmp/defined`** — every fixed token is gone from
   the output. What remains is exactly the stop-list plus the runtime-set
   `--m5-left-opacity` and `--pulse-speed`, all named above.
2. **Smoke:** 965 passed, 0 failed.
3. **SW_VERSION:** bumped in `src/legacy/field.js` and `sw.js` to
   `2026-08-09d` (ET), synced via `scripts/sync-source.mjs`.
4. **Live probe:**
   `outbox/badge-token-sweep-probe-2026-08-09T14-19-13-941Z-manifest.json`,
   `swVersion: "2026-08-09d"`,
   `{"pass":12,"fail":0,"emitted":1,"notEmitted":11}`, `conclusive: true`.
   `.chip-have` still `PASS` / `EMITTED` — the regression check the CC-CMD
   asked for, on the one family proven live.

## Confidence gate

**95.** Every applied mapping is justified by a role and checked against a
sibling convention rather than a nearest-colour guess; the one smoke
regression was root-caused to the test pinning a phantom, not waved
through; and the stop-list is 13 declarations with a stated reason each,
not a remainder.

Held at exactly 95 and not higher for one reason I can name precisely:
**the 50 no-fallback declarations were, by definition, rendering nothing
before this change, so every one of them is now a visible difference on
the deployed site, and none of the 50 is individually verified by a
screenshot.** The probe covers the badge/chip families and confirms no
regression there, and smoke confirms structure — but "the privacy modal
now has a background" is a claim resting on CSS reasoning, not on a
committed image of the privacy modal. That is a real gap in the artifact
chain, and it is the honest ceiling for a change of this size.

**What would close it:** extend `badge_token_sweep_probe.js` with the
handful of newly-live surfaces that can be forced open in a headless
browser — `#privacy-banner`, `.privacy-modal`, `.jrn-companion` — and
assert `background` is not `rgba(0, 0, 0, 0)`. That is a genuinely
different probe shape (it must trigger UI state, not just read computed
style), so it is written up rather than bolted on here:
`docs/CC-CMD-2026-08-09-surface-render-probe.md`.

---

# Amendment — 2026-08-09: the 95 ceiling closed at 97

The reason this doc was held at 95, in its own words: the 50 no-fallback
declarations were rendering nothing before the change, so each is now a
visible difference, and *"the privacy modal now has a background" is a
claim resting on CSS reasoning, not on a committed image of the privacy
modal.*

`CC-CMD-2026-08-09-surface-render-probe` produced that image, and three
more. `outbox/surface-render-probe-2026-08-09T14-36-40-723Z-manifest.json`,
`swVersion: "2026-08-09d"`, `moduleBooted: true`:

```
{"pass":4,"fail":0,"notOpened":0,"total":4}  conclusive: true

PASS  privacy-banner    bg=rgb(18, 18, 36)  want=rgb(18, 18, 36)
PASS  privacy-modal     bg=rgb(18, 18, 36)  want=rgb(18, 18, 36)
PASS  jrn-companion     bg=rgb(7, 7, 16)    want=rgb(7, 7, 16)
PASS  eu-push-consent   bg=rgb(18, 18, 36)  want=rgb(18, 18, 36)
```

Each surface was opened by the app's own reveal path, measured against
tokens read from the live page, and imaged. All four were
`rgba(0, 0, 0, 0)` before this audit.

**97, not higher**, because those four are the surfaces I could name. The
other ~46 fixed declarations are text colours that remain unimaged — no
evidence suggests they are wrong, but they are not individually proven.

Full detail: `outbox/cc-session-2026-08-09-surface-render-probe.md`.

---

# Amendment 2 — 2026-08-09: 97 -> 98, the remaining ~46 closed by a stronger artifact

Amendment 1 closed the four named surfaces with screenshots. The residual
was the other ~46 changed declarations, which had no individual artifact.

`CC-CMD-2026-08-09-token-resolution-audit` closed it, and not by producing
46 screenshots — that was the wrong bar. Two reframes:

**The universal beats the instances.** A phantom is structurally detectable
at runtime, so the probe sweeps every rule of every stylesheet on the
deployed page. `outbox/token-resolution-probe-2026-08-09T15-20-46-079Z-manifest.json`,
`swVersion: "2026-08-09d"`:

```
l1.verdict PASS   rulesScanned 1891   regressions []   knownStopListed 11
l2.verdict PASS   74 selectors: 73 pass, 0 fail, 0 ruleNotFound, 1 not-in-this-engine
conclusive true
```

L1 was never told this doc's stop-list and reported exactly it — `--green`
x5, `--red` x2, `--orange` x2, `--accent` x2. Two independent methods
agreeing is worth more than either alone.

**Most of these fixes were provably invisible.** `body{color:var(--white)}`
(measured live as `rgb(242,242,250)`) and 41 of ~50 fixes target `--white`,
so those turned "inherits --white" into "explicitly --white" — identical
pixels. Demanding images for them was never going to prove anything.

**98, not higher**, because that audit's bound is now this one's: 8 changed
sites are inline styles in JS templates with no selector to probe, and that
blind spot contains at least one real defect — `_buildUFLEpaHTML()` emits
`color:var(--green)` / `var(--red)`, neither defined, so UFL EPA colour
coding renders good and bad plays identically. Its own CC-CMD:
`docs/CC-CMD-2026-08-09-ufl-epa-inline-token.md`.

Full detail: `outbox/cc-session-2026-08-09-token-resolution-audit.md`.
