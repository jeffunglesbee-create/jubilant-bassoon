# Claude Code Command — Gap 6: Push Notification → Debrief Link

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole) + jeffunglesbee-create/field-relay-nba (push send path)
**Branch:** main — commit directly. No PRs.

**BLOCKED until The Debrief (assembleDebrief, fillDebriefSlots, .card-debrief) exists and is deployed. Do not attempt this CC-CMD before confirming that directly — a real check, not an assumption based on this doc's own age.**

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

---

## CONTEXT

Source spec: Drive doc "FIELD — Circadian System + Compound Gap Closers" (June 15 2026, APPROVED), Gap 6 section. Compliance-checked and corrected July 7-8 against ADR-002's push-pull reading of RUWT US 9,421,446: **CONDITIONALLY COMPLIANT** — game-final as trigger is an objective-event trigger, not a drama-threshold trigger, and is fine. Drama score itself is only ever shown inside The Debrief after a user opens it, which is the compliant, retrospective, user-pull pattern.

**One firm, explicit, non-negotiable patent-safety constraint, stated directly by the compliance check — this is not a style preference, it's a hard boundary:**

> Do not add drama-score gating to decide whether to fire the notification. If `drama_score > threshold` ever becomes the send condition, it crosses directly into patent scope. Trigger must remain game-final only.

**This CC-CMD's push payload logic must trigger on game-final status alone.** The spec's own example body text (`dramaScore > 75 ? "Drama: X/100" : "Game over"`) is a **content** choice inside an already-fired notification, not a **send-decision** — the notification fires regardless of drama score; only the wording of the body text may vary. If implementing this literally risks conflating "what text to show" with "whether to send," resolve that ambiguity conservatively: fire on every game-final, vary only the body copy, never gate the fire itself on `drama_score`.

---

## PRE-BUILD PROBE BLOCK

```bash
# Confirm The Debrief genuinely exists before proceeding — do not assume from doc age
grep -c "function assembleDebrief\|function fillDebriefSlots\|card-debrief" index.html
# If zero: STOP. Report that The Debrief still doesn't exist. Do not proceed.

git log --oneline -5
grep -n "gameId.*Final\|game.*final.*push\|pushPayload" index.html src/legacy/field.js 2>&1 | head -10
node smoke.js index.html 2>&1 | tail -3
```

If The Debrief is confirmed present, proceed. If not, stop and report — this CC-CMD stays blocked until then.

---

## TASK 1 — Real confirmation of the current push send path

Find the real, current game-final push notification send logic (relay-side, likely near GameDO's final-state hook or wherever push notifications are currently dispatched). Confirm what triggers it today, and confirm it is genuinely objective-event-based (game reaches final status) with no existing drama-score gating — if drama-score gating already exists somewhere in the current push path, report this as a real, separate compliance concern before proceeding, don't silently layer more logic on top of it.

## TASK 2 — Relay: add Debrief deep link to the push payload

In the real, confirmed send path from TASK 1, add the `data: { type: 'debrief', gameId, url: '/?debrief=' + gameId }` structure. Body text may reference drama score for wording only (per the CONTEXT section's resolution) — the send itself remains unconditional on game-final.

## TASK 3 — Client: service worker click handler

On notification click, open the URL with the debrief parameter. Confirm the real, current service worker click-handling code before adding to it — don't assume a structure from the month-old spec.

## TASK 4 — Client: read ?debrief=gameId on load

App reads the URL parameter on load and scrolls to that card with Debrief slots open — using the real `assembleDebrief`/`fillDebriefSlots` functions confirmed present in the probe block, not assumed interfaces.

## TASK 5 — Real verification

Confirm the push payload's send condition remains game-final only — a real code-level check, not just "I didn't add drama gating," but confirming no drama-score conditional wraps the send call anywhere in the diff. Full pipeline dry-run, real live verification per the standard established throughout tonight's esbuild work (real job logs, real post-deploy content check).

---

## DONE CONDITION

Push notifications on game-final carry a real Debrief deep link, click-through correctly opens and scrolls to the right card with Debrief slots populated, and the send trigger is confirmed, by direct code inspection, to remain unconditional on drama score — verified via real job logs and live content check.

**Confidence scoring:**
- Pre-condition (The Debrief exists): must pass before any scoring begins
- TASK 1 (20 pts): real current send-path confirmation, flags any pre-existing drama gating found
- TASK 2 (25 pts): relay payload addition, send condition confirmed unconditional on drama score
- TASK 3 (15 pts): real service worker click handler
- TASK 4 (15 pts): real client-side deep-link handling using confirmed Debrief functions
- TASK 5 (25 pts): real code-level confirmation of the patent-safety constraint, real live verification

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
