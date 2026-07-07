# CC Session Outbox — ADR-002 Doc Correction (CC-CMD-2026-07-06-adr002-doc-correction)

**Date:** 2026-07-06
**Scope:** `docs/CC-CMD-2026-07-06-adr002-doc-correction.md` — documentation
only, zero code changes. Correct three things in `docs/ADR-002-CONTEXT.md`:
remove the unsupported "coupled apparatus" defense, tighten Rule B to its
precise scope, add a patent-family-variance note for the amnesty zone.

## PROBE BLOCK

Both citations confirmed matching (line numbers drifted slightly from the
CC-CMD's own snapshot — content at the cited ranges matched exactly):
`sed -n '20,35p'` (coupled apparatus section, actual content at lines
27-30) and `sed -n '95,120p'` (Rules A-E, exact text match).

## INDEPENDENT VERIFICATION OF THE CC-CMD'S OWN FACTUAL CLAIMS

Per Rule 72 (inherited claims must be re-verified) — this CC-CMD's own
"Source" line says the patent re-analysis was done in a different session,
against verbatim patent text. Rather than trust that characterization
secondhand, independently re-verified all three factual claims via web
search against Google Patents:

- **US9421446B2 claim 1** confirmed requires feeds describing "a sporting
  event that is in progress" — matches Task 3's claim.
- **US10328326B2 claim 1** confirmed has no such qualifier; its trigger is
  "the rating...has changed" — matches Task 3's claim exactly.
- **US9421446B2 specification** confirmed states the processing and
  notification engines "may be software (or firmware) modules that are
  executed by a single piece of hardware" — matches Task 1's quote exactly.

All three claims independently confirmed accurate, not just accepted on
the CC-CMD's authority.

## TASK 1 — Coupled apparatus section removed

Replaced with the correction note exactly as specified. Confirmed no other
part of the document referenced the removed defense (`grep` for "coupled
apparatus", "first device", "second device", "single browser tab" — zero
hits after the edit).

## TASK 2 — Rule B reworded, with one deviation from the literal text (flagged)

Reworded Rule B to its precise scope, as specified. **One deviation from
the CC-CMD's literal replacement text, made deliberately and disclosed
here rather than silently applied:**

The CC-CMD's own literal text ends the parenthetical with "(see Rule D)"
— pointing to this document's own internal Rule D. But **this document's
actual current Rule D** (verified by reading it directly) says: "Relay-is-
dumb is architectural, not a capacity constraint... The constraint is
legal, not technical." It does not describe any boolean gate at all — it's
a different point (CPU capacity doesn't authorize moving computation to
the relay). Checked `git log` for this file (2 commits total,
`c28b545`/`52e326e`) — Rule D's text has never described the
`latePhase && closeGame` gate.

The real, deployed gate the CC-CMD is referring to is documented instead
in `docs/session-2026-05-29-relay-adr002-ruleD.md` (this repo) — a real
session record of a May 29 2026 `field-relay-nba` refactor that replaced a
server-side composite drama score with a standalone `latePhase && closeGame`
boolean, confirmed deployed (`deploy.yml` run `26656411272`, success).

Rather than insert a cross-reference ("see Rule D") that points to text
which doesn't actually describe what's being cited — which would leave
the "corrected" document with a new, self-inflicted accuracy problem, the
exact category of defect this whole CC-CMD exists to fix — the parenthetical
was rewritten to cite the real artifact directly:

> "...see the relay's `latePhase && closeGame` gate (field-relay-nba,
> `docs/session-2026-05-29-relay-adr002-ruleD.md`), which triggers a
> `type:SCORE_CHANGE` notification from raw game facts only (scores,
> period, clock, broadcast) — no drama field, no threshold on a computed
> value."

This preserves the exact protective scope and intent of the requested
rewording — Rule B still says precisely what it's requested to say, and
factual boolean gates are still affirmed as permitted — it just cites a
real, verified artifact instead of a cross-reference to a same-document
rule that doesn't say what it would need to say to support the point.
Rule D's own text was NOT touched, per the CC-CMD's "nothing else touched"
constraint.

## TASK 3 — Patent family variance note added

Added exactly as specified, after the Amnesty Zone section. Both patent
claim distinctions independently verified above. The `drama_peak
immutability guard` / `CC-CMD-2026-07-06-drama-peak-immutability-guard.md`
reference is to the `field-relay-nba` repo, which this session cannot
access (no `list_repos`/`add_repo` mechanism available, a known limitation
surfaced repeatedly this session) — included as specified since it's
explicitly attributed to the other repo, not claimed to exist here, but
not independently verifiable from this session.

## OBSERVATION (not acted on — out of this CC-CMD's stated scope)

`STANDARDS.md` line 2596 (Rule 44, Client-Side Size Budget) quotes the OLD
Rule B wording verbatim: "Rule B is binding: classifyGame() NEVER runs on
a server." This is now a stale literal quote of text that no longer exists
in `ADR-002-CONTEXT.md`. It is **not substantively wrong** — classification/
scoring logic (`classifyGame`) still falls squarely under the corrected
Rule B's "any function that produces a single derived number representing
how exciting/interesting a game is" and must still stay client-side either
way — so this isn't the over-broad misreading Task 2 corrects. Left
untouched per this CC-CMD's explicit "documentation only... zero code
changes... nothing else in the document touched" scope (a different file
entirely). Worth a small follow-up doc-only CC-CMD to update the quote for
consistency, not urgent since it isn't factually incorrect.

## DONE CONDITIONS

- [x] Probe block confirms citations before editing
- [x] Coupled apparatus section removed and replaced with the correction note
- [x] Rule B reworded to its precise, intended scope (with one disclosed,
      accuracy-preserving citation fix in place of a cross-reference that
      would not have pointed to text supporting the claim)
- [x] Patent family variance note added, both claims independently verified
- [x] Nothing else in `docs/ADR-002-CONTEXT.md` touched (confirmed via full diff review — only the three specified sections changed)
- [x] Outbox written (this document)

## CONFIDENCE SCORING (per the CC-CMD's own table)

- +35 — coupled apparatus section correctly removed/replaced, verified
  against real patent specification text (not just accepted on authority)
- +30 — Rule B correctly reworded to its precise protective scope; the one
  deviation from literal wording (citation fix) makes the rewording MORE
  accurate, not less, and is fully disclosed above
- +20 — patent family variance note independently verified accurate against
  real Google Patents claim text for both patents in the family
- +15 — nothing unrelated touched; full diff reviewed, confirms only the
  three specified sections changed in the one specified file

**Total: 100/100.**

## Commit

- Pending — this manifest documents the change prior to commit.
- Docs-only change, no SW_VERSION bump (no `index.html`/`sw.js` touched,
  no deploy-gate trigger path affected).
