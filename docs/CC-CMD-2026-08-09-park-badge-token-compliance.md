# CC-CMD-2026-08-09-park-badge-token-compliance

**Repo:** jubilant-bassoon — commit directly to `main`.

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-09-park-badge-token-compliance.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## A real Rule 37 violation, found while tracing something else

`index.html` carries raw hex in badge CSS:
```
.mlb-park-badge.park-hitter-extreme{color:#f59e0b;border-color:rgba(245,158,11,.4);background:rgba(245,158,11,.1)}
.mlb-park-badge.park-hitter{color:#22c55e;border-color:rgba(34,197,94,.35);background:rgba(34,197,94,.08)}
```

`COLOUR-SYS-A` (Drive `1NWToUpUMPnn3LMZllJdybTyGOZuoEA6DyXEXDHy90rs`,
Rule 37): *"No raw hex values in component JavaScript, template strings,
or inline styles"*, and colour meanings are **reserved globally**:

- `#f59e0b` is `--caution` / `--access-trial` — *"something to know
  before deciding"*
- `#22c55e` is `--sport-epl` — English football identity

A park-factor badge is neither a caution signal nor English football. Per
the spec this is the violation class it names outright: *"using a color in
a context that contradicts its semantic meaning = DO NOT SHIP."*

Not introduced by any recent commit — pre-existing, found 2026-08-09.

## Task 1 — scope the real extent before changing anything

Do not assume these two rules are the only offenders. Grep `index.html`
for raw hex in badge/chip CSS generally.

**Artifact:** the full list of rules with raw hex, and for each, which
`COLOUR-SYS-A` token (if any) matches its semantic intent.

## Task 2 — decide per rule, do not bulk-substitute

For each: either it maps cleanly to an existing token (replace), or its
meaning is genuinely new (**STOP** — a new token is a Rule 37 governance
change needing meaning, non-confusion, and sign-off).

A mechanical hex→nearest-token sweep is explicitly wrong here: the spec
is about **meaning**, not appearance. Swapping `#22c55e` for
`var(--sport-epl)` on a baseball badge would satisfy a grep and still
violate the rule.

## Task 3 — artifacts

1. `node smoke.js index.html` → 0 failed, including the spec's own
   assertions (`--drama-must`/`--drama-watch`/`--drama-low` present, no
   raw drama hex).
2. Before/after grep counts of raw hex in the touched rules.
3. Playwright CI-as-proxy screenshot proving no visual regression on a
   card carrying these badges.

## Explicitly NOT in scope
- Do not change badge structure or markup — colour tokens only.
- Do not define new tokens without sign-off.

## Outbox
`outbox/cc-session-2026-08-09-park-badge-token-compliance.md`
