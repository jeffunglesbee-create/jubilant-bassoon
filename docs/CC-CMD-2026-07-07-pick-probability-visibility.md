# CC-CMD: Make the silent missing-probability case visible, not fixed blind

**Date:** 2026-07-07
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

**Source:** direct trace of `_resolvePickIfExists()` (`index.html:27903`)
found a real, currently-invisible gap: if the relay's `/user/event`
`pick_resolved` response is falsy (`if (!resp) return;`) or simply
doesn't include `resolvedProbability`/`probabilityLabel`, the pick
stays permanently resolved-with-no-probability-line — no log, no
retry, no signal anywhere that this happened. Nobody currently knows
whether this occurs rarely or often, because there's no visibility at
all.

**Deliberately not "fixing" this by guessing at a cause** — a retry
loop, a fallback probability source, or anything more elaborate would
be solving a problem whose actual frequency and cause are both unknown
right now. The correct first step is visibility, using the existing,
already-established telemetry pattern (`_userDoRelay('/user/event',
'POST', {type:'...', ...})`, already used for `pick_made`,
`pick_resolved`, `watch_open`, `peak_missed`) — not inventing a new
tracking mechanism.

## PROBE BLOCK
```bash
sed -n '27903,27928p' index.html
```
Confirm this still matches — especially the two real failure points:
`if (!resp) return;`, and the two `if` guards that conditionally set
`resolvedProbability`/`probabilityLabel` from `resp`.

## TASK — Emit a typed event for each real failure point, distinguishable

Two genuinely different cases, worth telling apart:
1. **Relay didn't respond at all** (`resp` falsy) — likely network/relay
   issue, unrelated to probability data specifically.
2. **Relay responded, but without probability data** — likely means the
   win-probability resolver didn't have a source for that sport/game at
   resolution time.

Add event emission for both, using the exact existing pattern:
```javascript
_userDoRelay('/user/event', 'POST', { type: 'pick_resolved', gameId, wasCorrect }).then(resp => {
    if (!resp) {
      _userDoRelay('/user/event', 'POST', { type: 'pick_probability_missing', gameId, reason: 'no_response' });
      return;
    }
    const cache2 = _getPickCache();
    const p2 = cache2[gameId];
    if (!p2) return;
    if (resp.resolvedProbability != null) p2.resolvedProbability = resp.resolvedProbability;
    if (resp.probabilityLabel) p2.probabilityLabel = resp.probabilityLabel;
    if (p2.resolvedProbability == null || !p2.probabilityLabel) {
      _userDoRelay('/user/event', 'POST', { type: 'pick_probability_missing', gameId, sport: p2.sport || '', reason: 'no_probability_in_response' });
    }
    _savePickCache(cache2);
    ...
```
Confirm the exact current variable names/structure at the real line
numbers before editing — do not assume the sketch above matches
verbatim.

## VERIFICATION

- `node smoke.js index.html` clean.
- Confirm both new event-emission call sites are reachable — trace
  through the logic by hand (or with a real test pick, if a resolvable
  test case is available) rather than only reading the code.
- Confirm this is genuinely additive — the existing resolution logic,
  cache-saving, and widget re-render are all untouched, only the two
  new typed events are added.
- Note in the outbox: this CC-CMD makes the gap measurable. It
  deliberately does not attempt to determine the real-world frequency
  of either failure case (that requires the events actually firing in
  production over time) or propose a fix beyond visibility — report
  this scope honestly, don't imply more was resolved than was.

## DONE CONDITIONS
- [ ] Probe block confirms citation before editing
- [ ] Both failure points now emit a typed event via the existing `_userDoRelay` pattern
- [ ] The two cases (no response vs. response without probability) are distinguishable via `reason`
- [ ] Existing resolution/cache/render logic confirmed untouched
- [ ] Smoke clean
- [ ] Outbox honestly scopes this as visibility-only, not a fix for an unknown-frequency problem

## CONFIDENCE SCORING TABLE
+35  Both event emissions added correctly, using the exact existing pattern
+25  Two failure cases correctly distinguished via `reason`
+20  Existing logic confirmed untouched
+10  Smoke clean
+10  Outbox honestly scopes this as visibility, not a fix

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-07-pick-probability-visibility.md.
Add a pick_probability_missing event (via the existing _userDoRelay
telemetry pattern) at both real failure points in
_resolvePickIfExists() -- no response from the relay, and a response
that lacks resolvedProbability/probabilityLabel. Distinguish the two
via a reason field. This is visibility only -- do not add a retry, a
fallback, or any other fix, the actual frequency of this failure is
currently unknown and that's what this CC-CMD exists to start
measuring. Do not commit unless confidence >= 95. If score < 95, report
verbatim and stop.
