# CC-CMD-2026-06-23 — Night Owl Email Levels 3 + 4 — Pre-Build Probes

DATE   : 2026-06-23
PROMPT : docs/CC-CMD-2026-06-23-night-owl-email-levels.md (§ Level 3, Level 4)
REPO   : jubilant-bassoon (sole)
BASE   : 215960a (Levels 1+2+5 in main) — pulled clean.

================================================================
PROBE 1 — node --check on Level 1-2-5 baseline
================================================================

cmd: node --check scripts/night-owl-email.js
Result: PASS — no syntax errors. Baseline ready for Level 3/4 layering.

================================================================
PROBE 2 — Existing function inventory in night-owl-email.js
================================================================

cmd: grep -n "buildEmailHTML|fetchRelayBrief|buildScorecardHTML|WC_GAMES"

Result:
   33: async function fetchRelayBrief(espnEventId, sport)
  168: function buildScorecardHTML(scorecard, game)
  316: function buildEmailHTML(game, yesterdayStr, briefText, scorecard)
  342: const scorecardHTML = ... (inside buildEmailHTML)
  489: const briefText = await fetchRelayBrief(...)
  498: const html = buildEmailHTML(top.game, yesterdayStr, briefText, scorecard)

Implications:
  → buildEmailHTML signature must extend to accept `quickRecaps`,
    `tonightSlate`, and `stalenessWarning` for Levels 3 + 4.
  → No WC_GAMES code path exists; Level 3 must introduce it.
  → fetchRelayBrief established the silent-null-on-failure idiom;
    fetchOddsStory and checkLineupsChanged will mirror it.

================================================================
PROBE 3 — WC / WC_GAMES in night-owl-email.yml
================================================================

cmd: grep -n "WC_GAMES|wc" .github/workflows/night-owl-email.yml
Result: NO MATCHES.

Implication: Task 1 must add a brand-new "Fetch WC results" step
(pattern: NBA/NHL/MLB step) PLUS introduce WC_GAMES to the env block
on the merge step PLUS extend the `[...nba, ...nhl, ...mlb]` spread
to include `...wc`. espnEventId capture comes from the same `ev.id`
pattern wired by Session 1 in the other three sports.

================================================================
PROBE 4 — ESPN WC scoreboard sample
================================================================

cmd: curl https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard
Result: BLOCKED — "Host not in allowlist: site.api.espn.com".

Decision: PROCEED. The WC fetch step in the workflow uses the same
shape (`ev.competitions[0].competitors[]`, `ev.id`, `status.type.name`)
that NBA / NHL / MLB already consume in this same workflow. The shape
is verified by working code paths, not by guess.

fetchTonightSlate (Level 3 Section 3) calls the same family of
endpoints from inside the Node action runner (which DOES have egress
to site.api.espn.com), so the runtime path is the workflow run, not
this sandbox.

================================================================
PROBE 5 — Relay /odds/history/{espnEventId}
================================================================

cmd: curl -o /dev/null -w "%{http_code}" \
       "https://field-relay-nba.jeffunglesbee.workers.dev/odds/history/760456"
Result: BLOCKED — sandbox egress allowlist returns the standard
        "Host not in allowlist" body (the 403 reported is the proxy
        gateway, not the relay).

Decision: PROCEED. fetchOddsStory is wrapped in try/catch + 5s
AbortSignal + null-return, so the email never blocks on the route
being live. If the relay returns 404 / 500 / no `opening` field,
fetchOddsStory returns null and the slate row renders without the
line-movement sentence. Verification at workflow runtime.

================================================================
SCOPE BOUNDARY COMPLIANCE
================================================================

DO list (Tasks 1, 2, 3, 4 — in scope):
  → workflow: add Fetch WC results step + WC_GAMES env + spread
  → email script: buildQuickRecapRow, fetchTonightSlate (NBA + NHL +
                  MLB + WC), fetchOddsStory, checkLineupsChanged
  → email script: extend buildEmailHTML to three sections
                  (Top Game / Quick Recaps / What to Watch Tonight)
  → main(): orchestrate today-date computation, parallel slate fetch,
            staleness check for MLB top game, recap selection from
            scored.slice(1, 4), pass everything to buildEmailHTML

DO NOT list (per spec § NON-GOALS + scope intent):
  ✅ No Beehiiv / custom domain / personalisation
  ✅ No Brief Freshness D1 full integration (Level 4b stays SP-only)
  ✅ No Night Owl Audio
  ✅ Level 5 scorecard remains TOP GAME only — not duplicated per recap
  ✅ index.html, sw.js, smoke.js untouched

================================================================
TASK 5 — MANUAL TRIGGER VERIFICATION (STAGED)
================================================================

Verification path post-deploy:

  Actions tab → FIELD Night Owl Email → Run workflow
    inputs.date_override = 2026-06-22
  → Inspect run logs for:
      • "WC games found: N" line (new; N may be 0 if no WC game finals)
      • Existing "📊 Evaluating N completed games" includes WC entries
      • "📝 Relay brief: …" or graceful fallback for top game
      • "🌙 Tonight slate: N games" (new)
      • Per slate game: any "📈 Odds story:" line that fires (new)
      • For MLB top game only: any "⚠ Staleness warning:" line (new)
      • "✅ Night owl email sent (id: …)"
  → Inspect delivered email for:
      • Section 1 — TOP GAME hero card with brief + scorecard (Level 1-2-5)
      • Section 2 — QUICK RECAPS table with up to 3 rows; absent if
        no other games scored ≥ 2
      • Section 3 — WHAT TO WATCH TONIGHT with up to 3 upcoming
        games; absent if scoreboard empty
      • Odds line movement sentence appended on any slate row whose
        spread drift ≥ 2 points
      • MLB staleness warning above the brief prose ONLY when SP
        last name in ESPN lineup is absent from the brief text
      • Email width still constrained to max-width:560px (no
        horizontal overflow)

Unblock criteria (Rule 74): single workflow_dispatch run succeeds,
all three sections render, no JS error in step logs.

================================================================
COMMIT
================================================================

Single commit:
  "feat: Night Owl email Levels 3+4 — digest, WC, enrichment"

Files (expected):
  .github/workflows/night-owl-email.yml
  scripts/night-owl-email.js
  outbox/cc-email-levels-3-4-2026-06-23.md (this manifest)

Smoke gate (Layer 0): not triggered — none of the deploy-gate paths
touched. node --check on scripts/night-owl-email.js is the syntax
guarantee for the JS edits.
