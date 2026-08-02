# CC-CMD-2026-08-02-bracketdo-probe-diagnostics

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-02-bracketdo-probe-diagnostics.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## Important correction before anything else

**The visibilitychange guard fix already exists in `field.js` and is
correct.** Confirmed directly by chat, reading the real committed code:

```js
document.addEventListener('visibilitychange', () => {
  const v = document.visibilityState;
  if (v === 'hidden' && _ws) _close();
  else if (v === 'visible' && document.body.classList.contains('wc-mode')) _open();
});
```

This is inside the same IIFE as `_open`/`_close`, guards on the real
internal `_ws` state, and correctly respects `wc-mode` for the reopen
case. An earlier chat message claimed this was never written — that
was wrong, caused by a `grep -n "_bracketWS"` search that missed this
listener entirely, since it references the private `_ws`/`_open`/
`_close` names directly, not the string that was searched for. **Do
not rewrite or "fix" this listener. It does not need changing.**

## The real, narrower problem

`outbox/bracketdo-visibilitychange-probe-manifest-*.json` (4 runs, all
today) shows `wcMode: false` even in `afterOpen` — i.e., right after
the probe calls `toggleWCView()` to enter WC mode, the class never
appears to have been set. But `toggleWCView()` itself
(`field.js:~30378`) is a plain, unconditional `document.body.classList.
toggle('wc-mode')` with no gating logic that could explain this.

**Chat ruled out one real hypothesis directly** (the `?wpt` query
param the probe appends to the URL) — confirmed it only skips a
first-visit onboarding modal (Rule 54/PM-26-A), unrelated to wc-mode.

**The actual problem: the probe script currently can't tell you why it
fails.** Both `page.waitForFunction(...)` calls before the scenarios
run use `.catch(() => {})` — if either genuinely times out (`window.
toggleWCView` never becoming a function, or `window._bracketWS` never
appearing), the script silently continues anyway rather than reporting
it, and every subsequent check just shows the same unexplained
`wcMode: false`.

---

## Task 1 — Add exact diagnostic logging, do not guess at a behavioral fix

**This is prescriptive, not an open-ended investigation** — the prior
attempt at this CC-CMD appears to have spent its effort on
infrastructure rather than a small remaining piece; this is scoped
narrowly on purpose.

In `bracketdo_visibilitychange_probe.js`, immediately after the two
`page.waitForFunction(...)` calls (before Scenario 1 begins), add:

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
console.log('DIAGNOSTIC (pre-scenario state):', JSON.stringify(diag, null, 2));
results.diagnostic = diag;
```

Also change both `waitForFunction(...).catch(() => {})` calls to
capture and log whether they actually succeeded or timed out, e.g.:

```js
const bootReady = await page.waitForFunction(() => !!window._fieldDataReady, { timeout: 20000 })
  .then(() => true).catch(() => false);
console.log('bootReady (waited for _fieldDataReady):', bootReady);
```

(same pattern for the second `waitForFunction`). Include both booleans
in `results.diagnostic` too.

## Task 2 — Run it once, real CI, report the real output

- Trigger the existing probe workflow (already exists, already correct
  — do not modify it beyond what running the updated script requires).
- Read the actual `results.diagnostic` output from the new manifest.
  This is the actual deliverable of this CC-CMD — the real answer to
  "why does wcMode read false," not a guess.

## Task 3 — Only if the diagnostic reveals an obvious, narrow cause

- If (and only if) Task 2's real output points at something specific
  and small (e.g., `toggleWCViewType` is `"undefined"`, or
  `bootReady`/the second wait both came back `false`), make the
  smallest possible correction to the PROBE SCRIPT to account for it
  (e.g., wait on a different, real sentinel).
- **Do not touch `field.js` under any circumstances in this CC-CMD** —
  the production fix is already correct; if the diagnostic somehow
  suggests otherwise, stop and report rather than changing it.
- If the diagnostic doesn't point at an obvious cause, report the raw
  output honestly rather than guessing at a fix.

---

## Explicitly NOT in scope

- Do not modify the visibilitychange guard in `field.js` — confirmed
  correct, already verified by chat directly against source.
- Do not rewrite the probe script's overall structure — this is a
  targeted diagnostic addition, not a rebuild.
- Do not treat "add more logging" as license to also change unrelated
  parts of the test.

---

## Outbox

`outbox/cc-session-2026-08-02-bracketdo-probe-diagnostics.md`: the
real diagnostic output from Task 2, and either the narrow fix applied
in Task 3 with its real before/after result, or an honest statement
that the cause remains unclear even with the new visibility.
