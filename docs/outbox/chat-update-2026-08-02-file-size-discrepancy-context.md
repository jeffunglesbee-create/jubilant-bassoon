# chat-update-2026-08-02-file-size-discrepancy-context

**From:** chat (claude.ai)
**Status:** research only, no code changed. Requested to resolve two
open threads from today's CC sessions: (1) the recurring 2,600,000-byte
source ceiling flagged repeatedly since 2026-07-30, and (2) a same-day
false alarm where the live-deploy-verify probe initially reported
`NFL_DRAMA_PROFILES` as missing from the deployed bundle.
**Severity:** informational — resolves the immediate concern (the CC
session's false alarm), surfaces a stale doc worth fixing, no live
issue found.

---

## Finding 1 — the bundle-vs-source size gap is confirmed-intentional, not a bug

Today's CC session found the esbuild-bundled deploy artifact
(`build-bundle.mjs` output, pre-comment-strip) at 2,014,549 bytes vs
`src/legacy/field.js`'s ~2.6MB source — a ~700KB gap large enough to
raise a real concern that tree-shaking/dead-code-elimination might be
dropping shipped features (specifically `NFL_DRAMA_PROFILES`, which a
strict-pattern live-site grep initially reported "NOT FOUND").

**Resolved two ways:**
1. Direct evidence: a looser grep against the live site found the real
   data present, just esbuild-reformatted (`const` → `var` via scope-
   hoisting, added whitespace, `78.0` → `78` number normalization) —
   not missing. See `outbox/cc-session-2026-08-02-live-deploy-verify-
   resolved.md` for the full probe output.
2. Drive corroboration: **"FIELD App — July 18 2026 Session
   Documentation (Part 4 of 6)"** (Drive doc
   `1E6KL246AkR87oNyFt79yi6VoMbLAeu8YoKznpgwn7fs`) documents that
   esbuild's tree-shaking was deliberately verified as genuinely
   active on 2026-07-18, Phase 4 of the esbuild migration: "an unused
   export was added, built, confirmed to produce zero bytes in the
   output bundle, then reverted." This is the same mechanism
   responsible for today's size gap — it's real, intentional,
   load-bearing pipeline behavior established three weeks before
   today's session, not a new or accidental change.

**Net: no bug.** The size difference is expected. Any future session
seeing a bundle smaller than source should not treat that alone as
evidence of lost content — verify the specific feature directly (as
today's session correctly did) rather than inferring from aggregate
byte counts.

## Finding 2 — the 2,600,000-byte structural ceiling is a known, escalating, unrelated problem

Distinct from Finding 1 (that's about the *build-time* bundle; this is
about the *git-committed source* `index.html` that `smoke.js`'s A01
assertion gates on). Timeline from `HANDOFF.md`:
- First documented hit: 2026-07-30 ("index.html's 2,600,000-byte
  structural ceiling was crossed by this session's cumulative comment
  volume across all 4 CC-CMDs; trimmed verbosity only... to fit").
- Recurred repeatedly today (2026-08-02): 4+ consecutive commits
  needed real code compaction (not just comments) to fit — variable
  renames, marker-comment byte-shaving, a real orphaned-comment bug
  fix, disclosed nearby-code trims. See the outbox docs from today's
  NFL drama profile and byte-headroom-fix commits for the specifics.

**STANDARDS.md Rule 44 (Client-Side Size Budget)** is the only
governing doc for this, and it's stale:
- Baseline set 2026-05-25: "~1MB source, ~250KB Brotli-delivered."
  Actual current state is ~2.6x that baseline (2.6MB source).
- Target stated: "<400KB delivered (achievable with minification build
  step)." Not being tracked or re-verified against current reality
  anywhere I could find.
- References "minification spec below" — **this section no longer
  exists in STANDARDS.md**, a dead cross-reference (checked via direct
  grep across the full file). Either orphaned during a doc
  restructure, or never written.
- The actual 2,600,000-byte smoke gate (A01) is presumably a later,
  separate addition — no doc ties the two together or explains how
  2,600,000 bytes relates to the original ~1MB/400KB targets.

## Finding 3 — a prior, unshipped proposal exists for exactly this problem

Drive doc **"FIELD_Handoff_Optimization_Pipeline_v32"**
(`14E7cnN_BL-xOasohhM_WRHIZ8IL4AWNdxETr-HqAvLg`, 2026-05-16, Gemini-
authored) proposes a `FIELD_BUILD_FLAGS`-style build-time dead-code
macro (`if (FIELD_BUILD_FLAGS.IS_DEBUG) {...}` blocks that minifiers
can strip via constant-condition elimination) targeting a ~550KB
ceiling. Per the existing "FIELD — Handoff v27-v32 Deep Analysis"
review doc (`1dGVrboIG3ocp3AtttGcMR7eT9XsUFLP_ZB4mBr8tvRM`), v27-v32 as
a batch skew toward "genuinely excellent engineering concepts applied
to the wrong problem" and Wow-numbers above #39 aren't validated
roadmap items — so this specific proposal was never vetted or
implemented, and I'm not asserting it's correct as-is. Flagging it only
as existing prior art if a real structural fix to Rule 44 / the A01
ceiling is ever scoped, so it isn't reinvented from scratch.

## What this is NOT

Not a claim that the file-size ceiling itself needs to change today —
that's Jeff's call, already asked and not yet answered per multiple
CC session reports. Not a claim that anything is currently broken —
Finding 1's concern was fully resolved with real evidence; nothing
shipped today is missing or wrong. This is context-gathering only, in
response to being asked to check Drive/markdown for the full picture
behind today's investigation.

## Recommended next step, if wanted

A real CC-CMD to: (1) fix or remove the dead "minification spec below"
cross-reference in STANDARDS.md Rule 44, (2) re-baseline Rule 44's
numbers against current reality (2.6MB source, ~1.9MB bundled,
whatever the real Brotli-delivered size is — unverified, not measured
this session), and (3) decide, with Jeff, whether the 2,600,000-byte
A01 ceiling should move, and if so to what, with an explicit rationale
tied to real numbers rather than ad-hoc per-commit trimming. Not
started here — this doc is research only, per what was asked.
