# CC Session Outbox — Add Rule 97 (CI-AS-INVARIANT-A) to STANDARDS.md

**Date:** 2026-07-12
**Scope:** jubilant-bassoon (sole). Executing
`docs/CC-CMD-2026-07-12-rule97-ci-as-invariant.md` — closes TASK 4 of
field-relay-nba's `completion-field-parity` CC-CMD, which that session
confirmed it had no write path to complete itself.

## A misleading commit message caught before trusting it

The top commit on `main` at pull time, `89707ef`, is titled *"feat(cc-cmd):
add Rule 97 CI-AS-INVARIANT-A to STANDARDS.md"* — reads as if this work
were already done. Checked the actual diff before trusting the message
(this session's own established discipline: verify the diff, not the
description): `git show --stat 89707ef` shows it touches exactly one
file — `docs/CC-CMD-2026-07-12-rule97-ci-as-invariant.md` (96 insertions,
the CC-CMD spec doc itself). **`STANDARDS.md` was never touched by that
commit.** The commit message describes the CC-CMD's intended outcome, not
what the commit actually did.

## PROBE — re-confirmed the real next rule number from fresh HEAD

Per the CC-CMD's own instruction (and Rule 79 — CC prompts resolve
against current HEAD, don't trust a stale assumption): ran the probe
against a freshly-`git pull`ed HEAD before writing anything:

```
grep -oE '^## Rule [0-9]+' STANDARDS.md | grep -oE '[0-9]+' | sort -n | tail -3
→ 94, 95, 96
```

Highest existing rule is genuinely **96**; **97** is the correct next
number, matching the CC-CMD's own probe expectation. Combined with the
misleading-commit-message finding above: this CC-CMD's work was
genuinely still pending, not already done under a different guise.

## TASK 1 — Rule inserted verbatim

Appended immediately after Rule 96's content (the true end of the file,
line 4730 pre-edit), matching the exact spacing/heading convention
already used between Rules 89-96 (blank line, `## Rule N — Title
(ID-CODE)` heading, blank line, body — no `---` separator between
consecutive rules; confirmed by inspecting the Rule 95→96 boundary,
which uses the identical pattern). Rule text inserted exactly as
specified in the CC-CMD — this session's job was correct placement, not
authoring or editing the rule's content (it was drafted and quantified
against real data by the field-relay-nba session that originated it).

## TASK 2 — Verification

- **Rule landed at the correct number**: re-ran the probe after the
  edit — `92, 93, 94, 95, 96, 97` — 97 is now genuinely the highest,
  confirmed post-edit, not assumed from the pre-edit check alone.
- **Markdown structure intact**: spot-checked Rule 96's own content
  (unmodified, reads cleanly through to its final line) and Rule 97's
  own content (headings, bold spans, backtick code references all
  well-formed). Rule 97 is now the last rule in the file, so there is
  no "rule after" to spot-check — the file ends cleanly at its closing
  paragraph (`wc -l` confirms a clean 4779-line file, up from 4731).

## DONE CONDITION

Rule 97 (CI-AS-INVARIANT-A) is present in `STANDARDS.md` at the correct,
freshly-re-confirmed next-available number, formatted identically to
Rules 89-96, with the rule text unmodified from the CC-CMD's own
specification. TASK 4 of the originating `completion-field-parity`
CC-CMD is closed for real this time — a real STANDARDS.md diff exists,
not just a commit message claiming one does.

## Commit

- `STANDARDS.md`: Rule 97 added, ~48 lines, no other content touched.
- This manifest.
- **Not touched**: `index.html`, `sw.js`, `smoke.js` — this CC-CMD's
  scope was `STANDARDS.md` only (no `SW_VERSION` bump required; this
  isn't a deploy-gate trigger path).
