# Claude Code Command — Fix A190 (SW_VERSION sync)

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md / STANDARDS.md.

Write findings to outbox/cc-a190-sw-version-2026-07-01.md.

## CONTEXT

Live smoke failure, verified 2026-07-01: `sw.js` SW_VERSION `'2026-06-30c'`
does not match `index.html`'s `'2026-07-01a'`. This is a RECURRING bug — a
prior session's own record claims A190 was fixed once already; it
recurred, meaning some commit since then bumped one file's SW_VERSION
without the other.

## TASK 1: Fix immediately

Set `sw.js`'s SW_VERSION to match `index.html`'s current value exactly
(read both files fresh from HEAD first — do not assume `'2026-07-01a'`
is still current by the time this runs, re-check).

## TASK 2: Prevent recurrence — add a pre-commit guard

Since this is a repeat failure, a smoke assertion alone isn't preventing
it (A190 already exists and still failed). Add a pre-commit hook check
(or extend the existing one, per Rule 32's bypass-pressure principle —
keep it under ~1 second) that fails fast, locally, before a commit
touching `index.html`'s SW_VERSION can land without a matching `sw.js`
update. Grep the existing pre-commit setup (`scripts/setup.sh` or
equivalent) before adding a new mechanism — extend what's there if
reasonable rather than adding a second, parallel gate.

## TASK 3: Verification

```bash
node smoke.js index.html
```
Done condition: 0 failures, A190 specifically passing.

## TASK 4: Outbox manifest
