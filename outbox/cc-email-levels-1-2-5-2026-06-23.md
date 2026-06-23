# CC-CMD-2026-06-23 — Night Owl Email Levels 1+2+5 — Pre-Build Probes

DATE   : 2026-06-23
PROMPT : docs/CC-CMD-2026-06-23-night-owl-email-levels.md
REPO   : jubilant-bassoon (sole)
HEAD   : 58adcc3 → (this commit)

================================================================
PROBE 1 — buildEmailHTML / getSportLanguage / dramaTierHeuristic / sendEmail
================================================================

cmd: grep -n on scripts/night-owl-email.js

Result (matches that drive the wiring):
   44: function dramaTierHeuristic(game)              ← Level 5 reuses this
   91: function getSportLanguage(game, diff)          ← still authoritative
  136: function buildEmailHTML(game, yesterdayStr)    ← edit target
  152: const { ... descriptor } = getSportLanguage(...) ← intact
  226: function sendEmail({ to, subject, html })       ← unchanged
  273: scored.map(dramaTierHeuristic)                  ← unchanged
  293: getSportLanguage(top.game, diff)                ← unchanged
  301: const html = buildEmailHTML(top.game, yesterdayStr)  ← MUST become buildEmailHTML(top.game, yesterdayStr, briefText, scorecard)
  304: const result = await sendEmail(...)             ← unchanged

Implication for Task 2: signature of buildEmailHTML changes to accept
relay briefText (Level 1) and precomputed scorecard (Level 5). Both
are optional — null/undefined preserves the template behaviour.

================================================================
PROBE 2 — espnEventId / ev.id in night-owl-email.yml
================================================================

cmd: grep -n "espnEventId\|ev\.id" .github/workflows/night-owl-email.yml

Result: NO MATCHES.

Implication for Task 1: ev.id is not surfaced anywhere yet. Each
fetch step's inline node block destructures `ev.competitions[0]` but
never reads `ev.id`. Confirmed insertion point is the returned object
literal in each step (NBA, NHL, MLB). Must add:
  espnEventId: ev.id,
to the NBA / NHL / MLB returned objects. WC is Level 3 territory — out
of scope for this prompt.

isNational also missing — confirmed for Level 5 wiring. Must detect via
comp.broadcasts (per Task 4) for each sport step.

================================================================
PROBE 3 — Relay /journalism/game/{id}
================================================================

cmd: curl https://field-relay-nba.jeffunglesbee.workers.dev/journalism/game/760456

Result: BLOCKED by sandbox network allowlist.
        "Host not in allowlist: field-relay-nba.jeffunglesbee.workers.dev"

Decision: PROCEED. fetchRelayBrief() must degrade silently to null on
any failure (per spec). Build accordingly — the 8s AbortSignal +
try/catch + null-return guarantees email still ships if the relay is
down. Verification happens in the workflow run (Task 5).

================================================================
PROBE 4 — ESPN scoreboard sample (ev.id surface)
================================================================

cmd: curl https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard

Result: BLOCKED by sandbox network allowlist.
        "Host not in allowlist: site.api.espn.com"

Mitigation: the existing workflow already calls this exact endpoint
and consumes ev.competitions[0] successfully. ev.id is a documented
top-level field on ESPN scoreboard events (used by every other ESPN
fetch path in the codebase, e.g. fetchScheduleData in index.html and
the journalism context-assembler). Treating ev.id as present is
verified by code, not by guess.

================================================================
SCOPE BOUNDARY COMPLIANCE
================================================================

DO list (Tasks 1, 2, 4 — in scope):
  → workflow: add espnEventId + isNational to NBA/NHL/MLB
  → email script: fetchRelayBrief() + briefText wired through main()
  → email script: design system rewrite (#f97316 → #f59e0b,
                  Chakra Petch + DM Mono Google Fonts, buildLeagueChip,
                  OT chip, PLAYOFF chip, em-dash → hyphen in score)
  → email script: Level 5 scorecard (scoreToGrade, ciDramaScore,
                  ciClosenessScore, ciPlotScore, computeScorecardCI,
                  gradeColor, becauseSentence, buildScorecardHTML)
  → main(): compute scorecard, pass to buildEmailHTML

DO NOT list (Level 3 / 4 deferred to Session 2):
  ✅ No WC fetch step added
  ✅ No QUICK RECAPS section
  ✅ No WHAT TO WATCH TONIGHT section
  ✅ No Odds Story enrichment
  ✅ No Brief Freshness Guard
  ✅ No Beehiiv / custom domain / personalisation
  ✅ index.html, sw.js, smoke.js untouched

================================================================
TASK 5 — MANUAL TRIGGER VERIFICATION (STAGED)
================================================================

Sandbox cannot reach GitHub Actions runtime. After this commit lands,
verification path is:

  Actions tab → FIELD Night Owl Email → Run workflow
    inputs.date_override = 2026-06-22
  → Inspect run logs for:
      • "📊 Evaluating N completed games" (N ≥ 1)
      • Either "📝 Relay brief: …" (success) or
        "Relay brief unavailable, using template fallback:" (graceful)
      • "✅ Night owl email sent (id: …)"
  → Inspect delivered email for:
      • Google Fonts loaded (Chakra Petch header, DM Mono score)
      • Score uses hyphen, not em-dash
      • Header / CTA gold (#f59e0b), not orange (#f97316)
      • League chip rendered with sport-specific colour
      • PLAYOFF chip only if isPlayoff
      • OT chip only if isOT or isShootout
      • Scorecard panel with DRAMA / CLOSENESS / PLOT grades + colours
      • "Because" sentences present when any grade is A* or B+

Unblock criteria (Rule 74): manual workflow_dispatch with the date
override succeeds and produces a single Resend message id with the
listed visual checks satisfied.

================================================================
COMMIT
================================================================

Single commit:
  "feat: Night Owl email Levels 1+2+5 — relay journalism, design system, Scorecard"

Files (expected):
  .github/workflows/night-owl-email.yml
  scripts/night-owl-email.js
  outbox/cc-email-levels-1-2-5-2026-06-23.md (this manifest)

Smoke gate (Layer 0): not triggered — none of the deploy-gate paths
(index.html / sw.js / field_utils.js / wrangler.jsonc) are touched.
node --check on scripts/night-owl-email.js is the syntactic guarantee.
