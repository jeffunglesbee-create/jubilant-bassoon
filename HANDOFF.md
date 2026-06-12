# FIELD Handoff — June 12 2026 (WC Schedule + Design System v2)

**jubilant-bassoon HEAD:** cde57d5 · **relay HEAD:** dc534c2 · **Smoke:** 612/0 · **SW_VERSION:** 2026-06-12e

## What shipped today

### Relay (field-relay-nba)
- `75be36b`: Germany vs Ecuador odds injection (auto-dedupes Jun 25)
- `ef7a956`: Bracket slot deduplication (no team repeats per round)
- `dff7c34`: Tier 1 Bayesian strength update (PRIOR_WEIGHT=3, opponent-adjusted)
- `dc534c2`: **Coherent bracket** — modal groups → R32 → Poisson favorites feed forward R32→R16→QF→SF→Final. Each team exactly once. R16 participants ARE R32 winners.

### Client (jubilant-bassoon)
- `394a5c8`: Champion spot restructured (Final as centerpiece)
- `3b2fc15`: teamNick WC national names (Czechia, Bosnia, Congo)
- `edfa467`: D1 standings merge with WC_TEAMS fallback
- `45997b7`: **fetchWCStandings RELAY_BASE fix** (Incident 12 — was /nba prefix)
- `e53682f`: WC Tournament Brief card on main schedule
- `f63e0ff`: **WC game cards on main schedule** — V2 polling injects FIFA section + ⚽ WC filter pill
- `2d41627`: Smoke A559-A569 (612/0) — all 9 uncovered features
- `23acfa5`: Comment extraction pipeline in deploy-gate.yml (363 KB / 26% gzip savings)
- `cde57d5`: Simplified strip-comments — git source IS the documentation

## Design system work (specced, NOT built)

12 items documented in Items Catalog (Drive 1lWX2KtRPMNN):
1. Chakra Petch typography (approved, supersedes Barlow/Playfair)
2. Card tiering: featured / standard / compact grid
3. CompactGrid for routine games (replaces collapsing)
4. Touch feedback (:active scale 0.98)
5. Motion token assignments to new surfaces
6. Advancement probability scale (gold/blue/smoke)
7. MLB / traditional sports balance rule
8. Score-journalism symbiosis
9. Circadian layout mode (Rules C1-C5, Rovi clearance)
10. Bracket tree viewport rules (T2+ only)
11. Journalism surfacing architecture (7 surfaces)
12. Viewport artifact v4 scope (~120-150 min TYPE D)

## STAT — iCIMS Cookie Automation (research complete, build next session)

**Context:** Cookie search can be automated via Playwright in CI — same pattern as FIELD's screenshot probe workflow.

**Key finding:** FIELD's jubilant-bassoon CI has confirmed working Playwright + Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. `page.cookies()` is available on the same `page` object used for screenshots.

**The pattern (GitHub Actions workflow for STAT repo):**
- Push trigger file `outbox/.trigger-cookie-extract` → workflow launches Playwright
- Navigate to `careers-{tenant}.icims.com/jobs/intro/login`
- Fill credentials from `secrets.ICIMS_EMAIL` + `secrets.ICIMS_PASSWORD`
- `page.waitForNavigation()` after submit
- `page.cookies()` → write to `outbox/icims-cookies.json` → commit `[skip ci]`
- STAT Worker reads cookies and uses `page.setCookie(...cookies)` for apply form POST

**Do first (2 min, devtools):**
Open `careers-mdmercy.icims.com` after login → Application → Cookies tab.
If session cookie domain is `.icims.com` → one login covers all 7 iCIMS tenants.
If `careers-mdmercy.icims.com` scoped → 7 separate logins needed.

**executablePath note:** May need `npx playwright install chromium` fallback if STAT runner path differs from FIELD's confirmed path.

**Two iCIMS apply paths (from HTML analysis):**
- Session replay: CI extracts cookies → store in DO storage → `page.setCookie(...cookies)` rehydrates for form POST
- Partner API: iCIMS Technology Partner Program (free registration) — routes by CLIENT_ID, scales to all 7 tenants without credentials

## Priority queue
1. **Viewport artifact v4** (~120-150 min TYPE D) — unifies v1+v2+v3.5
2. **Design system BUILD** (~110 min TYPE C) — CSS tokens + semanticTier() + card tiering
3. State transition 6e (~30 lines)
4. Drama spectrum 6f (~60 lines)
5. M5 score ticker fade
6. Wimbledon draw context (before July 7)

## STAT next session open items
- #7 feedback loop, #11 STAT_KV dead binding, SelectMinds cursor bugs
- Workday audit, UI list
- **iCIMS cookie automation** — verify domain scope first, then build CI workflow

## Key Drive docs (this session)
- Items Catalog: 1lWX2KtRPMNN1e8YfxrCd3aBPNzxOc8k0JAHOzUxprd0
- Design System v2: 1Bv2qvn_Gz0qLZatJW9jVsQfMAwE-DyflZNplQyHmCvk
- v4 Build Brief: 1OZItVH-7beD7wEpizwSie3mb80UtiepHIInGEZh3ALU
- Journalism Addendum: 1ibAZ1n52akTtBEvmzgQHSkUPDEEllKwug44Gx6zggYE
- Circadian Addendum: 137BFjJ9oErDyBmrxSvTM4RuSywln3pXaYFD77Id5Eek
- Rovi Patent Clearance: 1ICONs1B_WzfpW562DHEEzhjc2KC8tlnqkbajYrOvctk
- CI/Deploy Addendum: 1iLNhq5-ktyTI4dIL8E4eqoD_OB-NkcLVoG9p2NE0IJA
