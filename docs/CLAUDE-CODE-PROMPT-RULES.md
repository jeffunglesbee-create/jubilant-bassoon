# Claude Code Prompt Architecture — Effectiveness Rules

## Why This Document Exists
Three consecutive attempts to fix ambient panel scrolling on iOS Safari
passed smoke tests but failed on real hardware. The ADR-002 refactor
(16 commits, zero regressions) succeeded because its prompt architecture
was fundamentally different. This document codifies what makes prompts
succeed vs fail.

## When Prompts Succeed
Claude Code excels at tasks where correctness is verifiable from the
code itself: refactoring patterns, adding tokens, renaming variables,
restructuring logic. The ADR-002 prompt worked because "replace composite
score with named tier" is provable by reading the code. Smoke assertions
can confirm it.

## When Prompts Fail
Claude Code struggles with hardware-dependent behavior where correctness
requires a real device. "Ambient panel scrolls on iPad Safari" cannot be
verified by checking CSS properties exist. Three fixes added correct-looking
CSS; all three failed on real hardware because iOS Safari has undocumented
quirks with position:fixed + overflow scroll.

---

## The Five Rules

### Rule 1: Failed-Attempts Registry
Every spec doc MUST have a "What Has Been Tried and Failed" section.
Claude Code reads this before proposing a fix. Without it, Claude Code
will repeat the same approaches.

Format:
```
## Failed Approaches (do NOT repeat these)
1. Attempt: [what was done]
   Result: [what happened on real hardware]
   Why it failed: [root cause if known]
```

### Rule 2: Explain-Before-Implement
The prompt MUST include this instruction:
"Before writing any code, explain in 2-3 sentences why your approach
will succeed where previous attempts failed. Write your reasoning to
outbox/[topic]-diagnosis.md. If you cannot articulate the difference
from prior failed attempts, research first."

This prevents "try and hope" cycles. If Claude Code can't explain WHY
its approach is different, it shouldn't implement it.

### Rule 3: Acceptance Criteria, Not Implementation Instructions
BAD: "Add -webkit-overflow-scrolling:touch to the ambient panel"
GOOD: "The ambient panel must be independently scrollable on iOS Safari 17+
when content exceeds the viewport height. Three CSS-only approaches have
failed. Research a proven structural pattern."

Tell Claude Code WHAT success looks like. Let it figure out HOW.
Include the constraint that previous approaches failed.

### Rule 4: Separate Diagnosis from Implementation
Two-prompt pattern for hardware-dependent bugs:

**Prompt 1 (diagnosis only):**
"Diagnose why [X] doesn't work. List every relevant CSS property and
its computed effect. List every JS event handler that could interfere.
Write your diagnosis to outbox/[topic]-diagnosis.md. Do NOT change
any code yet."

Review the diagnosis in the chat surface. Then:

**Prompt 2 (authorized implementation):**
"Based on your diagnosis, implement the fix. [specific guidance from
the reviewed diagnosis]."

### Rule 5: Playwright as Acceptance Gate
For any fix that depends on viewport or device behavior:
"Your fix is not complete until you write a Playwright test assertion
that validates it. The test should be added to tests/viewport-all.spec.js.
If you cannot run Playwright in this environment, explain why you believe
the test will pass on real hardware and flag it for CI verification."

### Rule 6: No Structural Escalation Without Authorization
If a fix requires changing how the PAGE is laid out (not just properties
on one element), STOP. Do not implement. Write the proposal to outbox/
and explain:
- What structural change you want to make
- What existing architecture it replaces
- What other elements depend on the current architecture
- What could break

Examples of structural changes that require authorization:
- Changing position:fixed to position:sticky or CSS Grid
- Adding display:grid to body or any page-level container
- Changing the column layout paradigm (margin-right → grid tracks)
- Moving elements between DOM containers
- Changing how body-level scrolling works

Examples of changes that do NOT require authorization:
- Adding/modifying CSS properties on a single element
- Adding a wrapper div inside an existing container
- Changing colors, fonts, spacing, borders
- Adding event listeners
- Fixing data pipeline logic

The ambient panel CSS Grid escalation (commit 9ce7ef2) is the case study:
it replaced position:fixed with a body-level CSS Grid, didn't zero out
the margin-right:390px rules that the fixed layout required, and broke
the panel visibility on real hardware. It was reverted.

---

## Prompt Template for Hardware-Dependent Bugs

```
git pull. Read docs/[SPEC-FILE].md.

CONTEXT: [Brief description of the bug and its impact]

FAILED APPROACHES (do NOT repeat):
1. [What was tried] → [Why it failed on real hardware]
2. [What was tried] → [Why it failed on real hardware]

ACCEPTANCE CRITERIA:
[What success looks like on real hardware — observable behavior, not CSS properties]

INSTRUCTIONS:
1. Before writing any code, explain in 2-3 sentences why your approach
   will succeed where the failed approaches did not. Write your reasoning
   to outbox/[topic]-diagnosis.md.
2. If your reasoning relies on a CSS property or pattern, cite a known
   production site, UI library, or MDN documentation that confirms it
   works on iOS Safari 17+ with position:fixed elements.
3. Implement the fix.
4. Write a Playwright test assertion for tests/viewport-all.spec.js
   that validates the fix.
5. Run smoke. Push when complete.
```

---

## Classification: When to Use Which Pattern

**Standard prompt (implementation instructions):**
Use for: token additions, refactors, data pipeline changes, prompt engineering,
smoke assertion additions, file reorganization.
Why: correctness verifiable from code.

**Diagnosis-first prompt (this template):**
Use for: CSS viewport bugs, touch/scroll behavior, iOS Safari quirks,
animation/transition issues, layout shift debugging.
Why: correctness requires real device; must prevent repeat failures.

**Acceptance-criteria prompt (open-ended):**
Use for: new features where multiple implementation paths exist.
Why: Claude Code may find a better approach than what we'd prescribe.

---

## STANDARDS.md Rules That Apply Here

These rules from STANDARDS.md are BINDING on Claude Code. They are
cross-referenced in CLAUDE.md rules 10-16. Read the full text in
STANDARDS.md if you need the rationale.

| Rule | Name | How it prevents failure |
|------|------|------------------------|
| 7 | One concern per commit | Each commit independently revertable |
| 13 | Code review gate | Diff before commit catches missing dependencies (margin-right) |
| 24 | Execution path contracts | Map re-render frequency before touching live-data renderers |
| 29 | Viewport Style Guide | Check spec before inventing breakpoint behavior |
| 39 | Diagnose before touching | Write diagnostic before modifying infrastructure/layout |
| 42 | Five-minute novel thinking | Stop iterating same approach; look at what system literally shows |
| 48 | DO NOT ASSUME | Verify before diagnosing; five assumption classes |

**Rule 13 in practice:** Before any commit, run `git diff --staged` and answer:
- Does this change touch a function called from multiple places?
- What elements depend on the CSS property I'm changing?
- List every caller of the function I'm modifying.

**Rule 24 in practice:** Before changing a render function, answer:
- How often does this function fire? (once? every 15s? on resize?)
- What triggers it? (user action? timer? event?)
- Does it replace innerHTML? (if yes, any DOM state is destroyed)

**Rule 42 in practice:** After 3 failed attempts at the same class of fix:
- STOP. Do not try a 4th variation.
- State what the system is literally doing (not what you expect).
- Check if the problem is in a different layer (JS, not CSS; timer, not layout).

---

## Rule 87 — CC-CMDs must be self-completing (SELF-COMPLETE-A)

Every CC-CMD must be self-completing. Follow-ups, post-deploy verifications,
and carry-forwards are spec failures — they mean the done condition was not
defined upfront or tasks were intentionally deferred.

**Required in every CC-CMD:**

1. **Probe block first.** Read every constant, URL, function name, and line
   reference from current HEAD before writing any code. Never write from
   memory — probe it. The probe block populates the spec.

2. **Explicit done condition.** Define what done looks like as a verifiable
   probe output: a specific endpoint returning a specific value, a D1 count
   reaching zero, a smoke assertion passing. "Deploy succeeded" is not a
   done condition.

3. **Execution inside the session.** If the task requires running something
   after deploy (backfill loop, verification curl, D1 query), that execution
   is a numbered task in this CC-CMD — not a carry-forward.

4. **No deferred work without a second CC-CMD.** If work is genuinely out of
   scope, write a second CC-CMD before closing the first. "Worth a separate
   session" is a carry-forward and a spec failure.

5. **Outbox manifest is the last task.** Covers: commit hash, deploy run ID,
   done-condition probe output, any genuine residual (proxy failures only —
   not deferred work).

**Violation signals:** carry-forwards without a second CC-CMD written;
verification steps blocked by sandbox egress (use relay self-probe endpoints
instead); URLs or function names written from memory rather than probed.

---

## Rule 88 — Correct route, fast execution (CORRECT-FAST-A)

Don't take the fast route. Take the correct route and do it fast.

"Fast" means minimize time to correct completion — not time to first attempt.
A correct approach executed in 5 minutes is faster than a shortcut that
requires 3 iterations. If the correct approach isn't obvious, probe more —
not guess faster. Uncertainty is not permission to shortcut.

**The test before executing:** "Is this the right way, or the quick way?"
If quick way — stop, find the right way, then move at pace.

See STANDARDS.md Rule 88 for full rationale and case study.
