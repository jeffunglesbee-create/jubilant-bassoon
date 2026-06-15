# Claude Code Command — Fix Desktop Audit CI Failures

git pull. Read CLAUDE.md.

## CONTEXT

The desktop viewport audit workflows (shipped by CC today, commits 78308af–1749ce5)
ran for the first time and both failed. Rule 59 audit of the code itself passed —
the failures are CI configuration issues, not test logic bugs.

### Chrome failure (both D1 + D3)

Failed step: "Install Chrome + chromedriver"

The workflow runs `sudo apt-get install -y google-chrome-stable` but the Google
Chrome apt repo is NOT configured on GitHub Actions ubuntu-latest. Chrome IS
pre-installed on ubuntu-latest — the install step is unnecessary and breaks.

Fix approach:
- Remove the apt-get install. Use the pre-installed Chrome.
- For chromedriver: use `npx chromedriver` or install only chromedriver matching
  the pre-installed Chrome version. `google-chrome --version` gives the version.
  The `chromedriver` npm package auto-downloads the matching version.
- Verify: `which google-chrome` and `google-chrome --version` should work on
  ubuntu-latest without any install step.

### Safari failure (D3 only — D1 PASSED)

D1 (1366×768) passed all 12 assertions on real WebKit. D3 (1920×1080) failed at
"Run viewport assertions" — meaning the test ran but assertions failed.

This could be:
1. A real layout issue at 1920×1080 that A612 didn't cover
2. A Safari window sizing limitation (macOS may not allow 1920×1080 window on
   the CI runner's display resolution)
3. An assertion that's too strict for the wider viewport

Investigation steps:
- Check the stderr log and JSON output from the D3 run (may be in artifacts)
- If Safari can't resize to 1920×1080 on the CI runner, adjust D3 to use a
  smaller "desktop" size that macOS supports (e.g., 1440×900)
- If it's a real layout issue, document the finding in the outbox file but
  do NOT fix index.html — flag it for chat review

## RULES

- Single-concern commits (Rule 7)
- Smoke gate: 656/0 must hold
- Do NOT modify index.html or sw.js
- After fixing, re-trigger both workflows: `gh workflow run desktop-chrome-audit.yml`
  and `gh workflow run desktop-safari-audit.yml`
- Wait for results. If they pass, note it. If they fail again, document the new
  failure in the outbox file — do not iterate more than twice.

## OUTPUT

Write findings to outbox/cc-desktop-ci-fix-2026-06-15.md. Include:
- What was changed in each workflow
- Whether re-triggered runs passed or failed
- If Safari D3 is a real layout issue, describe what assertion failed and why

Run smoke. Push when complete.
