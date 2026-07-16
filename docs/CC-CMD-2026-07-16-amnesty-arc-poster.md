# Claude Code Command — Arc Poster: server-rendered shareable PNG via Browser Rendering

**Date:** 2026-07-16
**Repo:** jeffunglesbee-create/jubilant-bassoon (client half) + jeffunglesbee-create/field-relay-nba (relay half, poster template + screenshot route). Two real, separate repos — same split pattern as every other cross-repo dispatch this project uses.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git pull; git log --oneline -5. (Run the equivalent against field-relay-nba before touching that repo's half.)

Write findings to docs/outbox/cc-amnesty-arc-poster-2026-07-16.md (client) and outbox/amnesty-arc-poster-2026-07-16.md (relay). Commit each with `[skip ci]` unless confirmed working end-to-end, in which case commit normally so it deploys.

## CONTEXT — the source doc's own premise is wrong on this one item, corrected here

The "Post-Game Card Face + Tap Spec (Amnesty Zone)" doc (May 27 2026) describes Arc Poster — a shareable, branded PNG card for high-drama completed games — as "currently a standalone React prototype (CowserWalkoff.jsx, master template OriolesMagic.jsx)," estimating "~60 min" to wire it in.

**Verified false, not assumed:** these files do not exist anywhere — not in this repo, not in field-relay-nba, not in Drive, not in git history reachable from either working tree. There is no React runtime and no build step in either repo (jubilant-bassoon is a zero-build single-file vanilla-JS PWA per `CLAUDE.md`; confirm field-relay-nba's own equivalent before assuming). This is a from-scratch build, not a 60-minute integration. Do not go looking for the prototype files — they have already been confirmed absent.

**The real path forward, found this session:** Cloudflare Browser Rendering — headless Chromium via a Durable Object on the relay, spec'd in full in a real Drive doc ("FIELD — Browser Rendering MCP: Chat-Controlled Headless Browser", June 22 2026) — is either already deployed or fully spec'd and ready to deploy. Its MCP tools (`browser_navigate`, `browser_quick`, `browser_interact`, `browser_extract`, `browser_close`) were confirmed present and callable in the session that wrote this CC-CMD. This lets Arc Poster be built as a normal server-rendered HTML/CSS page, screenshotted server-side — no React, no client-side canvas/rasterization library, reusing FIELD's own existing CSS custom properties so the poster actually matches the app's real visual language instead of a new design system.

**Compliance basis for rendering the drama data server-side at all — read `docs/ADR-002-CONTEXT.md` Rules A/B/E directly, don't take this summary's word for it.** Moving arc-score rendering onto the relay (this CC-CMD's whole design) is exactly the kind of relocation the *older*, more restrictive ADR-002 reading would have blocked outright. The corrected reading (dated addition citing "the RUWT re-analysis session, 2026-07-07") makes the operative boundary autonomous push vs. pull, not computation location — Rule A/B/E permit the relay to compute, render, and serve derived/composite drama state of any shape, "under the same guardrail as Rule A: never as the trigger for an unprompted, autonomously-sent notification." The poster route in this CC-CMD is entirely pull-triggered (a user tap fetches it) — it is compliant on that basis alone, independent of the amnesty-zone display exemption `CC-CMD-2026-07-16-amnesty-card-face.md` relies on. **Hard guardrail, same as the leaderboard CC-CMD:** the poster route and its underlying data must never become a trigger for an autonomous push (e.g. "a new Arc Poster is ready" sent without the user asking) — grep the relay's push-trigger code paths and confirm zero references before closing this out, and state that check's result explicitly in the outbox.

## TASK 1 — Probe, non-negotiable, first (relay)

Confirm Browser Rendering is actually deployed and callable right now, not just spec'd. Call `browser_navigate` or `browser_quick` (or whatever the currently-available tool surface actually is — confirm the real tool names, they may have changed since June 22) against a real, simple URL and confirm a real screenshot returns. **If this fails or the tools don't exist:** this CC-CMD's scope becomes deploying the June 22 spec first (it is fully written — Drive doc, referenced in this session's plan file) before anything below. Do not improvise a different PNG-generation approach without reporting this back — the whole point of this CC-CMD is using this specific, already-designed infrastructure.

## TASK 2 — Poster template (relay)

A new relay-served HTML page/route (e.g. `/poster/:gameId` or similar — confirm this repo's own routing convention and match it) rendering: final score, the arc sparkline (reuse `buildDramaSparklineSVG`'s actual SVG output shape from the client repo — port the same generation logic server-side, or have the client pass pre-rendered SVG markup to the relay; decide based on what's actually simpler given the real data each side already has access to), personality label (reusing the same taxonomy as `CC-CMD-2026-07-16-amnesty-card-face.md`'s arc badge — don't invent a second, different label set), the Night Owl narrative line, FIELD's wordmark. Reuse FIELD's real CSS custom properties (`--gold`, `--green`, `--obsidian`, etc. — confirm current exact values from `index.html`'s `:root` block) so this looks like the actual app, not a new design.

## TASK 3 — Screenshot route (relay)

Wire Browser Rendering to navigate to the poster template and return a PNG. Confirm real size/format constraints from the June 22 spec (500KB screenshot cap, resize behavior) and whether they're appropriate for a shareable poster (probably want higher quality than the debugging-screenshot use case the spec was originally designed for — check and adjust if needed, document the reasoning).

## TASK 4 — Client wiring (jubilant-bassoon)

Add the "Arc Poster ↗" CTA chip (arc ≥ 75, matching `CC-CMD-2026-07-16-amnesty-card-face.md`'s own threshold — confirm that CC-CMD's real, as-shipped threshold rather than assuming 75 is still exactly right) to the card face and/or bottom sheet, wherever those two CC-CMDs actually landed it (check `git log` — don't assume both landed, this CC-CMD must work whichever subset has shipped). Tap fetches the PNG from the relay route and hands it to the **already-existing** `shareGame()` (`navigator.share()` path, index.html ~L39912-39932) — do not build new share plumbing, confirm the real current signature first.

## TASK 5 — Explicitly out of scope

Walk-off/buzzer-beater auto-trigger detection (arc ≥ 95 override in the source doc). Confirmed zero existing infrastructure for this in any sport. Needs its own CC-CMD investigating whether current data sources (ESPN situation objects, play-by-play feeds) can even support per-sport walk-off detection before it's scoped — do not attempt to build this here even if it looks small.

## TASK 6 — Verify

Real screenshot round-trip against a real finished, high-drama game (query the archive D1 database for a real game with drama_peak ≥ 75 to test against, don't use a placeholder). Confirm the resulting PNG actually renders FIELD's real visual language (spot-check the image, don't just confirm "a PNG was returned"). Confirm the share flow reuses `shareGame()` without modifying its existing live-game behavior — diff-check that function's other call sites are unaffected.

## DONE CONDITION

Tapping the Arc Poster CTA on a real, high-drama finished game produces a real PNG (verified by actually looking at it, not just confirming a byte count) matching FIELD's visual language, shared via the existing `navigator.share()` path with zero regression to that function's other callers.

**Confidence scoring:**
- TASK 1 (25 pts): Browser Rendering confirmed actually deployed and working, not assumed from the spec doc
- TASK 2-3 (35 pts): poster template + screenshot route produce a real, correctly-styled PNG
- TASK 4 (25 pts): client wiring correctly reuses `shareGame()`, correctly matches whatever card-face/sheet work has actually landed
- TASK 6 (15 pts): real verification against a real high-drama game, visual spot-check not just a byte-count check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.
