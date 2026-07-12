# Claude Code Command — Document UI-displayed hash unreliability, establish the actual fix

**Date:** 2026-07-11
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Scope:** Two confirmed cases tonight where Claude Code's own "Done (HASH)"/"Fixed and pushed (HASH)" status header displayed a 7-character hex string that does not match the real git commit hash at all — zero digit overlap in either case (`c6f08ba` → real commit `3ab4715`, `369a061` → real commit `ec702dbc`). The mechanism is unverifiable from outside Claude Code's own UI rendering — speculating about it further would be guessing, not novel thinking. The actionable fix is different: don't try to explain or trust the display, make hash reporting structurally independent of it.

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md first.

Write findings to outbox/cc-ui-hash-unreliability-2026-07-11.md.

## TASK 1 — Add a short reference note to STANDARDS.md

Following the same pattern as the existing "Deploy Recovery Infrastructure Reference" section (a non-numbered `##` reference, not a behavioral Rule), add:

```
## Claude Code UI-Displayed Hash Reliability

Confirmed 2026-07-11, two independent cases: the commit hash shown in
Claude Code's own "Done (...)" / "Fixed and pushed (...)" status
header does not reliably match the actual git commit hash. Both
observed cases had zero digit overlap between the displayed and real
hash (`c6f08ba` → real `3ab4715`; `369a061` → real `ec702dbc`) — not a
truncation or off-by-one, something structurally different from the
real commit SHA.

The mechanism is not verifiable from outside Claude Code's own
rendering — do not assume a specific cause (staged-tree pre-hash,
session-internal ID, or otherwise) without being able to test it
directly. Treat as an unexplained, confirmed-real UI unreliability.

**The fix is not "remember not to trust it."** That's a
memory-dependent fallback, same failure shape as every other "a
session should remember" pattern this project has already moved away
from (see Rule 90's own reasoning). The actual fix: any time a
commit hash needs to be reported, cited, or acted on (verification,
cross-referencing, codex registration), it must come from an actual
`git log` / `git show` / `git rev-parse HEAD` query — never quoted
directly from a session's own "Done (...)" status text. This applies
whether the session reporting the hash is Claude Code or chat.
```

## TASK 2 — Confirm no other STANDARDS.md content references a hash without this caveat

Grep for any other place in STANDARDS.md that might cite a specific "Done (HASH)"-style report as authoritative without independent verification — report what's found, don't assume there's nothing.

## VERIFICATION

- `git diff` shows only this insertion.
- Confirm formatting matches the existing reference-section style.

## DONE CONDITION

STANDARDS.md documents the confirmed hash-display unreliability and the actual structural fix (always verify via git, never quote the UI's self-report), without speculating about an unverifiable mechanism. Confidence ≥ 95.

**Confidence scoring:**
- Section added correctly, consistent style, accurate to the two confirmed cases (60 pts)
- Does not speculate about the unverifiable mechanism as if it were confirmed (25 pts)
- TASK 2 sweep performed (15 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.