# CC-CMD-2026-08-09-phantom-css-token-audit

**Repo:** jubilant-bassoon — commit directly to `main`.

**Origin:** found during `CC-CMD-2026-08-09-badge-chip-token-sweep`.
Out of that CC-CMD's badge/chip scope (Rule 69), so it gets its own.

## The finding

`index.html` contains `var(--token, #hex)` references to tokens that are
**never defined anywhere in the file**. Every one silently renders its
fallback hex forever. They read as tokenised and are not.

Measured 2026-08-09 (`grep -c -- "--name *:" index.html` = 0 for each,
usage counted with `grep -o "var(--name," index.html | wc -l`):

```
--text-muted   0 definitions, 13 usages
--fg           0 definitions, 12 usages
--amber        0 definitions,  3 usages
--text-dim     0 definitions,  2 usages
```

Also worth checking in the same pass — same shape, not yet counted:
`--c-muted`, `--card-bg`, `--accent`, `--text`, `--text-secondary`,
`--panel`, `--c-text`.

This is a fallback compensating for a missing contract, which is what
Rule 76 exists to catch. The fix is to point each at the real token and
delete the fallback — not to define new tokens to match the hexes, which
would ratify colours nobody chose semantically.

## Task 1 — enumerate, do not trust the list above

```
grep -o "var(--[a-z0-9-]*," index.html | sed 's/var(//;s/,//' | sort -u > /tmp/used
grep -o -- "--[a-z0-9-]*[ ]*:" index.html | sed 's/[ :]*$//' | sort -u > /tmp/defined
comm -23 /tmp/used /tmp/defined
```
**Artifact:** the full undefined list with a usage count for each.

## Task 2 — classify before substituting

Same discipline as the badge sweep: the fallback hex must NOT pick the
token. For each phantom, decide by ROLE (foreground text, dim text,
surface, accent) and map to the existing token for that role. Where the
role is a reserved Rule 37 meaning, the reserved token wins even if the
hue shifts.

Where no existing token fits the role, that is a Rule 37 governance
change — collect and STOP, do not define a new token.

## Task 3 — apply, grouped by phantom token, one commit each

## Task 4 — done condition (artifact)

1. `comm -23 /tmp/used /tmp/defined` -> empty for every token fixed.
2. `node smoke.js index.html` -> 0 failed.
3. SW_VERSION bumped in `src/legacy/field.js` AND `sw.js` using the **ET**
   date, then `node scripts/sync-source.mjs`.
4. Dispatch `badge-token-sweep-probe.yml` after deploy; `.chip-have` must
   still read `PASS`, proving no regression in the one family already
   proven live.

## Task 5 — outbox

`outbox/cc-session-{date}-phantom-css-token-audit.md` with a confidence score.
