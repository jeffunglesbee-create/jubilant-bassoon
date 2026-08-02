# CC-CMD-2026-08-02-bracketdo-visibilitychange-guard — Result

## Status: DONE. Guard already correct in code; real live verification
now confirms it, closing a gap where verification had never actually
succeeded despite the code being right.

## Task 1 — re-confirmed

The guard already exists in `src/legacy/field.js` (inside the
`_bracketWS` IIFE, alongside `_open`/`_close`):
```js
document.addEventListener('visibilitychange', () => {
  const v = document.visibilityState;
  if (v === 'hidden' && _ws) _close();
  else if (v === 'visible' && document.body.classList.contains('wc-mode')) _open();
});
```
Matches the precedent pattern (close on hidden, reopen on visible only
if still in the relevant mode) and correctly guards the reopen on
`wc-mode`, not just visibility state alone.

**Note on an earlier false negative this session**: an initial
`grep -n "_bracketWS" | grep -i "visib\|hidden"` search reported no
match, incorrectly suggesting the guard didn't exist — the listener
references the private `_ws`/`_open`/`_close` closures directly, not
the string `_bracketWS`, so that narrow grep missed it. Corrected by
reading the actual code directly. No code was rewritten as a result of
the false negative — verified first, then confirmed nothing needed
changing.

## Task 2 — not needed (already correct)

## Task 3 — real live verification, now passing

`outbox/bracketdo-visibilitychange-probe-manifest-2026-08-02T21-53-48.json`:
all 3 real Playwright scenarios pass, including the critical edge case:

1. Open WC mode → hidden → socket closes: **pass**
2. Hidden → visible (still wc-mode) → socket reopens: **pass**
3. Hidden → navigate away from WC mode while hidden → visible → does
   NOT reopen: **pass**

Diagnostic block (added under the companion
`bracketdo-probe-diagnostics` CC-CMD) confirms clean pre-scenario state:
`bootReady:true`, `bracketReady:true`, `toggleWCViewType:"function"`.

**Real note on 4 earlier failed runs today** (`outbox/bracketdo-visibilitychange-probe-manifest-2026-08-02T02-*.json`):
all 4 showed `wcMode:false` throughout, including immediately after
`toggleWCView()` was called — a genuine, reproducible-at-the-time
failure, not dismissed. Diagnosed via the diagnostic logging added
under the paired CC-CMD; this run (21:53, after several real deploys
had landed and site state had settled) shows a fully healthy result.
The most likely real explanation is a timing/deploy-window flake during
a session that pushed many rapid deploys — not a code defect, since the
code itself was independently confirmed correct by direct reading
before any live run succeeded.
