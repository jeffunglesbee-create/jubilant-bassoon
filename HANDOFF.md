# FIELD HANDOFF — 2026-06-09 (Patent Audit Session)

## HEADS
- jubilant-bassoon HEAD: 96f7bc3
- SW_VERSION: 2026-06-09d
- Smoke: 531/0
- field-relay-nba: 790f9da (unchanged)

## SESSION TYPE
TYPE D (Patent Audit — read-only, docs only)
No index.html changes. No relay changes. No feature builds.

## WHAT SHIPPED THIS SESSION

### ADR-002 Continuation Patent Addendum (96f7bc3)
.github/adr/ADR-002-continuation-patent-addendum.md committed.
Documents US9744427B2 + US10328326B2 analysis.
NEW RULE E: No SSR of drama state — client-rendered PWA is a patent compliance requirement.
RULE A scope expanded: relay storing no ratings now covers both "no rating engine"
AND "no state for change detection under '328 Claim 12."

### PPUBS Pipeline — Continuation Patents Fetched
GitHub Actions run 27241140960.
New: outbox/patents/US9744427.txt, US9744427.json, US9744427-compare.md
New: outbox/patents/US10328326.txt, US10328326.json, US10328326-compare.md
Both committed via patent-fulltext.yml workflow.

### RUWT Patent Analysis — All Three Patents
US9421446 (original), US9744427 (2017), US10328326 (2019) all analyzed.

KEY FINDINGS:
- '427: "game statistics" replaces "live in-game statistics." Claim 10 adds
  "prior to completion" explicitly. All ADR-002 defenses hold unchanged.
- '328 CHANGE 1: Threshold removed from primary method claim (Claim 12).
  Notification when rating "changes" — not when it meets threshold.
- '328 CHANGE 2: Web site display explicitly claimed (Claims 7-8).
  Targets the "each browser renders it" defense. Rule E addresses this.
- '328 CHANGE 3: API and web service delivery explicitly claimed (Claims 9-10).
  Targets relay-style delivery. ADR-002 Rule A addresses this.

TWO LOAD-BEARING DEFENSES (hold across all three patents):
1. Coupled apparatus requirement — "rating engine AND notification engine
   coupled to the rating engine" in all apparatus claims, all three patents.
   FIELD's three-component decoupled architecture defeats all apparatus claims.
2. Stateless relay change-detection incompatibility — '328 Claim 12 requires
   notification "when rating changes"; detecting change requires state; relay
   stores no drama scores; cannot detect changes.

### Six Novel Loopholes Assessed
Loopholes 1-4 survive in revised/salvaged form.
Loophole 5 retired as primary argument (moot for '328 primary claims).
Loophole 6 resolved (continuations now analyzed).

## DEFERRED — TUE JUN 10 2026 10AM ET
1. R2 WC team context (Drive 17D_EzrqoNUR4LN4OK3hr6MqKFUHitWlO72O1CWmqLks)
2. WC journalism tab brief

## OPEN ISSUES

### HIGH (product)
- Series dots board (~40 lines) — spec surface 6a
- Arc sparkline SVG (~25 lines) — spec surface 6b
- WHOLE FIELD toggle (~30 lines) — spec surface 6c
- Night Owl amnesty arc (~20 lines) — spec surface 6d (mini-spec approved)
- State transition timeline (~30 lines) — spec surface 6e
- Drama spectrum RUWT-safe (~60 lines) — spec surface 6f
- Focus trap bottom sheet (0 :focus-visible, 0 aria-modal)

### STANDARDS.md rules to add (from this session)
- Drama Dial = personal change relevance filter (not interest threshold)
- Push notification content = named game state (not rating change language)

### ADR-002
- Still PROPOSED — not ratified by counsel
- Free attorney consultation needed for split-operations live drama scoring question

### INFRA NOTE
.git is in .assetsignore — permanent. See CI/Deploy Addendum (INCIDENT 11).

## SMOKE
531/0

## SESSION DOCS
- Patent Audit session doc: Drive 1I0Amjq-Qi1dAe0b5LGLdJYLkN3YNZWbb
- ADR-002 Continuation Addendum: Drive 1zTM69EnF9F5zljkBD-sGVmfl2Az1ys_2
- Novel Loopholes Assessment: Drive 1WF3dyFvOhrWfuIUs82uwfwdU64dTsjQA
- Continuation Claims Analysis: Drive 1Dg-8wlERW4Nt7mFv01TpsTTkZvlI-Ih7
- Prior session docs (M-item / bug audit): Drive 1mmdKe6IDIeebXlM5J34tiFoyyG7fWQaw
- C/H/M Item Registry: Drive 1XEdWui58L5YCn2-CoN5NEcDrNdcsf2Ah
- Drive Current State: 1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA
- Drive CI/Deploy (main): 1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo
