# FIELD HANDOFF

## MID-SESSION UPDATE — 2026-07-04 (session ongoing, not closed)

**CLIENT HEAD: 51df7a8** (bookkeeping commit; last real feature commit `7e88d06` — global_fetch_strictly_public fix). Always re-run `git log -1` fresh rather than trusting this value later in the session.
**RELAY HEAD: c8086bf** — unchanged since early this session; all later work today was client-only.
**SMOKE: 871 total, 0 failed** — ground truth via direct `node smoke.js index.html`, confirmed fresh at time of this update.
**SW_VERSION: 2026-07-04t** — index.html and sw.js confirmed in sync via direct grep AND independently confirmed live (`curl` against the deployed URL returns the same value).
**Live deploy confirmed matching HEAD** at time of this update.

---

## WHAT THIS SESSION ACTUALLY DID (extremely long session, multiple real feature arcs)

### Circadian per-game state system
- v2.1-v2.3 shipped: `live/in` vocabulary fix, cross-sport support (WC26/MLB/AFL), wired into live re-renders (previously frozen at initial render).
- Card-level DOM reconciliation + string cache (Phase 2) and CARD_ATTRIBUTE_SYNC registry (Phase 1) shipped, live-measured (`applyMainHTML`=7ms, string-build=38.8ms).
- **Circadian card sort order** (PRIME>NIGHT>PREVIEW>LATE) shipped — this was in the ORIGINAL spec, deferred since v2.1, never implemented until found and closed this session. Live-verified: a card whose tier flips visibly reorders, composes safely with Phase 1/2 reconciliation.
- **`getNewspaperVoice`'s missing LATE bucket** fixed — an all-LATE slate no longer wrongly defaults to the 'morning' show-everything voice.
- **Real, NEW open item found, not yet fixed**: `renderAll`'s `_circInput` only ever reads `state` from `findESPNScore(g)` (ESPN lookup), never from the game object's own `state` field directly. This makes ANY sport whose live state comes from a non-ESPN source (confirmed for CFL, see below) permanently classify as LATE regardless of real state. CC-CMD written (`cfl-circadian-state-wire.md`), **genuinely pending, not yet executed.**

### Newspaper banner — 6 real "wipe on repaint" bugs found and fixed
- `applyMainHTML()` already tried to preserve `#field-newspaper` across re-renders, but 6 separate code paths (renderAll's empty-filter branch, goToDate's 4 branches, renderAll's post-render empty-check) bypassed it with direct `main.innerHTML=` assignments. All 6 found and fixed across two CC-CMDs (found via careful diff review, not all found on the first pass — CC caught a 6th one I'd missed in the original spec).
- Added `reg.update()` on `visibilitychange` to close a real iOS-vs-Android PWA update-propagation gap (confirmed root cause: no explicit update-check call anywhere, relying solely on the browser's own — on iOS, less frequent — background check cycle).

### FIFA rankings / soccer drama scoring
- footballdata.io confirmed permanently paid-plan-gated for FIFA rankings (live 403, `paid_plan_required`).
- **Parse.bot integration shipped instead** — real, live, free-tier FIFA World Ranking data, confirmed working (Argentina rank 1, Cape Verde/"Cabo Verde" rank 67 — matching the exact motivating example). 3 real FIFA-official-naming aliases handled (Cabo Verde, Korea Republic, Côte d'Ivoire).
- Soccer drama scoring shipped: extra-time bonus tier (verified against a real WC26 extra-time game's actual ESPN keyEvents), quiet-stretch interpolation, upset-factor bonus (now live via the Parse.bot data) — plus a previously-undetected bug found and fixed in the same pass: `dramaScoreLive`'s soccer branch conditions never matched WC26's real sport string ("FIFA World Cup 2026"), meaning the whole soccer calibration silently never fired for WC26 games until this session.

### CFL — real, dormant live infrastructure found and wired
- A June 27 session had already found, tested, and wired a real live CFL scoreboard API (`cflscoreboard.cfl.ca`) into the relay (`/cfl/scoreboard/rounds`) — confirmed still live and accurate today (Calgary 58–Toronto 36, Ottawa 22–Saskatchewan 27, both matching independent verification). **The client never called it** — confirmed via grep, zero references. Wired this session: `loadCFLScoreboard()` (async, golf's delayed-injection pattern), old hardcoded array kept as explicit fallback-ONLY (mutual-exclusion gate, avoiding the exact golf duplicate-section bug class — see below).
- This surfaced the `_circInput`/circadian-inert finding above.

### A real, live production bug caused and fixed this session (own mistake, corrected)
- Added a hardcoded golf tournament entry (John Deere Classic) to `golfGames` based on an unverified claim ("golf coverage missing 6 days") — never checked the live app first. Real, live app already had this tournament correctly, via a completely separate ESPN-driven pipeline (`loadPGASlate`) that this session didn't know existed. Caused a real, live duplicate-section bug (confirmed 2x rendering), found via user-provided screenshot, reverted same-session. **Lesson applied since**: search chat history before claiming something "doesn't exist" — a code check alone proves "not wired," never "never existed."

### OG share-meta feature — 5-CC-CMD chain, fully resolved
- A prior CC-CMD (`og-share-meta.md`) had shipped bot-gated OG meta-tag injection via `src/worker.js` + HTMLRewriter, but it never actually worked in production. Root-caused across 3 real, distinct bugs, fixed in sequence:
  1. `wrangler.jsonc` missing `assets.run_worker_first` — static assets were served ahead of the Worker script by Cloudflare's own default routing.
  2. `Element.after()` called with swapped/malformed arguments in `MetaTagRewriter` — the actual meta tag was buried inside a malformed options object, never inserted.
  3. **Cloudflare error 1042** — the Worker's own in-process fetch to the relay's `*.workers.dev` URL was blocked (same-account Worker-to-Worker anti-loop restriction). Fixed with `global_fetch_strictly_public` — the SAME flag already proven fixing the identical error class in the relay itself since May 29 (found via chat-history search, not rediscovered from scratch).
- **Fully verified live, independently, end-to-end**: real bot UA gets a real `og:description` tag with live, current content; normal UA unchanged; diff between the two responses is exactly one line.

### Deploy/CI infrastructure — 2 real, distinct bugs found and fixed
- `sw-version-bump.yml`'s daily cron: double-space sed pattern for `sw.js` silently never matched (real file uses single space) — fixed, made whitespace-tolerant, added loud-failure verification.
- `deploy-gate.yml`'s own SW_VERSION sync-back step: a genuine race condition where a stale checkout from an earlier-triggered run could overwrite a later, already-correct commit. Fixed with a `concurrency` group (`cancel-in-progress: false`, deliberately) plus a defensive `git pull` immediately before reading the current version. **Confidence on this one is explicitly lower than usual** — CI concurrency behavior can't be fully verified by static review alone; one clean observation so far, not yet "proven" from repeated real-world pushes.

### Daily update (real gap found, real gap avoided)
- Golf: real gap found and fixed (see above, before the duplicate-bug detour).
- CFL: no real gap — first pass used a wrong grep pattern and nearly reported a false gap, caught before acting on it.

---

## OPEN ITEMS FOR NEXT SESSION (verified-current as of this update)

1. **`cfl-circadian-state-wire.md`** (client, genuinely pending) — fixes `_circInput` to also read `g.state` directly, not just ESPN lookups. Needed for CFL (and any future non-ESPN sport) to classify correctly for sort-order/newspaper-voice purposes.
2. **`circadian-kv-read-endpoint.md`** (relay, genuinely pending) — adds a `/circadian/:phase/:date` read endpoint for the two orphaned KV keys. Real consumer now confirmed: the OG share-meta feature (shipped this session) currently reads `/circadian/preview/{date}` directly; this endpoint generalizes/completes that read path properly.
3. Everything in the 2026-07-03 handoff not touched this session (completion-triggered journalism real-game confirmation, `wentToOT` hardcoded false, session_health phase-degradation gap, WNBA archive gap, v4 voice register in relay, Prompt Observatory, 2026-06-30 priority list items) — not re-verified, carry forward as-is.

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- Repo: jeffunglesbee-create/jubilant-bassoon (client), field-relay-nba (relay)
- New this session: `PARSEBOT_FIFA_KEY` (Worker secret, both repos synced), Parse.bot FIFA.com wrapper (free tier, real data)
- Direct D1 access: Cloudflare Developer Platform MCP `d1_database_query` — bypasses relay's `/d1/execute` allowlist, default over relay-proxied access.

---

**Not a session-end entry — session is ongoing. This update exists so a crash or restart mid-session doesn't lose today's real state.**
