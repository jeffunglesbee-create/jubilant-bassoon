# Claude Code Command — Fix FIELD-CURRENT-STATE.md Corruption

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md / STANDARDS.md.

Write findings to outbox/cc-current-state-corruption-fix-2026-07-01.md.

## CONTEXT

`FIELD-CURRENT-STATE.md` is 74.7MB / 1.34M lines, corrupted by unresolved
git merge-conflict markers (`<<<<<<< Updated upstream` / `=======` /
`>>>>>>> Stashed changes`) committed repeatedly across 816 commits by
`.github/workflows/smoke-and-verify.yml`. Confirmed root cause by reading
the workflow directly (job around line 285-340, step "Commit if changed"):

```bash
git stash
git fetch origin main
git reset --hard origin/main
git stash pop || true          # <-- swallows the conflict silently
git add FIELD-CURRENT-STATE.md GOVERNANCE.json
# ...then commits unconditionally, conflict markers and all
```

The stashed content is 4 sed-regenerated header lines (HEAD/Deployed/
File/Smoke) that get recomputed fresh on every run anyway — there is
NOTHING in the stash worth "merging." The stash/pop dance is solving a
problem that doesn't need solving: since the values are always
regenerated from scratch, the correct pattern is to regenerate them
AFTER the reset, not stash-and-reapply a pre-reset version.

## PRE-BUILD PROBE (Rule 87)

```bash
sed -n '285,345p' .github/workflows/smoke-and-verify.yml
wc -l -c FIELD-CURRENT-STATE.md
grep -c "^<<<<<<< Updated upstream" FIELD-CURRENT-STATE.md
```

Confirm the exact current line numbers and surrounding step structure
before editing — line numbers above are from the 2026-07-01 probe and
may have shifted if other commits landed since.

## TASK 1: Fix the workflow (root cause)

Restructure the "Commit if changed" step so the sed-regeneration happens
AFTER `git reset --hard origin/main`, not before with a stash/pop
around it:

```bash
git config user.name  "FIELD Deploy"
git config user.email "field-deploy@users.noreply.github.com"
git fetch origin main
git reset --hard origin/main

HEAD=$(git rev-parse --short HEAD)
DATE=$(date '+%Y-%m-%d')
SIZE=$(wc -c < index.html | awk '{printf "%.0f", $1/1024}')
SMOKE=$(node smoke.js index.html 2>&1 | grep -oP '\d+ passed' | grep -oP '\d+' | head -1)

sed -i "s/\*\*HEAD:\*\* [a-f0-9]*/\*\*HEAD:\*\* ${HEAD}/" FIELD-CURRENT-STATE.md
sed -i "s/\*\*Deployed:\*\* [0-9-]*/\*\*Deployed:\*\* ${DATE}/" FIELD-CURRENT-STATE.md
sed -i "s/\*\*File:\*\* ~[0-9]*KB/\*\*File:\*\* ~${SIZE}KB/" FIELD-CURRENT-STATE.md
sed -i "s/\*\*Smoke:\*\* [0-9]*\/0/\*\*Smoke:\*\* ${SMOKE}\/0/" FIELD-CURRENT-STATE.md

python3 -c "
import json
with open('GOVERNANCE.json') as f: g = json.load(f)
g['_last_governance_audit'] = '${DATE}'
with open('GOVERNANCE.json', 'w') as f: json.dump(g, f, indent=2)
"

git add FIELD-CURRENT-STATE.md GOVERNANCE.json
if git diff --staged --quiet; then
  echo "No changes to current state — skipping commit"
else
  git commit -m "ci: update current state ${HEAD} [skip ci]"
  git push origin main || {
    echo "Push rejected — one more retry: reset, regenerate, recommit"
    git fetch origin main
    git reset --hard origin/main
    # repeat the sed block above once on genuine race; do not loop indefinitely —
    # if this second attempt also fails to push, fail the job loudly rather than
    # silently swallowing it (this is exactly the anti-pattern being removed)
  }
fi
```

No stash, no pop, no `|| true` swallowing a conflict. If a genuine race
happens (another commit lands between fetch and push), the retry
re-derives everything fresh from the new HEAD rather than trying to
merge stale stashed content into it.

## TASK 2: Reset the corrupted file content

`FIELD-CURRENT-STATE.md`'s current content is unrecoverable garbage —
816 layers of nested conflict markers. Replace the entire file with a
single clean copy, using the last genuinely clean snapshot found buried
in the wreckage as the template (`HEAD: 1fe4b5c · Deployed: 2026-06-30 ·
Smoke: 813/0`), updated with current real values (probe fresh — HEAD,
smoke count, file size — do not reuse the 2026-07-01 numbers from this
CC-CMD verbatim, they'll be stale by the time this runs).

## TASK 3: Verification

```bash
wc -l -c FIELD-CURRENT-STATE.md   # should be a normal-sized markdown file, not megabytes
grep -c "^<<<<<<<" FIELD-CURRENT-STATE.md   # must be 0
node smoke.js index.html   # A143/A144 still pass (file exists, GOVERNANCE.json valid)
```

Done condition: file is clean, zero conflict markers, smoke passes,
CI green, deploy completed. Chat-side follow-up: confirm the NEXT
automated CI run (next deploy) doesn't reintroduce corruption — this
CC-CMD can't prove the fix holds under a real concurrent-push race
since that requires actual concurrent pushes, which chat will watch for
over the next several sessions rather than simulate here.

## TASK 4: Outbox manifest
