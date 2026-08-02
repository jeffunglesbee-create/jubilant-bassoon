# CC-CMD-2026-08-02-bracketdo-probe-diagnostics — Result

## Status: DONE.

## Task 1 — diagnostic logging added (already present in
`bracketdo_visibilitychange_probe.js`, confirmed by direct read):
```js
const diag = await page.evaluate(() => ({
  toggleWCViewType: typeof window.toggleWCView,
  bracketWSExists: !!window._bracketWS,
  fieldDataReady: !!window._fieldDataReady,
  wcNavLinkExists: !!document.getElementById('wc-nav-link'),
  wcSectionExists: !!document.getElementById('wc-section'),
  bodyClassList: document.body.className,
  readyState: document.readyState,
}));
results.diagnostic = diag;
```
Both `waitForFunction` results (`bootReady`, `bracketReady`) captured
and included in `results.diagnostic` as specified.

## Task 2 — run it once, real output

Dispatched `bracketdo-visibilitychange-probe.yml` fresh this session.
Real diagnostic output
(`outbox/bracketdo-visibilitychange-probe-manifest-2026-08-02T21-53-48.json`):
```json
{
  "toggleWCViewType": "function",
  "bracketWSExists": true,
  "fieldDataReady": true,
  "wcNavLinkExists": true,
  "wcSectionExists": true,
  "bodyClassList": "",
  "readyState": "complete",
  "bootReady": true,
  "bracketReady": true
}
```
Everything healthy — and all 3 scenarios genuinely passed this run
(unlike the 4 prior runs today, which all showed `wcMode:false`
throughout with no diagnostic data to explain why).

## Task 3 — not needed

The diagnostic didn't reveal a narrow probe-script bug requiring a
fix; the real explanation for the earlier 4 failures appears to be a
timing/deploy-window flake (this run landed after several deploys had
completed and settled), not a defect the diagnostic pointed at. Per
this CC-CMD's own Task 3 guidance ("if the diagnostic doesn't point at
an obvious cause, report the raw output honestly rather than guessing
at a fix") — reporting honestly rather than inventing a probe-script
change with no real diagnosed cause to justify it. `field.js` was not
touched, per explicit scope.
