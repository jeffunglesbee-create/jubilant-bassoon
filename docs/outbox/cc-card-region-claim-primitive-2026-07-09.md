# CC Session Outbox — Card-Region Claim Primitive (CC-CMD-2026-07-09-card-region-claim-primitive)

**Date:** 2026-07-09
**Scope:** **Foundational infrastructure, not a bug fix** — nothing in
the codebase actively exercises this yet, since none of tonight's 75
UI-feature-bundle ideas are built. This builds `claimCardRegion()`
*before* multiple independent event-bus listeners start racing to write
into the same card region, so a future collision fails loudly (or at
least observably) instead of silently.

## PROBE BLOCK

`grep -n "CARD_ATTRIBUTE_SYNC" -A 20 index.html` — read the full
registry (~21727) and its consumer `syncCardAttributes()` (~21750).
Confirmed it is genuinely a different, narrower system: a registry of
`{name, isClass, compute}` entries, each producing ONE deterministic
value for ONE `card.dataset[name]`/CSS class from `compute({game,
score, card, isLive, isFinal})`. There is no concept of a claim, a
priority, a TTL, or competing writers anywhere in it — each attribute
has exactly one authoritative compute function, not multiple listeners
racing for the same slot. Confirmed by reading it, not assumed from the
CC-CMD's own characterization — this task builds a new, separate
primitive rather than extending `CARD_ATTRIBUTE_SYNC`.

`grep -n "fieldEvents.addEventListener" index.html` — all 8 real
current subscribers enumerated (`field:wp_update`, `field:all_final`
×2, `field:lead_change`, `field:final`, `field:crunch`,
`field:otw_changed`, `field:ws_fresh`). Grepped each for any existing
`priority`/`ttl`/`claim` pattern — none found. Confirmed none of them
already implement any form of claim/priority coordination that this
primitive would duplicate.

## TASK 1 — The primitive, built generically

Added `claimCardRegion(cardId, regionKey, {source, priority, render,
ttlMs=4000})` (index.html, immediately after `syncCardAttributes()`,
before `renderESPNScores()`) with a single shared `_cardClaims` registry
keyed by `` `${cardId}:${regionKey}` ``:

```js
const _cardClaims = {};
function claimCardRegion(cardId, regionKey, { source, priority, render, ttlMs = 4000 }) {
  const key = cardId + ':' + regionKey;
  const existing = _cardClaims[key];
  const now = Date.now();
  const expired = !!existing && (now - existing.at > existing.ttlMs);
  if (!existing || expired || priority > existing.priority) {
    render();
    _cardClaims[key] = { source, priority, at: now, ttlMs };
    return true;
  }
  return false;
}
```

Matches the spec exactly: plain caller-supplied integer priority (no
derivation from `fieldGameTier` or anything else), ties broken by
"existing claim wins" (`priority > existing.priority`, not `>=`, so an
equal-priority challenger never displaces the incumbent), TTL as an
independent OR'd condition (so an expired claim releases the region
regardless of the challenger's priority, not just when the challenger
happens to outrank it). **No feature-specific logic, no wiring to any
of the 75 bundle ideas** — the primitive itself, proven generic, not an
integration, exactly as scoped.

## TASK 2 & 3 — Proven via a realistic constructed collision, against the actual committed function

Extracted `claimCardRegion` **verbatim** from the committed file (not
reimplemented) and ran it in a Node `vm` harness with a controllable
mocked `Date.now()` (so TTL expiry could be tested deterministically
without a real 4-second sleep), simulating two synthetic claimants on
one card's subline region — a high-priority "walkout"-style claim
(priority 90) and a low-priority ambient claim (priority 10) — exactly
as two real `field:crunch` listeners would collide. 17/17 checks:

**Ordering A (low fires first, then high):** low wins its own
uncontested first shot (`render()` called once); high still wins
arriving second (`render()` called once); final registry state reflects
the high-priority claim.

**Ordering B (high fires first, then low — the reverse):** high wins
its own uncontested first shot; the low-priority claim correctly
**loses** to the already-held high claim (`render()` never called for
it — no silent overwrite); final registry state still reflects the
high-priority claim. Confirms the higher-priority claim wins
**regardless of arrival order**, not just when it happens to arrive
second.

**Equal-priority tie:** a second claim at the same priority as the
incumbent correctly loses (`render()` never called) — no thrashing.

**TTL expiry:** advanced the mocked clock past `ttlMs` (4001ms) after a
high-priority (90) claim — a **fresh LOWER-priority (10)** claim
correctly won, proving expiry alone releases the region independent of
priority comparison, not just when the challenger also outranks the
expired claim. Regression check: 1ms **before** expiry (3999ms), the
same lower-priority claim still correctly loses — confirming the TTL
boundary itself, not just "eventually it works."

## VERIFICATION (repo-level)

`node smoke.js index.html`: 899/0 (unchanged). `node field_unit.js`:
66/0. `node field_smoke.js index.html`: 21 failures, matches the
documented pre-existing baseline. All 3 inline `<script>` blocks
syntax-checked via `node --check`.

## POST-DEPLOY LIVE VERIFICATION

Deployed (deploy-gate green, HEAD `d528724`, `SW_VERSION` confirmed
live as `2026-07-09k`). Re-ran the collision test directly against the
actual deployed `window.claimCardRegion`/`window._cardClaims` in a real
browser session on production — not local `vm` reasoning — per TASK 3's
explicit instruction. This run used a **real** 250ms `ttlMs` and a
**real** `setTimeout` (no mocked clock, unlike the local `vm` pass),
against a synthetic test `cardId` cleaned up immediately after:

- Ordering A (low fires first, then high) and Ordering B (high fires
  first, then low) both correctly resolved to the higher-priority claim,
  confirmed via actual `render()` call counts, not just return values.
- Equal-priority tie correctly favored the incumbent.
- TTL expiry: after genuinely waiting past the real 250ms TTL, the
  expired high-priority claim correctly lost to a fresh lower-priority
  claim, `render()` was actually called, and the registry reflected the
  new claim.

**13/13 checks passed against the live, deployed function.** Test
registry entries deleted before the check resolved — no residue left on
production.

## DONE CONDITIONS

- [x] `CARD_ATTRIBUTE_SYNC` checked first; confirmed genuinely separate
      (single deterministic compute per attribute vs. this primitive's
      competing-claimant arbitration) — not assumed from the doc's own
      characterization
- [x] Primitive built generically — no bundle-specific logic, no
      dependency on features that don't exist yet
- [x] Both arrival orderings tested for the priority collision, both
      correctly resolve to the higher-priority claim (with actual
      render-call counts observed, not just return-value inference)
- [x] TTL expiry tested and confirmed to correctly release a stale
      claim, plus a regression check just before the boundary

## CONFIDENCE SCORING

- +20 — `CARD_ATTRIBUTE_SYNC` overlap genuinely checked by reading the
  registry and its consumer directly, not assumed: **met**
- +30 — primitive built generically, no premature bundle-specific
  wiring, matches the spec's exact signature and tie-breaking rules:
  **met**
- +30 — both priority-collision orderings tested and correctly
  resolved, verified via actual `render()` call counts in both
  directions: **met**
- +20 — TTL expiry tested and correct, including the boundary
  regression case: **met**

**Total: 100/100.**

## Commit

- Bumps `SW_VERSION` `2026-07-09j` → `2026-07-09k`.
- `index.html`: `claimCardRegion()` and `_cardClaims` registry added,
  placed alongside `CARD_ATTRIBUTE_SYNC`/`syncCardAttributes()`. No
  callers yet — explicitly out of scope per the CC-CMD (none of the 75
  bundle ideas are built).
- `sw.js`: `SW_VERSION` sync bump.
- This manifest.
