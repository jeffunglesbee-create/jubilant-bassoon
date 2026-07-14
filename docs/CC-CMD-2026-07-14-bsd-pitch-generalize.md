# Claude Code Command — Generalize BSD live pitch from WC-only to any covered league

**Date:** 2026-07-14
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to docs/outbox/cc-bsd-pitch-generalize-2026-07-14.md. Commit the outbox manifest with `[skip ci]` in the message.

## CONTEXT

BSD's live pitch visualization — ball tracking, momentum, shotmap, all rendered via `_bsdRepaint()` off real-time WebSocket frames — is fully built and working, but gated to World Cup games only via a sport-string regex (`_bsIsWC = /wc26|world cup|fifa/i.test(...)`). BSD's own backend coverage is broader: EPL, MLS (lid=18), UCL, La Liga, Serie A, Bundesliga, Ligue 1 all confirmed working, same as WC26. `bsdEventId` — injected by the relay via team-name matching against BSD's live pool specifically — is already null for any game not currently live and matched, regardless of sport. It's the correct, existing, authoritative signal for "does BSD cover this exact game right now" — the sport-string check adds no real information on top of it, and duplicating that decision through a second, more fragile path is exactly the shape of bug this session already found twice tonight elsewhere (the soccer league mislabel, the WC label fragmentation).

**Three real sites confirmed tonight, not assumed:**
1. `_bsdActivateForWC()` (~L34168) — internal filter `s._sport === 'wc26'` when scanning `espnScores` for a live game to subscribe to.
2. Bottom-sheet pitch rendering (~L42575) — `${(_bsIsWC && _bsBsdEventId) ? '<div id="bsd-pitch">...' : ''}`.
3. Post-game R2 replay read (~L42596-97) — gated the same way, **and** the R2 key itself is hardcoded `bsd/wc26/${_bsBsdEventId}/stats.json`.

**Scope of this CC-CMD: sites 1 and 2 only — the live-game path.** Site 3 (post-game replay) requires a matching relay-side fix to the R2 write path and key namespace (separate CC-CMD, separate repo, dispatched alongside this one — do not attempt to fix the R2 key format here without confirming the relay's real, new key format first, since a mismatch between what the client reads and what the relay writes would silently produce zero results, not an error).

## TASK 0 — Probe

```bash
grep -n "_bsIsWC\|_bsdActivateForWC\|_bsBsdEventId" index.html
```
Re-confirm the three sites and their real current line numbers (will have drifted). Read each in full context before editing — confirm `_bsdActivateForWC`'s real current filter logic and the bottom-sheet's real current condition structure.

## TASK 1 — Fix sites 1 and 2 (drop the sport check, gate on bsdEventId alone)

**Site 1 (`_bsdActivateForWC`):** change the internal filter from `s._sport === 'wc26' && s.state === 'in' && s.bsdEventId` to `s.state === 'in' && s.bsdEventId` — drop the sport check entirely. Consider whether the function's own name/comments ("Find a live WC game...", "Unsubscribe when leaving WC view") should be updated to reflect the new general scope, or left as historical naming with a comment noting the real current behavior — use judgment, note the choice in the outbox.

**Site 2 (bottom-sheet rendering):** change `${(_bsIsWC && _bsBsdEventId) ? ...}` to `${_bsBsdEventId ? ...}` — the pitch section now renders for any game with a real, live-matched `bsdEventId`, regardless of sport.

Leave `_bsIsWC`'s own definition and site 3 (the R2 replay block) untouched in this CC-CMD — site 3 is explicitly out of scope, per CONTEXT above.

## TASK 2 — Verify

- `node --check` equivalent (full-file script-block parse): clean.
- Real forced-condition test: a synthetic MLS-shaped game object (`_sport: 'mls'`, `state: 'in'`, a real-shaped `bsdEventId`) now correctly triggers pitch activation and rendering where it previously wouldn't have. A synthetic WC26-shaped object still works identically to before (non-regression). A game with `state !== 'in'` or no `bsdEventId` still correctly does not activate, regardless of sport.
- `node smoke.js index.html`: confirm same pass count as pre-change baseline, plus any new assertion this task adds for the widened behavior.

## DONE CONDITION

Live pitch visualization activates and renders for any BSD-covered live game with a real `bsdEventId`, not just World Cup games, verified via real forced-condition tests for both an MLS-shaped and a WC26-shaped case. Post-game replay (site 3) explicitly untouched, flagged as the separate relay-dependent follow-on.

**Confidence scoring:**
- TASK 0 confirms all three real sites and their current exact logic, not assumed from this doc's citations (25 pts)
- TASK 1 fixes exactly sites 1 and 2, leaves site 3 and `_bsIsWC` untouched as scoped (35 pts)
- TASK 2 real forced tests for MLS-shaped, WC-shaped, and inactive cases; smoke count confirmed (40 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.
