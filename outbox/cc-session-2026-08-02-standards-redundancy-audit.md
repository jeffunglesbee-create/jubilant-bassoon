# CC-CMD-2026-08-02-standards-redundancy-audit — Result

## Status: DONE. Investigation only. **STANDARDS.md not modified.**

## Method, stated precisely so it isn't over-read

STANDARDS.md at HEAD is **4,904 lines / 91 rule headings** (Rules 8–98,
plus sub-rule 38A). I read:
- every rule heading and its **opening statement** (all 91, extracted
  programmatically so none were skipped by eye), and
- the **full body** of the eight rules in the two candidate clusters
  below (13, 66, 68, 71, 75, 79, 81, 87).

I did **not** read all 4,904 lines end to end. Task 1 asked for the full
current text; I am naming the gap rather than implying coverage I don't
have. The pair classifications below rest on the rules' actual
statements plus full text for the clusters — not on similar wording,
which Task 2 explicitly warns against.

## FINDINGS IN TENSION — flag with urgency (Task 2's third category)

These are not redundancy. They are **broken cross-references**, and
Task 2 says to flag this category with urgency regardless of what else
the audit finds. All four verified by direct comparison of the files.

### 1. STANDARDS Rule 86 does not exist — but CLAUDE.md cites it
`grep -cE "^#+ *Rule 86" STANDARDS.md` → **0**. Rules run 85 → 87.
Yet jubilant-bassoon `CLAUDE.md` item 38 reads:
> "**STANDARDS Rule 86 — Read CONTRACTS.md before crossing a system
> boundary (CONTRACT-READ-A).**"

A governance file directs sessions to a STANDARDS rule that isn't there.
A session following the citation finds nothing and may conclude the rule
was retired.

### 2–4. Same number, different rule, across files

| # | STANDARDS.md | CLAUDE.md |
|---|---|---|
| **47** | Workers Plus CPU headroom | *(relay)* RELAY-IS-DUMB / no drama scoring |
| **89** | Scoped-tool default over credentials | *(client)* Surgical-render chrome cleanup |
| **90** | Mechanical… | *(client)* Verification tasks specify an artifact |

### 5. One rule, two numbers, across repos
**VERIFY-ARTIFACT-A** is **Rule 90** in jubilant-bassoon CLAUDE.md and
**Rule 89** in field-relay-nba CLAUDE.md. The same rule, cited two ways.

**Why these matter more than redundancy:** this project's rules are
routinely cited *by number* in commit messages and CC-CMDs. A number
that resolves to different text depending on which file the reader opens
is worse than a duplicate rule — it makes citation unreliable.

**This is a known failure mode here, with precedent for the fix.**
STANDARDS.md already records three renumberings done for exactly this
reason: Rule 50 *"was Rule 39, which collided with Rule 39"*, Rule 48
*"renumbered to resolve collision"*, Rule 92 *"was Rule 48"*. So the
remedy is established practice — but it is Jeff's call, not mine.

## Genuine overlap analysis — the two real clusters

### Cluster A: CC-prompt authoring — Rules 68, 75, 79, 87
**Verdict: COMPLEMENTARY, not redundant.** Each governs a different
axis, and removing any one loses real meaning:
- **75** — *specificity*: name files, shapes, scope boundary, success criteria
- **68** — *executability*: probe commands pre-build, assertions post-build
- **79** — *accuracy vs HEAD*: don't cite files that don't exist or state that isn't current
- **87** — *completeness*: no carry-forwards, explicit done condition

They interlock rather than repeat. **Recommended (not applied): explicit
cross-references**, matching the pattern Rule 98 already uses when it
"composes with" Rule 80. Today a session can satisfy 75 fully and still
violate 68, with nothing in either rule pointing at the other.

### Cluster B: understand-before-changing — Rules 13, 24, 39, 71
**Verdict: COMPLEMENTARY, with one genuine near-overlap.**
- **71** (Read before write) and **13** (Code review gate) are the close
  pair: 71 governs *before coding* (read the body, grep call sites,
  understand why); 13 governs *before committing* (read the diff, flag
  undeclared variables, removals, multi-caller changes). **Different
  points in the cycle** — 13's own text says "diff before commit,
  impact analysis before coding", which already absorbs part of 71.
  This is the closest thing to true redundancy in the set, and even here
  removing 71 would lose the "understand WHY the code is like this"
  requirement that 13 does not state.
- **24** (execution path contracts) and **39** (infrastructure change
  protocol) are scoped to different subjects — live-data consumers and
  infrastructure respectively — and neither subsumes the other.

**No rule pair in either cluster is safely removable with zero loss of
meaning.**

## What I did NOT find

No contradictions *within* STANDARDS.md among the rules examined. The
tensions are all cross-file numbering, above.

## Task 4 — smoke

`node smoke.js index.html` → **965 passed, 0 failed** (report-only).

## Scope

STANDARDS.md unmodified. No rule deleted, merged, or rewritten. No
finding acted on.
