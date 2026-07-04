# CC Outbox — sw-version-bump.yml Sed Pattern Fix

**Date:** 2026-07-04
**CC-CMD:** docs/CC-CMD-2026-07-04-sw-version-bump-fix.md
**Commit:** 2de7a8c
**Deploy:** N/A — this commit only touches `.github/workflows/sw-version-bump.yml`, which is not in the deploy-gate trigger paths (index.html, sw.js, field_utils.js, wrangler.jsonc). No deploy expected or needed.

---

## Probe block — re-run, real current state confirmed (not assumed)

```
grep -n "const SW_VERSION" sw.js | cat -A
  → 14:const SW_VERSION = '2026-07-04n';$
  Confirmed: single space before "=", no trailing whitespace/CR.
  This matches the doc's claim about sw.js's real format.

grep -n "SW_VERSION  = " .github/workflows/sw-version-bump.yml
  → 28: # sw.js: const SW_VERSION  = '2026-06-22a';  (note double space)
  → 29: sed -i "s/const SW_VERSION  = '[0-9-]*[a-z]'/const SW_VERSION  = '${TODAY}a'/" sw.js
  Confirmed: the double-space sed pattern bug is REAL and CURRENTLY
  PRESENT in the workflow -- not a stale/already-fixed premise.

node smoke.js index.html 2>&1 | grep "A190"
  → ✅ A190 — sw.js SW_VERSION matches index.html (Rule 23b: both must be in sync)
  A190 was ALREADY PASSING before any edit -- index.html and sw.js were
  both already '2026-07-04n' at probe time.
```

**This is the critical finding of this task:** the doc's TASK 1 premise
(sed pattern bug, single-space vs double-space) is real and confirmed.
But the doc's TASK 3 premise (a current desync, index.html at 'a' vs
sw.js at 'c') is **stale** — re-verified per Rule 72 (inherited claims
must be re-verified) rather than trusted from the doc's own "Why"
section, which described a snapshot from earlier in the day that other
same-day feature commits (this session's own `newspaper-voice-late-gap-
fix`, `newspaper-late-section-render`, `circadian-card-sort-order`
commits) had already moved both files past, in sync, before this
CC-CMD ran. **TASK 3 required no action** — both files already read
`2026-07-04n`, A190 already passed.

## Implementation

### TASK 1 — sed pattern fixed (both index.html and sw.js), whitespace-tolerant
```yaml
sed -i -E "s/const SW_VERSION[[:space:]]*= '[0-9-]*[a-z]'/const SW_VERSION = '${TODAY}a'/" index.html
sed -i -E "s/const SW_VERSION[[:space:]]*= '[0-9-]*[a-z]'/const SW_VERSION = '${TODAY}a'/" sw.js
```
Verified locally against three input variants before committing:
- Single-space input (`const SW_VERSION = '...'`, sw.js's real current
  format) → correctly normalized to single-space output
- Double-space input (the old stale assumption, in case it recurs) →
  correctly normalized to single-space output
- No-space input (defensive edge case) → correctly normalized to
  single-space output

### TASK 2 — loud-failure verification step added
```yaml
- name: Verify both files actually updated
  run: |
    TODAY=$(TZ=America/New_York date +%Y-%m-%d)
    grep -q "const SW_VERSION = '${TODAY}a'" index.html || { echo "::error::index.html SW_VERSION not updated"; exit 1; }
    grep -q "const SW_VERSION = '${TODAY}a'" sw.js || { echo "::error::sw.js SW_VERSION not updated"; exit 1; }
```
Placed immediately after the "Bump SW_VERSION" step, before "Commit and
push" — exactly as specified. Verified locally that this grep pattern
matches the sed step's real post-substitution output format.

### TASK 3 — no action taken (premise stale, confirmed not assumed)
No resync performed. index.html and sw.js were already both
`2026-07-04n` at probe time; A190 already passed. Resyncing would have
been a no-op at best and a fabricated "fix" for a non-existent problem
at worst — per Rule 77 (do not rationalize / do not invent), reporting
this honestly rather than manufacturing a Task 3 diff.

## Scope discipline

`git diff --stat`: only `.github/workflows/sw-version-bump.yml` changed
(9 insertions, 3 deletions). Cron schedule (`5 4 * * *`) and trigger
conditions (`workflow_dispatch`) untouched. No other part of the
workflow touched. No `index.html` or `sw.js` content changed.

## Smoke

Full suite: **867 passed, 0 failed** (unchanged from before this
commit — this task doesn't touch index.html/sw.js content, so no new
assertions were expected or added). A190 confirmed passing both before
and after.

## SW_VERSION

Not bumped — this commit only touches a GitHub Actions workflow file,
not index.html or sw.js content, so no SW_VERSION change applies and no
deploy is triggered (deploy-gate's trigger paths are index.html, sw.js,
field_utils.js, wrangler.jsonc only).

## CC-verifiable confidence score (per the doc's own rubric)

- **+30** — Sed patterns fixed, confirmed whitespace-tolerant via a
  local test substitution (3 input variants + verify-step grep match,
  all tested before committing)
- **+30** — Loud-failure verification step added correctly, placed at
  the specified position
- **+20** — A190 passing (was already passing — TASK 3's premised
  desync was stale and required no action, reported honestly rather
  than fabricated)
- **+20** — Full smoke suite green (867/0)

**Total: 100/100.** Committed.

## Deferred to chat — per the CC-CMD, does not block this commit

- [ ] Real observation of tomorrow's 4:05 AM UTC scheduled run actually
      succeeding and updating both files correctly with the new
      whitespace-tolerant pattern — cannot be verified until that
      scheduled time passes (explicitly deferred by the doc itself,
      not a scope failure).

---

## Done Conditions

- [x] Probe block re-run, sw.js's real spacing reconciled with this
      doc (confirmed single-space, matching the doc's claim; the sed
      bug is real, not stale)
- [x] Sed patterns fixed in both places, whitespace-tolerant
- [x] Loud-failure verification step added
- [x] Current desync check: A190 already passing — TASK 3's resync
      premise was stale, verified not assumed, no action taken (see
      above)
- [x] Full smoke suite green (867/0)
- [x] Outbox manifest written (this file), explicitly recording that
      TASK 3 required no action and why
