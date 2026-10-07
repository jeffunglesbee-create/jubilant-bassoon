# CC session 2026-10-06 — chrome-inventory, red for 32 runs

**Repo:** jubilant-bassoon
**HEAD progression:** `d53cdcf2` → `fcea0e30` → `f79b5608`
**Smoke:** 1055 passed, 0 failed
**eslint:** 7 errors → 0
**SW_VERSION:** `2026-10-06a` → `2026-10-06b`
**Confidence:** 96
**Credits spent at any vendor:** 0

Third item from this session's shelf, after
`cc-session-2026-10-06-bjk-cup-draw-unreachable.md` and
field-relay-nba's `cc-session-2026-10-06-tennis-split-read-from-client.md`.

---

## Done condition — met on a real run

`chrome-inventory.yml` run **68**, `f79b560`: **success.** Its previous green
was run 35, `d207c19`, 2026-09-12T01:20Z — **32 consecutive failures** between
them. 31 of its 67 earlier runs were green, so the workflow passes when the
repo is clean; it was not broken.

## What it was reporting

```
  1118 class(es) in the stylesheet, against 28 bundled source file(s)
  reached by: literal 1080, template/concat prefix 18
  unreferenced: 1
  card-odds
FAIL  unreferenced-css is at or below its declared count
      → 1 of 0 — a NEW unreachable class is the failure.
```

Found by running the workflow's two steps locally; both self-tests pass and
`check-chrome-inventory.mjs` was green, so the failure was entirely
`unreferenced-css-check.mjs`.

**`.card-odds` is genuinely dead, not a gap in the checker:**

- appears once in the whole repo, at `index.html:1925`, as the rule itself
- nothing in `src/legacy/field.js`, `src/solid/`, `src/debrief/` or any other
  file emits it, by literal or by the 18 template/concat prefixes the check
  credits
- its comment said *"hidden unless `oddsLine()` returns a string"* and
  `oddsLine` does not exist anywhere in the repo
- nothing in `smoke.js`, `field_smoke.js`, `field_unit.js` or `docs/` names it
- the odds line that IS rendered comes from `src/debrief/index.ts` and carries
  `debrief-odds`, `debrief-odds__scenario`, `debrief-odds__line` and
  `debrief-odds-movement`

The governance paragraph it carried is **moved, not deleted**, onto
`.debrief-odds__scenario` and `.debrief-odds__line` — where odds are actually
displayed. Those two rules are a margin, a font size and an opacity, so the
constraint it states (no colour by magnitude, no badge, nothing that behaves
like a signal) is what the live rules do. Checked before claiming it.

The check was made to fail on purpose first: adding a `.mutant-dead-class` rule
takes it to `unreferenced: 1` and red.

## A premise I was about to publish, and what refuted it

`git log -S'card-odds'` returned exactly one commit — `d78372bb`, 2026-09-21,
*"nfl standings probe + espn shape"* — and the obvious reading is that this
commit introduced the rule in a message about something else.

**That reading is worthless.** This clone is **shallow** (`git rev-parse
--is-shallow-repository` → true, 367 commits), so a single `-S` result marks
the shallow boundary rather than the introducing commit. The giveaway arrived
when `git worktree add d78372bb~1` failed with *"invalid reference"* — the
parent is not in the clone, so neither is the history `-S` would need.

When `.card-odds` arrived is therefore **not stated** anywhere, including in the
commit message. A shallow clone is a truncated copy of the history, and this
repo's standing question applies to it: *is this the source, or a copy of the
source?*

## The blocker in front of the fix

The first commit touching `index.html` was rejected by the pre-commit hook:
**7 eslint errors**, all
`document.getElementById('x-nav-link')?.classList.remove('active')` — the form
`.eslintrc.json` forbids with *"Store result first"*.

Not a regression from this session. Present at **every commit back to
2026-09-21**, checked by linting `git show <sha>:index.html` at the six most
recent commits touching it: 7 errors at each.

**Why it surfaced only now:** `scripts/pre-commit` lints `index.html` with
`--cache`. Three commits earlier the same evening touched workflows, `outbox/`
and `HANDOFF.md`, and the hook reported lint passed on the cached result. The
first commit that changed `index.html` re-linted it and the seven appeared.
They would have blocked any `index.html` change for the past two weeks.

Fixed in `fcea0e30`, mechanically and with identical semantics — `?.` on a null
`getElementById` is a no-op and `if (el) el.classList.remove(...)` is the same
no-op. All seven sit in blocks whose **sibling lines already store first**:
`_jrnNavLnk` and `_pickemNavLnk` are two lines above the tennis one at 32238
and comply. Variable names are the ones already used for these ids elsewhere in
the file — `_tnNavLnk` (11305), `_wcNavLnk` (11286), `_pickemNavLnk` (11294) —
and `stats-nav-link`, the one id with no precedent, follows the pattern.

## Two mistakes of mine, both caught by guards

1. **`sync-source.mjs`'s divergence guard fired, correctly.** I had synced
   `index.html` from `field.js`, then bumped SW_VERSION in `field.js`, so the
   script block matched neither `field.js` nor the last committed
   `index.html` — which is exactly the shape of a direct edit. Recovery:
   `git checkout HEAD -- index.html` then re-sync. Second time tonight.
2. **The two fixes were entangled in one file.** The CSS deletion and the
   synced lint fix both land in `index.html`, so Rule 5 needed the split done
   mechanically: save `git diff -U6 HEAD -- index.html`, keep only the hunk
   containing `card-odds`, restore and re-sync for the lint commit, then
   `git apply --3way` the CSS hunk for the second. 5 hunks total, 1 kept.

## Open, not done

- **`chrome-inventory.yml` is green and still undeclared** in field-relay-nba's
  `docs/declared-detectors.json`, which is correct — a green detector has
  nothing to declare. The gap that let 32 red runs pass unexamined is the
  dead-cron watch's grace window, not this workflow.
- **The pre-commit hook's `--cache` on `index.html`** means a repo-wide lint
  failure stays invisible to every commit that does not touch that file. Not
  changed here: the cache is also what keeps the hook fast, and the failure it
  masked was still blocking the moment anyone touched the file. Worth a
  decision, not a silent fix.
