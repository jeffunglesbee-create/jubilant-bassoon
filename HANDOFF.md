# FIELD Handoff — May 25 2026 Session 17

HEAD: b26d875 (code unchanged — analysis session)
Smoke: 165/0
Deploy: No code deploy this session
SW_VERSION: 2026-05-25a

## WHAT CHANGED

Analysis + documentation session. No code changes.

Rule 44 added to STANDARDS.md:
  Client-side size budget (~20KB/commit threshold).
  Patent note embedded: classification stays client-side always.

## KEY FINDINGS (Session 17)

CLIENT SIZE + PATENT DEFENSE:
  - File size and patent defense are UNRELATED. Bigger client = stronger defense.
  - Real "too big" problem is PERFORMANCE, not patent risk.
  - Tiptoe risk is organizational — ADR-002 already addresses it.
  - What can move server-side: prose, templates, raw data.
  - What MUST stay client-side: dramaScoreLive(), classifyGame(), OTW, badges.

NATIVE APP:
  - File size concern disappears (native users expect 5-15MB installs).
  - Patent defense STRENGTHENS on native (compiled, on-device hardware).
  - Background execution is the big unlock — reliable client-side eval.
  - Build pipeline handles minification automatically.
  - One genuine trade-off: deployment velocity → content decoupling required.
    Schedule data, broadcast registry must be relay-fetched, not hardcoded,
    to enable content updates without App Store submission.

PERFORMANCE MITIGATION (no patent risk):
  1. Minification build step (HIGH) — 60-70% size reduction
  2. Lazy-load schedule data (MEDIUM) — parse time + native prep
  3. Web Workers for scoring (LOW) — off-main-thread, still client-side
  4. Rule 44 size budget (ONGOING) — in STANDARDS.md now

Doc: Drive 1F1tzmSQm0NeENBi9_pMSR5yWX42ohYjriWZHThkiOxw

## NEXT SESSION

1. TYPE A DAILY UPDATE (May 26 — URGENT):
   - Bump SW_VERSION → 2026-05-26a (Rule 23!)
   - Check results: NBA ECF G4, NHL ECF G3, EFL L2 Final
   - Add Tue May 26 MLB slate + Peacock GOTD
   - Run: node scripts/rotate-schedule.js

2. Commit STANDARDS.md (Rule 44 added this session)

3. Update Current State doc (stale since May 25 morning)

4. SCORE-UNIFORM-A (~45 min) — active bug, next TYPE B

5. Minification build step — highest-leverage performance item
