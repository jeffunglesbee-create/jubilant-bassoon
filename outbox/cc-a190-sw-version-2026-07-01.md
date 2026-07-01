# CC Outbox — A190 SW_VERSION Fix

**Date:** 2026-07-01
**CC-CMD:** docs/CC-CMD-2026-07-01-a190-sw-version-fix.md
**Commit:** (see below)
**SW_VERSION:** 2026-07-01a (sw.js corrected from 2026-06-30c)
**Smoke:** 813/0

---

## Problem

`sw.js` SW_VERSION `'2026-06-30c'` did not match `index.html`'s `'2026-07-01a'`.
A190 was already a smoke assertion — it caught the mismatch — but smoke runs
late in the pre-commit hook (after diff review) and the failure was recurring.

Root cause of recurrence: the previous session (card-brief-line, 2026-06-30) bumped
SW_VERSION in both files to `2026-06-30c`, but a subsequent chat-session commit
(`88e78fa`) bumped index.html to `2026-07-01a` without touching sw.js.

---

## Task 1 — Fix

`sw.js` line 14: `'2026-06-30c'` → `'2026-07-01a'`

---

## Task 2 — Pre-commit guard

Added fast SW_VERSION sync check to `scripts/pre-commit`, inserted before the full
smoke run. Uses two `grep -m1` calls (~0.1s total) to extract both versions and
compares them. Fails immediately with a clear message showing both values and the fix.

Position: after DIFF REVIEW block, before `echo "🔍 Smoke test (structural)..."`.
This means a mismatch blocks the commit in under 0.1s rather than waiting for
the full smoke suite (~several seconds).

Gate text on failure:
```
❌  A190 SW_VERSION mismatch — commit blocked
    index.html: '2026-07-01a'
    sw.js:      '2026-06-30c'
    Fix: set sw.js SW_VERSION = '2026-07-01a' before committing
```

---

## Task 3 — Verification

```
── Results: 813 passed, 0 failed ──────────────
  ✅ A190 — sw.js SW_VERSION matches index.html (Rule 23b: both must be in sync)
```

---

## Done Conditions

- [x] sw.js SW_VERSION matches index.html ('2026-07-01a')
- [x] Fast pre-commit guard added to scripts/pre-commit
- [x] A190 passing, 813/0 smoke
- [x] Outbox manifest written
