# FIELD Handoff — May 29 2026 (Session End — TYPE B: Remove Tier 1 / Decouple Tier 2 docs on Drive)

## SESSION TYPE
TYPE B — Documentation fix. No code changes. No smoke impact.

## Code HEAD
`65948b3` — STANDARDS.md: canonical table updated (Build Session List ID fixed, Infrastructure Backlog added). Smoke 242/0 (unchanged).

## COMPLETED THIS SESSION

### Tier 1 removed from Build Session List
TIER 1 — DEADLINES section removed. Reason: May 24 (PL Final Day) and May 25 (ATP relay) items are past. June 3 (NBA Finals G1) and June 11 (World Cup 2026) are live in HANDOFF.md TIER 0 DEADLINES. The deadline tier had no maintenance owner and was going stale.

### Tier 2 decoupled to standalone Infrastructure Backlog doc
New canonical doc: **FIELD — Infrastructure Backlog (Tier 2)**
Drive ID: `1n4mYHB-k_X5pKrNuUFV7FK0YlolIPkNpGAkegGAUVHw`
Contains all [PIPELINE A/B], [OTW A], [PWA-A/B/C], [LAYER3-EXT], [MOBILE-INTEL-A], [PUSH A/B/C], [UPDATE S0/S1], [PRIVACY A/B] items with full specs.

### Build Session List v7.26 draft created
Drive ID: `1C9Lx5WBD9xe_EAeilryNjN8keimpAgpyE_I50RGiKGY`
This is a **DRAFT** — content for Jeff to copy-paste into the canonical Build Session List doc (`19TicpFBU2ORbypNBteCXuhwbX1FoP14Y2NGuU9e3drQ`) per Rule 8 (edit in place, ID stays permanent). Contains: Tier 1 removed, Tier 2 replaced with reference line + new doc ID, KEY DOC IDs updated.

### STANDARDS.md canonical table fixed
- Build Session List ID corrected: `1Drrp5eRNdGb8EKodqPNwpuLaC23XcOrlv4DO13zNot0` (stale) → `19TicpFBU2ORbypNBteCXuhwbX1FoP14Y2NGuU9e3drQ` (current)
- Infrastructure Backlog (Tier 2) added as new canonical doc

## ACTION REQUIRED (Jeff — Drive write access needed)
1. Open canonical Build Session List `19TicpFBU2ORbypNBteCXuhwbX1FoP14Y2NGuU9e3drQ`, select all, replace with content from v7.26 draft `1C9Lx5WBD9xe_EAeilryNjN8keimpAgpyE_I50RGiKGY`, then delete the draft.
2. Optional: open FIELD Current State `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA` and add Infrastructure Backlog ID to canonical IDs section.

## STILL OPEN (carried from prior handoff)
- Verify journalism recovery once Gemini quota resets
- Dropbox refresh-token: add 3 secrets, re-dispatch workflow
- VAPID browser opt-in test (Jeff): click Enable on live site
- Golf Doc 1 (Drive `1Ak_GPXkiKUvUr6dUpcto0BUbhKTibIwgR-o8SYUeBfM`): scrub PGA embedded key + mark DECOMMISSIONED
- Merge data-sourcing matrix verified cells into MASTER scaffold `1LUuR0CLWUvIc94Vou46VmeTLz1n-Y6YAz0F0MX6GR-M`

## TIER 0 DEADLINES
- NHL SCF shell (CAR closing ECF)
- NBA Finals G1 shell (June 3, vs NYK)
- World Cup 2026 Phase 1 (June 11 HARD)
- USPTO provisional (~June 25)

## CANONICAL IDs
CI/Deploy Ref: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
Repo: jeffunglesbee-create/jubilant-bassoon
Relay repo: jeffunglesbee-create/field-relay-nba
Build Session List (canonical): 19TicpFBU2ORbypNBteCXuhwbX1FoP14Y2NGuU9e3drQ
Infrastructure Backlog (Tier 2): 1n4mYHB-k_X5pKrNuUFV7FK0YlolIPkNpGAkegGAUVHw
Journalism Quality Spec: 1oSj9Wl9lZl_RGGElZdn_dhI4s3vzvnkv5HazELKSw-0
Data-Sourcing Legitimacy Matrix (MASTER): 1LUuR0CLWUvIc94Vou46VmeTLz1n-Y6YAz0F0MX6GR-M
