# FIELD Handoff — May 31 2026 (PM2 — Phase C AI Gateway completion)

**jubilant-bassoon HEAD:** 99d52ec · Smoke: 241/0 · SW_VERSION 2026-05-31e (unchanged)
**field-relay-nba HEAD:** 29ebc33 · Deploy: SUCCESS · All 7 STRUCTURAL checks ✅
**Session Doc (Drive):** 1MNiypjnCH91qPe9Wq9p4tTH1IL8MYNaQY5jg3ZgVm0s

## TIER 0 DEADLINES (unchanged from PM1)
- Stanley Cup G1: **June 2** — VGK @ CAR (data path wired, not live-tested)
- NBA Finals G1: **June 3** — SAS vs NYK (NBA v2 endpoint verified PM1)
- World Cup 2026: **June 11 HARD** — flip wc26:true in FIELD_V2_SOURCES (~5 min)
- USPTO provisional: **~June 25** — WOW 6 + Phase C narrative now substantially stronger

## WHAT HAPPENED THIS SESSION

Phase C (AI Gateway wire-up) entered the session HALF-DEPLOYED:
- proxy code c95a29e shipped with cf-aig-authorization header support
- CF_AI_GATEWAY_BASE secret on proxy: SET (via cf-api-probe earlier)
- CF_AIG_TOKEN on proxy worker: NOT set → every gateway call 401
- field-relay-nba/deploy.yml step that would sync CF_AIG_TOKEN: BROKEN
  YAML (step-level `if: ${{ secrets.X != '' }}` is not allowed by GitHub
  Actions). Last attempted deploy 9e3ec46 = `failure`. Workflow displayed
  as ".github/workflows/deploy.yml" filename in GH UI — the canonical
  tell for YAML parse failure.

**Verified-not-assumed approach:** 4 post-probes, each disambiguating the
next decision. Found that probes 1-3 were hitting the **proxy** endpoint
directly with FIELD-format bodies — the proxy only accepts Anthropic
format `{messages:[...]}`. The relay endpoint `field-relay-nba.workers.dev
/journalism/generate` is the correct target (the live app's path). After
the manual CF_AIG_TOKEN deploy + the deploy.yml fix, the relay probe
returned `HTTP 200, score 103, real text, layers_fired=["3b"]`.

### Two fixes shipped

1. **CF_AIG_TOKEN deployed to field-claude-proxy** (manual via CF dashboard
   — Jeff executed; sandbox can't reach api.cloudflare.com, and the probe
   path would have leaked the token in git history)
2. **deploy.yml repaired** (commit 29ebc33): step-level `if` replaced with
   bash-level `[ -z "$CF_AIG_TOKEN" ] && exit 0` check inside `run:`.
   Workflow name back to "Deploy RELAY Worker". STRUCTURAL 6 passes
   against the gateway-routed path. Sync step now runs on every relay
   deploy → Phase C is idempotent.

### New patterns to bake into STANDARDS.md

- **GH Actions:** never use `${{ secrets.X != '' }}` in step-level `if:`.
  Use a `run:`-level bash check with the secret bound via `env:`. Local
  `yaml.safe_load` validity is necessary but not sufficient — GitHub's
  expression evaluator is stricter than the YAML parser.
- **Worker secret distribution:** the three safe paths are (a) CF
  dashboard, (b) `wrangler secret put` from trusted machine, (c) deploy
  pipeline pulling from `secrets.X`. Never `cf-api-probe` for real secrets
  — the trigger file gets committed.
- **/journalism/generate is two different endpoints.** The relay (full
  FIELD format + quality chain) is what the app and STRUCTURAL 6 hit.
  The proxy (Anthropic raw format) is what the relay calls internally.
  Default to the relay for any e2e test.
- **post-probe.yml:** trigger file only honors `url=`. Body lives in
  `outbox/.post-probe-body.json`, headers in `outbox/.post-probe-headers`.

## PRIORITY LIST FOR NEXT SESSION

### P0 — Live verification (carries forward from PM1, still not done)
1. Open FIELD app in browser. Confirm SW 2026-05-31e active.
2. Tap any MLB / J2 / J5 / Stakes brief trigger. Confirm text populates
   (was previously stuck on "Loading brief..." pre-PM1 fixes).
3. Confirm `window._lastJQAudit` populates with non-empty audit object.
4. If any of the above fail: it's a different bug from Phase C (Phase C
   is now CI-verified). Most likely path-routing or SW cache issue.

### P0 — TIER 0 game-day data-path verification
5. **June 2 (tomorrow):** Stanley Cup G1 VGK @ CAR — manual sanity check
   that NHL endpoints + drama arc + journalism brief all populate during
   live action.
6. **June 3:** NBA Finals G1 SAS vs NYK — same. Relay /v2/games?sport=nba
   was just fixed PM1 (adaptApiNba); first real-traffic test.

### P1 — Hardcoded calendar flip
7. **June 11 HARD:** flip `wc26:true` in FIELD_V2_SOURCES (~5 min change
   per Current State doc).

### P1 — Documentation amendments (still pending from PM1)
8. Update 5 morning sweep docs per session 1A7OzCh:
   - STANDARDS.md — add "GH Actions step-level if cannot reference secrets"
     (NEW THIS SESSION), "RUWT [VERIFY] markers non-negotiable", "Browser
     fetches need AbortSignal.timeout"
   - Arch Spec v2 — correct WOW 6 status; add diagnostic capture pattern;
     add Phase C AI Gateway in-circuit
   - JQ Spec — amend WOW 6 with known failure modes
   - 10 Wow Factors — WOW 6 row update
   - Infra Backlog — deploy-gate probe + BDL decision + diagnostic discipline
9. Update CI/Deploy Ref (1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo) to
   document Phase C end-state, deploy.yml sync step, and the four lessons
   from this session.

### P1 — BDL milestone decision (carried from PM1)
10. Either (a) upgrade BDL to GOAT plan ($9.99/mo) for NBA milestones,
    (b) remove feature, or (c) find free alt source.

### P2 — USPTO provisional prep (~June 25)
11. Compile the WOW 6 + Phase C story arc into provisional language. The
    AI Gateway adds a meaningful novel-IP layer:
    - Authenticated Gateway prevents URL-leak exploitation
    - Semantic caching adds 20-40% efficiency gain
    - Per-provider observability is patent-relevant
    Drama Dial + WOW 6 + Phase C all reinforce the journalism-quality
    patent narrative.

### P2 — Build backlog (from Current State, deferred)
12. handleCron refactor (~2.5 hr)
13. YouTube highlights (~45 min)
14. Podcast Index (~30 min)
15. SeatGeek (~2 hr)
16. Polymarket (~2.5 hr)
17. Preference Sync QR tier (~45 min)
18. Preference Sync Passkey tier (~2.5 hr)

### P3 — Deferred console errors (low-pri, browser handles gracefully)
- /espn-summary/.../nba/summary 404
- /mlb-umpire-scrape 502
- api.openf1.org URL encoding (%3E for `>=`)
- WNBA Aces logo path 404

## STATE INVARIANTS AT END OF SESSION

- Phase C gateway in-circuit, authenticated, idempotent across deploys
- jubilant-bassoon: no code changes this session, smoke 241/0 stable
- field-relay-nba: deploy.yml repaired, all STRUCTURAL checks green
- Live /journalism/generate verified HTTP 200 with score 103 at 01:41Z
