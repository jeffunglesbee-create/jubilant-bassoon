# CC-CMD-2026-08-09-dead-badge-css-removal

**Repo:** jubilant-bassoon — commit directly to `main`.

**Origin:** found by `badge_token_sweep_probe.js` during
`CC-CMD-2026-08-09-badge-chip-token-sweep`. Written as its own CC-CMD
because that one's scope is explicitly "colour only — do not change
markup or badge structure," and deleting rules is structure.

## The finding

Three badge rule families in `index.html` have **no emitter anywhere in
`src/legacy/field.js`**, measured, not assumed:

```
grep -c "ts-badge"           src/legacy/field.js   -> 0
grep -c "free-tonight-badge" src/legacy/field.js   -> 0
```

Checked for dynamic construction too (`'ts-badge ts-' + x`), the way
`.field-chip--*` is built at field.js:2218 — no such pattern exists. The
only other occurrences are in `indexreview.html`, a review artifact, not
a served file.

Rules involved: `.ts-badge`, `.ts-badge.ts-series_deciding`,
`.ts-badge.ts-elimination`, `.ts-badge.ts-clinch`,
`.ts-badge.ts-playoff_impl`, `.free-tonight-badge`.

The token sweep tokenised three of these before the probe revealed they
were dead. That work was cosmetically correct and functionally inert —
the same trap as the four `.mlb-park-badge` variant rules, which were
dead from the day they were written and only exposed by a real render.

## Task 1 — re-verify from HEAD before deleting

```
git log --oneline -5
for c in ts-badge free-tonight-badge; do
  echo "$c: $(grep -rn "$c" src/legacy/field.js | wc -l) refs in field.js"
done
grep -rn "ts-badge\|free-tonight" --include=*.js . | grep -v badge_token_sweep_probe
```
If any emitter now exists, STOP — the rule is live and this CC-CMD is void.

## Task 2 — delete the rules

`index.html` CSS only. Do not touch `indexreview.html`. Do not touch any
other badge family. One commit.

## Task 3 — done condition (artifact, per Rule 90)

1. `node smoke.js index.html` -> 965 passed, 0 failed (no assertion
   references these selectors; a drop means one did and must be read, not
   explained away).
2. `grep -c "ts-badge\|free-tonight-badge" index.html` -> `0`.
3. Dispatch `badge-token-sweep-probe.yml`. In the committed manifest, the
   `.ts-badge.*` rows must still read `NOT-RENDERED` and `.chip-have`
   must still read `PASS` — proving the deletion changed nothing that
   renders. Remove the two `.ts-badge.*` and `.free-tonight-badge` entries
   from `TARGETS` in `badge_token_sweep_probe.js` in the same commit, so
   the probe stops asserting on selectors that no longer exist.

## Task 4 — outbox

`outbox/cc-session-{date}-dead-badge-css-removal.md`: commit hash, the
grep counts before and after, the probe manifest path, confidence score.
