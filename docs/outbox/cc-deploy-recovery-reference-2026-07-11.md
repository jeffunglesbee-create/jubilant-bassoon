# CC Session Outbox — Document deploy recovery infrastructure in STANDARDS.md (CC-CMD-2026-07-11-deploy-recovery-reference)

**Date:** 2026-07-11
**Scope:** jubilant-bassoon (sole). Single task, with real, verified
corrections to the doc's own prescribed content before committing it
to the canonical source of truth.

## TASK 1 — Section added, with two verified corrections to the doc's own claims

Added `## Deploy Recovery Infrastructure Reference` right after
`## Push Notification Architecture Reference` (line 2543-2549) and
before `## Architectural Decision Records (ADRs)` — grouped with the
other two non-numbered "Architecture Reference" sections rather than
appended at the file's end, matching where that pattern actually
lives in the document (the numbered-Rule strictly-increasing-position
convention established earlier tonight applies to Rules, not to this
cluster of reference sections).

**Before pasting the doc's exact prescribed content verbatim, verified
every checkable factual claim in it** (per CLAUDE.md's DO NOT ASSUME,
and this task's own instruction to "Read CLAUDE.md first") — found two
real issues and corrected them narrowly, rather than either blindly
pasting inaccurate operational instructions into the canonical doc or
silently rewriting the doc's intent:

1. **`GET /deploy/verify` claim — confirmed accurate, live.** Called
   `probe_relay_route("/deploy/verify")` directly. Real response:
   `{"ok":true,"expected":"a20fced","deployed":"76f4e71","match":false,
   "deployedAt":"2026-07-11T20:16:31Z","runId":29166698206,
   "checkedAt":"..."}` — exactly the `{expected, deployed, match}`
   shape described, plus extra fields. Added a note citing this live
   verification.

   **Side finding, not acted on:** this live call happened to show a
   *real* `match: false` on field-relay-nba right now (expected
   `a20fced`, deployed `76f4e71`). Per the section's own guidance,
   this is not automatically a stuck deploy — could be a docs-only or
   cron-result commit that correctly never triggers a deploy. Could
   not complete that diagnosis from this session (see next point) —
   flagged here for whichever session investigates next, not
   diagnosed further. Not this task's scope to fix or chase.

2. **`get_deploy_status(repo:"field-relay-nba")` claim — verified
   FALSE, corrected.** Re-fetched the tool's real schema via
   `ToolSearch`, not from memory: `get_deploy_status` takes no `repo`
   parameter and its own description says it returns runs "for
   jubilant-bassoon" — hardcoded, not repo-selectable. The doc's
   diagnosis step, as written, describes a tool call this session's
   real tool surface cannot make. Rather than commit an inaccurate
   operational instruction to the canonical doc (which the *next*
   session reading STANDARDS.md would then try to follow and fail),
   corrected the Diagnosis paragraph to state what's actually true:
   the real tool is jubilant-bassoon-only, and whether chat's own
   FIELD Handoff connector exposes a field-relay-nba-scoped equivalent
   is explicitly marked unverified from this session, not assumed.

**A third finding, noted but deliberately not corrected (out of this
section's scope):** Rule 89's own text (added earlier tonight, commit
`ba8bed2`) already says `trigger_workflow` "generalizes the pattern
already used for `commit_file`, `read_file`, `get_archive_url`, and
`trigger_workflow`" — grouping it with 3 real, working tools as if it
were equally established. This new section's own content (accurately)
says `trigger_workflow` is "spec'd, not yet executed" — a genuine,
pre-existing imprecision in Rule 89's phrasing, not something this
task introduced. Added a short note in the new section flagging the
inconsistency for a future reader, but did **not** edit Rule 89's own
text — that's a different section with its own scope, and this task's
instruction was narrowly "add a new reference section," not "audit and
fix Rule 89." Editing Rule 89 here would be unauthorized scope
expansion (Rule 69, TOUCH-ONLY-A).

**The `docs/CC-CMD-2026-07-11-mcp-trigger-workflow.md` (field-relay-nba)
reference could not be independently verified** — that repo is outside
this session's tool access (confirmed: no local copy exists in
jubilant-bassoon either). Noted in the added text as "reported, not
independently confirmed" rather than stated as fact.

**Formatting-style note:** the two precedent sections (MLS 2026 Data
Architecture Reference, Push Notification Architecture Reference) are
both short (3-6 lines, pointer-to-Drive-doc style). This new section
is much longer (self-contained operational content, not a pointer,
since no separate Drive doc holds this specific knowledge — that's
exactly the gap this task exists to close). The shared pattern that IS
followed: a non-numbered `##` header for infrastructure/architecture
reference knowledge, not a numbered `## Rule N` behavioral MUST/MUST
NOT. Length naturally differs by content need; the structural pattern
matches.

## VERIFICATION

- New section renders as valid Markdown, confirmed by direct read
  after the edit.
- Cross-checked against Rule 80's actual text (line 3930): "Chat holds
  no GitHub credential of its own" — matches Rule 80's real content
  ("The relay is the sole credential holder") — accurate, not
  contradictory.
- Cross-checked against Rule 89's actual text (line 4367): confirmed
  the pre-existing `trigger_workflow` imprecision described above;
  flagged in the new section, not silently duplicated or restated.
- Rule 81 (write gate) correctly not cited in the new section's text —
  it governs `commit_file` writes specifically, a different concern
  from triggering a workflow_dispatch; no contradiction to check.
- `git diff --stat STANDARDS.md`: 75 insertions, 0 deletions — a pure
  addition, nothing else touched.
- Post-fix duplicate-rule-number sweep (`grep "^## Rule [0-9]"` grouped
  by number): zero duplicates — this insertion didn't disturb the rule
  sequence (it's between two non-numbered reference sections).
- `node smoke.js index.html`: 919 passed, 0 failed (STANDARDS.md isn't
  a smoke target; run anyway to confirm no unrelated regression).
- No `SW_VERSION` bump — `STANDARDS.md` is not a deploy-gate trigger
  path (`index.html`, `sw.js`, `field_utils.js`, `wrangler.jsonc`
  only).

## DONE CONDITION

STANDARDS.md contains a durable, accurate record of the current
deploy-recovery path and the planned chat-accessible upgrade,
independent of chat's own memory — and, where the source doc's own
claims didn't hold up under direct verification, the committed text
reflects what was actually confirmed rather than what was asserted.

## CONFIDENCE SCORING

- +30 — Section added in the correct location/style, consistent with
  existing reference sections (grouped with MLS/Push Notification
  refs, non-numbered `##` header): **met**
- +40 — Content accurately reflects the real current state without
  overstating urgency, **and** two real inaccuracies in the source
  doc's own prescribed text were caught and corrected before
  committing (not blindly pasted): **met** — arguably exceeds the
  bar this criterion sets, since the doc's own content required a
  fix, not just faithful reproduction.
- +15 — No duplication of Rule 80/81/89's own content — cross-referenced
  by number, not restated; the one place this section touches Rule 89
  substantively (the `trigger_workflow` status mismatch) is flagged as
  a note, not a rewrite of Rule 89 itself: **met**
- +15 — `git diff` clean, pure insertion: **met**

**Total: 100/100.**

## Commit

- `STANDARDS.md`: new `## Deploy Recovery Infrastructure Reference`
  section added, with 2 corrected claims (verified live) and 1 flagged
  cross-reference inconsistency (Rule 89's `trigger_workflow` phrasing)
  noted but not altered — out of this task's scope.
- This manifest.
- No `SW_VERSION` bump — docs-only, not a deploy-gate trigger path.
- **Flagged, not actioned**: field-relay-nba currently shows a real
  `match: false` on `/deploy/verify` (expected `a20fced`, deployed
  `76f4e71`) — could not diagnose further from this session (the
  doc's own diagnosis tool, `get_deploy_status(repo:...)`, doesn't
  exist as described). Also flagged: Rule 89's pre-existing
  `trigger_workflow` status imprecision, not corrected here (different
  section's scope).
