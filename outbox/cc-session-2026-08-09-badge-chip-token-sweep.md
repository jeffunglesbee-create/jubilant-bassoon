# CC-CMD-2026-08-09-badge-chip-token-sweep — Result

## Status: Tasks 1, 2 and 4 DONE. Task 3 applied 15 of 55 rules — the ones Rule 37's own text decides. **Confidence: 93 — below the 95 gate, disclosed below.**

SW_VERSION `2026-08-09a` -> `2026-08-09b` (ET). Smoke 965/0 before, 965/0
after every commit. Deploy run `31316318595` succeeded.

## Task 1 — the classification, measured

The CC-CMD said "20+ rules carry raw hex." The real count, parsed from
the CSS rather than eyeballed:

```
badge/chip hex occurrences: raw=61  var()-fallback=14
distinct raw hues: 35
```

**35 distinct hues across a layer that encodes about seven meanings.**

Two structural facts changed how this was executed, and neither is in
the CC-CMD:

**(a) Rule 37 decides far more of this than "meaning, not appearance"
implies.** Its last paragraph reads: *"Sport identity colors
(--sport-nba, --sport-nhl, etc.) are used exclusively for card left
border accents and section headers. Never for badges, chips, or text."*
That converts a whole class from judgment call into named violation. Ten
of the rules I changed were painting a badge with an exact sport-token
hex.

**(b) Same hue, different meanings — measured, not asserted:**

```
#4ade80 (--sport-mlb)  x7  badge-incl, chip-auth.auth-free, chip-free-badge,
                           chip-have, importance-badge.clinch, ts-badge.ts-clinch,
                           viewer-intel-chip.vic-team
#fbbf24                x6  chip-cost, field-pick-badge, importance-badge.series-deciding,
                           mlb-chip-drama.d-crunch, ts-badge.ts-series_deciding, ww-tier-badge
#f87171                x4  importance-badge.elimination, mlb-chip-drama.d-fire,
                           ts-badge.ts-elimination, mlb-ump-badge
#f59e0b                x3  brief-state-badge.updating, field-chip--CAUTION, field-chip--WATCH
```

That last row is the headline. **`.field-chip--WATCH` and
`.field-chip--CAUTION` were the identical `#f59e0b`** — two of the five
reserved COLOUR-SYS-A meanings rendered indistinguishably. And
`.field-chip--MUST` was `#ef4444`, the hue Rule 37 reserves for
"elimination urgency ONLY", while `--drama-must` is gold. The tier
classes are named for the reserved meanings and four of six contradicted
the token of the same name.

## Task 3 — what was applied, and why exactly these

Five commits, one family each, each independently revertable.

| Family | Rules | From | To | Decided by |
|---|---|---|---|---|
| `.field-chip--*` | 6 | `#ef4444` `#f59e0b` `#2dd4bf` `#f59e0b` `#888` `#60a5fa` | `--drama-must` `--drama-watch` `--access-free` `--caution` `--drama-low` `--drama-watch` | tier name == reserved meaning |
| free/included access | 4 | `#16a34a` `#4ade80` x3 | `--access-free` | teal reserved for free access; all four used a sport green |
| elimination / deciding | 4 | `#f87171` `#fbbf24` | `--angle-elim` `--angle-deciding` | tokens named for exactly these states |
| rivalry | 1 | `#f97316` (= `--sport-nba`) | `--angle-rivalry` | violet reserved for "history, rivalry, weight" |
| `fieldChip` comment | — | — | — | direct dependency of commit 1 |

**Raw hex in badge/chip CSS: 61 -> 46.**

Backgrounds and borders moved with their text. Several rules carried the
same hue three times — `#16a34a` text over `rgba(22,163,74,.12)` and
`rgba(22,163,74,.3)` — so tokenising only `color:` would have split each
rule across two colours. They use `color-mix`, the pattern
`.mlb-park-badge` established here.

`WATCH` and `INFO` now share blue. That is Rule 37's own grouping — it
reserves one blue for "worth it, editorial depth, informational" — and
the chip text carries the distinction. Same reasoning that collapsed the
four park-badge hues, applied deliberately rather than by accident.

## Task 2 — the stop-list, not decided alone

These have no reserved meaning in Rule 37. Picking the nearest colour is
exactly the trap this CC-CMD was written to avoid, so they are handed
back rather than guessed:

- **clinch** (`.importance-badge.clinch`, `.ts-badge.ts-clinch`) — green
  has no reserved meaning; both currently use `--sport-mlb`'s hex.
- **playoff-implication** (`#a5b4fc`) — no token.
- **subscription / paid access** (`.chip-auth.auth-sub`,
  `.gotd-badge.peacock-gotd`, both `#00ffcc`) — Rule 37 reserves teal for
  *free* access and has no paid counterpart. A new token is a governance
  change.
- **`.free-badge` / `.chip-free-badge`** — green *background* with light
  or dark text. Swapping the hue is a contrast decision, not a
  substitution. Deliberately excluded from the access family.
- **drama ladders** (`.mlb-chip-drama.d-fire/-crunch/-warm`,
  `.drama-dial-chip`, `.viewer-intel-chip.*`, `.attn-chip.urgency-*`) —
  these look like collapse candidates in the park-badge sense, but they
  encode a priority dimension, which is the one dimension where hue is
  load-bearing. Needs a decision, not a sweep.
- **chrome surfaces** (`.mlb-chip`, `.stream-chip .chip-tip`) — `#1a1a2e`
  vs `--card2` `#181830`. Near-misses, so any substitution shifts
  appearance for no semantic gain.

## Task 4 — artifacts

1. **Smoke:** 965 passed, 0 failed, at every commit. No assertion pins
   these hexes (checked before editing, `smoke.js:5651-5658` pins the
   token *definitions*, which are unchanged).
2. **Raw-hex count:** 61 -> 46 badge/chip occurrences.
3. **Live render:** `badge_token_sweep_probe.js` +
   `.github/workflows/badge-token-sweep-probe.yml`, new. Manifest:
   `outbox/badge-token-sweep-probe-2026-08-09T13-50-42-016Z-manifest.json`,
   `swVersion: "2026-08-09b"` — i.e. it measured the deployed sweep, not a
   stale build.

   The probe does **not** hardcode expected colours. It reads each token
   off `document.documentElement` at runtime and compares. A hardcoded
   `rgb()` would prove only that I typed the same number twice.

   ```
   {"pass":1,"fail":0,"notRendered":14,"total":15}
   PASS  .chip-have  n=17  rgb(45, 212, 191)  want rgb(45, 212, 191)
   ```

## The probe's most important output was the 14 it could NOT prove

Investigating why, rather than accepting "August slate" as an
explanation, found two things reading the CSS could not:

- **`.ts-badge.*` and `.free-tonight-badge` are dead CSS.** Zero
  emitters in `field.js`, including no dynamic construction of the kind
  `.field-chip--*` uses at `field.js:2218`. Three of the rules I
  tokenised were **inert** — cosmetically correct, functionally nothing.
  The same trap as the four `.mlb-park-badge` variants, which were dead
  from the day they were written.
- **`.field-chip--*` is a Phase-1 primitive not yet wired in.** Its own
  comment says so. So those six rules are staged, not dead — and that
  comment recorded the *pre-sweep* mapping, citing `--sport-nhl`
  approvingly, which is the violation. Corrected in its own commit.

The remaining NOT-RENDERED rows (`importance-badge.*`, `.rival-badge`,
`.chip-auth.auth-free`, `.badge-incl`) are live paths with no qualifying
game on an August slate. They are recorded as NOT-RENDERED, never folded
into the pass count — the manifest's `conclusive` flag exists so a run
where nothing rendered cannot read as green.

## Follow-ups written, not carried forward (Rule 87)

- `docs/CC-CMD-2026-08-09-dead-badge-css-removal.md` — delete the six
  dead rules. Out of this CC-CMD's "colour only, no structure" scope.
- `docs/CC-CMD-2026-08-09-phantom-css-token-audit.md` — `index.html`
  references four CSS variables that are **never defined**:
  `--text-muted` (13 uses), `--fg` (12), `--amber` (3), `--text-dim` (2).
  Every one silently renders its fallback hex forever. They read as
  tokenised and are not. Repo-wide, so out of badge/chip scope.

## One process failure of my own

The rivalry edit initially landed inside the elimination commit — I
applied both in one batch and staged them together, breaking Rule 5 in
the same session that cited it. Caught at `git log`, split with a
`reset --mixed` into two clean commits rather than left with a note.

## Confidence gate

**93 — below the 95 gate.**

The 15 applied rules are each decided by Rule 37's own text, not by
appearance, and smoke is clean at every commit. What holds this under 95
is verification coverage, and it would be a Rule 77 failure to score the
analysis and call it the sweep: **1 of 15 changed rules is proven to
render correctly on the live deployment.** Three more are proven inert.
The other eleven are unproven — correct by static reading, which is
precisely the standard that let four dead park-badge rules pass review
for weeks.

The honest reading is that this executed the decidable third of a
55-rule surface and produced the classification the rest needs. The
CC-CMD's own Task 2 says to stop on the undecidable ones, and that is
what the stop-list is; but it does not license calling a partial sweep
complete.

**What would close it to 95+:** re-dispatch
`badge-token-sweep-probe.yml` on a date with playoff or rivalry fixtures
in the slate, so `.importance-badge.*` and `.rival-badge` render and
their rows move from NOT-RENDERED to PASS. The workflow and the
assertions already exist; only the fixture list is missing. The
`.field-chip--*` rows cannot pass until Phase 2 wires the primitive in,
and that is a genuine block, not a deferral.
