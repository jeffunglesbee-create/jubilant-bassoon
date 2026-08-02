# CC-CMD-2026-08-02-bracketdo-visibilitychange-guard

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-02-bracketdo-visibilitychange-guard.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## The gap, precisely — confirmed independently before this doc was written

`docs/outbox/cc-session-2026-08-02-audit-bracketdo-rule-a.md`
(field-relay-nba) found, and this session independently re-verified via
direct grep against real HEAD: connection establishment for
`_bracketWS` is genuinely pull-gated (exactly two call sites,
`.close()` and `.open()`, both inside the WC-mode toggle function). But
none of `field.js`'s six real `visibilitychange` listeners reference
`_bracketWS`, `bracket`, or the WC section — confirmed by reading each
listener's actual body, not inferred from line-number distance. A user
who opens WC mode once, then backgrounds the tab without explicitly
navigating away in-app, keeps receiving and processing pushed
`bracket:updated` messages they didn't re-ask for.

**This is the narrow fix, not the full pull-based conversion.** The
audit explicitly outlined a second, larger option (drop the WebSocket
entirely, poll `/bracket/state` instead) and explicitly recommended
against bundling it here — real, separate latency tradeoff, its own
decision. This CC-CMD is scoped to the guard only.

---

## Task 1 — Re-verify from HEAD before writing anything (Rule 87)

- Re-confirm the two `_bracketWS.open()`/`.close()` call sites are
  still exactly where found (line numbers may have shifted since the
  audit) — re-grep fresh, do not trust this doc's line numbers.
- **Read the two cited precedent locations in full**
  (`field.js` ~26198, ~26713) — these are the established
  backgrounding-sensitive-state pattern this fix must match, not a
  pattern to invent fresh. Confirm what they actually do (close on
  hidden? pause polling? something else?) before writing analogous
  code for `_bracketWS`.
- Re-confirm none of the six `visibilitychange` listeners have changed
  to already cover this since the audit — do not assume the audit's
  finding is still current without a fresh check.

## Task 2 — Add the guard, matching the established pattern

- New `visibilitychange` handling (or extend an existing listener if
  the precedent pattern shows that's how this file conventionally
  groups related concerns — follow Task 1's finding, don't guess):
  - On `document.visibilityState === 'hidden'`: if `_bracketWS` is
    currently open, close it (or stop it reacting to incoming
    messages — pick whichever matches the precedent pattern's actual
    approach, state which was chosen and why in the outbox).
  - On `document.visibilityState === 'visible'`: reopen `_bracketWS`
    **only if the app is still in `wc-mode`** at that moment. A user
    may have navigated away from WC mode via the in-app toggle while
    the tab was backgrounded (a different code path, already correct)
    — reopening in that case would reintroduce exactly the kind of gap
    this fix closes, from the other direction.
- This must be a no-op for any user who has never opened WC mode —
  confirm the guard checks for `_bracketWS` existing / `wc-mode` being
  active before doing anything, not unconditionally.

## Task 3 — Smoke + real verification, covering the actual edge case

- `node smoke.js` — 0 failures required.
- Real Playwright test, three real scenarios, not just "the code
  compiles":
  1. Open WC mode → dispatch a `hidden` visibilitychange → confirm
     `_bracketWS` closes.
  2. From that hidden state, dispatch `visible` while still in
     `wc-mode` → confirm `_bracketWS` reopens.
  3. **The specific edge case this fix must not get wrong**: open WC
     mode → background the tab (hidden) → navigate away from WC mode
     via the existing in-app toggle while still hidden → dispatch
     `visible` → confirm `_bracketWS` does NOT reopen (since the user
     is no longer in `wc-mode`, the existing explicit-navigation close
     already fired, and Task 2's reopen guard must respect that).

---

## Explicitly NOT in scope

- Do not touch `bracket-do.js` or any relay-side code — this is a
  client-only fix.
- Do not implement the full polling conversion — separate, later
  decision, not this CC-CMD.
- Do not extend this pattern to `GameDO`/`AmbientDO`/`UserDO`/
  `BrowserDO` — the audit flagged them as a candidate follow-up, not
  confirmed to have the same gap. Separate investigation if pursued.

---

## Outbox

`outbox/cc-session-2026-08-02-bracketdo-visibilitychange-guard.md`:
which precedent pattern was matched and why, the exact guard logic
added, and real pass/fail results for all three Playwright scenarios
in Task 3 — especially scenario 3, since that's the one a naive
implementation would most likely get wrong.
