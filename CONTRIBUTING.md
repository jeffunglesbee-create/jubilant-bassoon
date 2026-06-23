# FIELD — PR Workflow

## When to use a PR (not direct push to main)

Direct push to `main` is fine for:
- Daily score/game updates
- Small copy fixes
- `[skip ci]` housekeeping commits

Open a PR for:
- Any new feature (new analytics, new section, new sport)  
- Any architectural change (touch events, CSS structure, relay routes)
- Any change to smoke.js assertions
- Anything that took more than 30 minutes to build

## Opening a PR

```bash
# 1. Create a branch named after the feature
git checkout -b feature/nhl-wave2-pdo

# 2. Make changes, commit normally
git commit -m "NHL-C1: PDO luck indicator — W2 item 1"

# 3. Push the branch (not main)
git push https://ghp_...@github.com/jeffunglesbee-create/jubilant-bassoon.git feature/nhl-wave2-pdo

# 4. GitHub shows "Compare & pull request" banner → click it → Open pull request
# CodeRabbit reviews within ~1 minute, flags any silent failures or CSS issues
# Merge when CodeRabbit is happy (or consciously override specific findings)
```

## CodeRabbit setup

Install the GitHub App once at:
https://github.com/apps/coderabbit-ai

Then it auto-reviews every PR. No terminal, no extra config.
The `.coderabbit.yaml` in this repo tells it to focus on FIELD-specific failure modes:
- Silent analytics failures (_homeAbbr not set, wrong key format)
- Samsung touch event correctness  
- CSS duplicates and missing variables
- Smoke assertion completeness

## FIELD Health Panel

On the live app, long-press the ⚙ button for 1.5 seconds to open the health dashboard.
Shows real-time status of every major feature. Screenshot and share to Claude for diagnosis.
Also accessible at `?debug=1` URL param.

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
