# CC-CMD: Fix sw-version-bump.yml regex (real, currently-active bug)

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** One-line regex fix in an existing GitHub Actions workflow.
**Why:** Live-verified 2026-07-04: `sw-version-bump.yml`'s sed pattern
for `sw.js` requires two spaces (`const SW_VERSION  = `), matching a
stale assumption recorded in its own comment ("note double space"). The
actual current `sw.js` has a single space (`const SW_VERSION = `,
confirmed via `cat -A`). This means the workflow has been silently
failing to update `sw.js` on every run — it only ever touches
`index.html`, while still committing with a message claiming both files
changed. Confirmed real impact: `index.html` is currently `2026-07-04a`
while `sw.js` is `2026-07-04c` (correctly bumped by real feature
commits, never reset back down by this workflow because it can't match
the real spacing). This is causing an active smoke failure (A190 —
sw.js/index.html SW_VERSION mismatch).
**Target time:** ~10 min

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95.

## PROBE BLOCK (run before any edits)
```bash
grep -n "const SW_VERSION" sw.js | cat -A
grep -n "SW_VERSION  = " .github/workflows/sw-version-bump.yml
node smoke.js index.html 2>&1 | grep "A190"
```
Confirm sw.js's real current spacing before editing — if it now has two
spaces again (someone reformatted it), this CC-CMD's premise is stale,
stop and report rather than "fixing" a non-bug.

## TASK 1 — Fix the sed pattern

Find this line in `.github/workflows/sw-version-bump.yml`:
```yaml
          sed -i "s/const SW_VERSION  = '[0-9-]*[a-z]'/const SW_VERSION  = '${TODAY}a'/" sw.js
```
Replace with (single space, matching sw.js's actual current format;
also make the pattern whitespace-tolerant so this doesn't silently
break again if formatting drifts either direction):
```yaml
          sed -i -E "s/const SW_VERSION[[:space:]]*= '[0-9-]*[a-z]'/const SW_VERSION = '${TODAY}a'/" sw.js
```
Also apply the same whitespace-tolerant pattern to the `index.html` sed
command for consistency and to prevent the same class of bug recurring
there:
```yaml
          sed -i -E "s/const SW_VERSION[[:space:]]*= '[0-9-]*[a-z]'/const SW_VERSION = '${TODAY}a'/" index.html
```

## TASK 2 — Add a verification step that fails loudly instead of silently

After the "Bump SW_VERSION" step, add a step that fails the workflow
run if either file didn't actually change to the expected value —
turning today's silent failure mode into a visible one:
```yaml
      - name: Verify both files actually updated
        run: |
          TODAY=$(TZ=America/New_York date +%Y-%m-%d)
          grep -q "const SW_VERSION = '${TODAY}a'" index.html || { echo "::error::index.html SW_VERSION not updated"; exit 1; }
          grep -q "const SW_VERSION = '${TODAY}a'" sw.js || { echo "::error::sw.js SW_VERSION not updated"; exit 1; }
```

## TASK 3 — Fix the CURRENT live desync (one-time, not part of the workflow fix itself)

Directly set `index.html`'s `SW_VERSION` to match `sw.js`'s current
real value (do NOT reset sw.js down — it's ahead because real feature
commits correctly bumped it; index.html is the one that's behind):
```bash
grep -o "const SW_VERSION = '[^']*'" sw.js  # confirm real current value first
```
Set `index.html`'s `SW_VERSION` to that same value.

## SCOPE BOUNDARY

DO:
- Fix the sed pattern for both files (whitespace-tolerant)
- Add the loud-failure verification step
- Manually resync index.html to sw.js's current real value (not the reverse)
- Bump both to a NEW, matching value if today's date has changed by the time this runs, per Rule 23

DO NOT:
- Change the cron schedule or trigger conditions
- Touch any other part of this workflow
- Reset sw.js downward to match index.html's stale value — sw.js has the correct, more current value

## DONE CONDITIONS
- [ ] Probe block re-run, sw.js's real spacing reconciled with this doc
- [ ] Sed patterns fixed in both places, whitespace-tolerant
- [ ] Loud-failure verification step added
- [ ] Current desync resolved: `node smoke.js index.html` shows A190 passing
- [ ] Full smoke suite green (not just A190)
- [ ] Outbox manifest written to `docs/outbox/cc-sw-version-bump-fix-{date}.md`

**Deferred to chat — do NOT block your commit on this:**
- [ ] Real observation of tomorrow's 4:05 AM UTC scheduled run actually succeeding and updating both files correctly — cannot be verified until that scheduled time passes.

## COMPLIANCE
- Rule 68: probe block first, re-verify sw.js's real spacing
- Rule 87: self-completing on the CC-verifiable portion; the scheduled-run confirmation is necessarily deferred by time, not by design choice

## CONFIDENCE SCORING TABLE
+30  Sed patterns fixed, confirmed whitespace-tolerant via a local test substitution
+30  Loud-failure verification step added correctly
+20  Current desync resolved, A190 passing
+20  Full smoke suite green

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-sw-version-bump-fix.md. Re-confirm
sw.js's real current spacing first (see PROBE BLOCK) — do not assume
the two-space bug is still present without checking. Implement exactly
as specified, including the manual one-time resync (index.html should
move UP to match sw.js, not the reverse). Do not commit unless
confidence ≥ 95. If score < 95 report verbatim and stop — do not invent
results.
