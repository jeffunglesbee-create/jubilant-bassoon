# Claude Code Command — jubilant-bassoon's first client-side live invariant: no card stuck in a live state for a game the data says is final

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** one new test script + one new workflow. Do not touch `smoke.js`/`field_smoke.js` or any application code in this CC-CMD.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read CLAUDE.md and STANDARDS.md Rule 97 (CI-AS-INVARIANT-A) and Rule 47 (RELAY-CPU-A — this check reads rendered DOM state and named badges only, never computes or asserts on a composite drama/interest score) before touching this file.

Write findings to outbox/cc-client-live-invariant-2026-07-13.md.

## CONTEXT — explicit decision, not assumed: jubilant-bassoon should have this

Confirmed via audit: jubilant-bassoon has dozens of manual probe workflows and real Playwright viewport-audit infrastructure (`tests/desktop-chrome-viewport.js` et al., running against the real deployed Worker on every push) — but nothing that automatically checks a *live data invariant* the way field-relay-nba's `post-deploy-live-verify.yml` does for its own layer. The motivating bug (`f71ac727`, "MLB game cards stuck on Inn 9 forever after the game ended") is exactly the shape Rule 97 targets — two live witnesses (MLB Stats API status vs. the ESPN/V2 relay witness) disagreeing, with nothing standing guard against a regression. It was fixed with a real forced-scenario test, but nothing keeps checking it stays fixed against real, live, ongoing games.

**This is architecturally different from the relay's invariants, and the design must reflect that, not copy it blindly.** field-relay-nba's invariants query D1 directly from a GitHub Actions runner — no browser needed, the data itself is the thing being checked. jubilant-bassoon's invariant here is about *rendering* — whether the client's own JS correctly reconciles two data sources into the DOM. That can only be checked by actually loading the real deployed site in a real browser and reading the real rendered output, which is exactly what the existing Playwright infrastructure already does for viewport testing. Reuse it — do not invent a second browser-automation pattern.

**No fallback, only a fix — stated explicitly so this isn't quietly weakened later:** this check must load the real production URL and read the real DOM. A version that re-parses static `index.html` source (like `field_smoke.js` does) would not be a live invariant — it would just be `field_smoke.js` again under a new name. If real live data can't be found to test against at execution time (e.g., no game has transitioned to final recently enough), the check must report that honestly and pass conditionally, not fabricate a scenario or silently no-op forever.

## TASK 0 — Probe

```bash
ls tests/
cat tests/desktop-chrome-viewport.js | head -40
grep -rn "playwright\|puppeteer" .github/workflows/desktop-chrome-audit.yml
grep -n "espn-live\|espn-final\|data-state" index.html | head -10
```

Confirm the real Playwright setup pattern (package, launch args, how it reaches the deployed Worker URL) and the real DOM attribute/class names that distinguish a "live" card from a "final" card before writing anything — do not guess the attribute names from the CONTEXT section above.

## TASK 1 — Write the invariant check script

New file, `tests/client-live-invariant.js` (or the real established test-file convention if TASK 0 finds a different one). Logic:

1. Launch a real headless browser (same engine/config as the existing viewport tests), navigate to the real production URL.
2. Wait for the app to load and real game data to populate (reuse whatever wait-condition the viewport tests already use for "app ready," don't invent a new one).
3. Read the actual rendered DOM: for every visible game card, extract (a) the card's live/final visual state (whatever real attribute/class TASK 0 found), and (b) the underlying game status the app itself already fetched (read from whatever in-page JS state holds it — e.g. `window.espnScores` or the real equivalent TASK 0 confirms).
4. Assert: no card exists where the underlying data says the game is final/post but the card's own rendered state still shows live/in-progress.
5. If zero MLB (or any sport) games are currently in a final-transition-relevant state to check against, report that honestly (`SKIPPED — no relevant live data at check time`) and exit 0 — this is not a failure, it's an honest absence of a test case, matching the CONTEXT section's explicit instruction not to fabricate one.

## TASK 2 — Wire the workflow

New file, `.github/workflows/client-live-invariant.yml`. Trigger on `workflow_run` after this repo's own deploy-completion workflow (confirm the real workflow name via TASK 0-style probe of `.github/workflows/*.yml`, do not assume it's called `field-autodeploy.yml` without checking), matching field-relay-nba's `post-deploy-live-verify.yml` trigger pattern. Runs the TASK 1 script. Fails the job on a real violation.

## TASK 3 — Verification, proven not assumed

- Run the script for real against the actual current production site right now, report the real result (pass, or a genuine `SKIPPED` if no relevant live game exists at execution time).
- **Prove it can actually fail**, the same discipline the went_to_ot invariant used: find a real way to simulate the violation condition (e.g., a controlled test page, or — if the real site currently has zero relevant games — construct a minimal local HTML fixture reproducing the exact stuck-card DOM shape the original bug produced, run the checker against that, confirm it fails and names the problem) before declaring the check trustworthy. An invariant that has never been observed to fail has not been proven to work.
- Confirm the workflow triggers correctly (a real `workflow_dispatch` test run is acceptable if waiting for a real deploy-triggered run isn't practical within this session).
- Write outbox manifest per Rule 87.

## DONE CONDITION

A real, live, browser-based invariant exists, checks the real deployed site's real DOM against its own already-fetched data (not re-parsing static source), and has been proven to both pass on real current state and fail on a real constructed violation. This is explicitly scoped as the first instance proving the pattern, not a general framework — additional client-side invariants are real, separate future work, not built here (Rule 69).

**Confidence scoring:**
- TASK 0 probe confirms the real Playwright pattern and real DOM attribute names, nothing guessed (20 pts)
- TASK 1 script reads real rendered DOM against real in-page data, correctly handles the no-relevant-data case honestly rather than fabricating one (30 pts)
- TASK 2 workflow correctly wired to the real deploy-completion trigger (15 pts)
- TASK 3 proven to both pass on real state AND fail on a real constructed violation — not just observed passing once (30 pts)
- Zero fallback-style logic anywhere (no static-source-only fallback masquerading as a live check) (5 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
