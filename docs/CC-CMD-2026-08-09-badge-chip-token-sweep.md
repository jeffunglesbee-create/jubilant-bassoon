# CC-CMD-2026-08-09-badge-chip-token-sweep

**Repo:** jubilant-bassoon — commit directly to `main`.

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-09-badge-chip-token-sweep.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## Why this exists

`CC-CMD-2026-08-09-park-badge-token-compliance` Task 1 asked for the real
extent of raw hex in badge/chip CSS rather than assuming the two known
rules were the only offenders. **They were not.** 20+ rules carry raw hex:

```
.anti-hype-badge            .attn-chip.urgency-high/-med/-low
.brief-state-badge.updating .conflict-chip / -count
.crew-chip                  .drama-dial-chip
.fan-out-chip               .field-chip--
.field-pick-badge           .free-badge / .free-badge.free-cable
.free-tonight-badge         .gotd-badge.espn-gotd / .peacock-gotd
.importance-badge.clinch / .elimination / .playoff-impl      ...and more
```

Only the four `.mlb-park-badge` rules were fixed, because only those had a
decided semantic mapping. The rest are untouched **by design**, not by
oversight.

## The trap this CC-CMD exists to avoid

A mechanical hex→nearest-token substitution would satisfy every grep and
still violate Rule 37, because `COLOUR-SYS-A` is about **meaning, not
appearance**. The park badge is the worked example: its `#22c55e` mapped
"cleanly" to `--sport-epl`, and that substitution would have been *worse*
than the hex — it would have encoded "English football" onto a baseball
badge in compliant-looking form.

**The real fix there was not tokenising the hex. It was recognising the
badge is not a priority signal and collapsing four hues to one.**

## Task 1 — classify before touching anything

For each rule, answer one question first: **is this a priority signal, an
access/cost signal, a caution signal, a discovery signal, or contextual
information?** That answer picks the token. The current hex must NOT.

**Artifact:** a table — rule, current hex, semantic class, proposed token,
and whether the current colour is *already correct by accident*.

Some will be genuinely correct already: `.free-badge` using teal is right,
because teal IS free access. Say so rather than churning them.

## Task 2 — flag the ones that need a decision, do not decide alone

Any rule where no existing token fits is a **Rule 37 governance change**
(new token requires meaning + non-confusion + no conflict + sign-off).
Collect these and STOP on them. Do not pick the nearest colour.

Expect collapse candidates like the park badge: families using several
hues to encode a non-priority dimension, where the text already carries
the distinction.

## Task 3 — apply only the decided ones, in single-concern commits

Group by badge family, one commit per family, so any single change is
independently revertable.

## Task 4 — artifacts

1. `node smoke.js index.html` → 0 failed, including COLOUR-SYS-A's own
   assertions (`--drama-must`/`--drama-watch`/`--drama-low` present, no
   raw drama hex).
2. Before/after raw-hex counts per family touched.
3. Playwright CI-as-proxy screenshot per touched family, proving no
   unintended visual regression.
4. SW_VERSION bumped in `src/legacy/field.js` AND `sw.js` using the **ET**
   date (Rule 4 — a UTC bump fails smoke A515; this really happened on
   2026-08-08), then `node scripts/sync-source.mjs`.

## Explicitly NOT in scope
- Do not re-touch `.mlb-park-badge` — already done.
- Do not define new tokens without sign-off.
- Do not change markup or badge structure — colour only.

## Outbox
`outbox/cc-session-2026-08-09-badge-chip-token-sweep.md`
