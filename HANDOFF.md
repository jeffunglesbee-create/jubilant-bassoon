# FIELD HANDOFF
## HEAD: 028b3de · 2026-06-16 · via chat

### STAT Deploy — RESOLVED (092d0ba)

**Problem:** STAT Worker deploy failed twice on June 16. Initial hypothesis was expired CF API token — proved wrong (all 5 tokens active, no expiry).

**Actual root cause:** CC's deploy-trigger mechanism wrote a shell comment (`# deploy trigger 2026-06-16T17:25:29Z`) into `src/routes/_utils.js` (a JavaScript file). esbuild rejected the `#` as invalid syntax. Wrangler dry-run passed (doesn't bundle), but `wrangler deploy` failed instantly.

**Fix:** Removed the shell comment line from `_utils.js` via GitHub API (commit `092d0ba`). Deploy workflow `27639153435` completed successfully.

**Prevention:** Deploy triggers should write to `outbox/.trigger-deploy` or similar no-op file, never to `src/` JS files. Guard needed in CC governance (CLAUDE.md or session hooks).

### FIELD Session (June 15-16) — unchanged from prior HANDOFF

**What Shipped:**
- Cape Verde name fix (7826c38, A613)
- June game archive — 90 games to D1
- Brief archive client+relay (20 call sites, 11 brief types, backfill engine)
- Desktop viewport tests (Chrome + Safari WebDriverIO)
- Close the Loop (temporal context, voice exemplars, /archive/query)
- Event Pipeline (/archive/game, GameDO hook, KV brief capture)
- Odds Layer (schema, snapshot, injection, backfill, dead-hour cron)
- Client Features 1+2 (timeline, broadcast, conflict map, upsets, consensus, corpus, crew)
- Smoke: 664/0, SW_VERSION: 2026-06-15f

### Smoke Tool Artifact — NOT A REGRESSION
MCP `get_smoke_count` reports **601**. Actual runtime is **664/0**. Delta = **63**.
Root cause: FEATURE_GUARDS forEach-dispatched assertions are dynamically generated at runtime but not matched by the tool's static regex parser. This delta has been constant since at least June 12 (then: tool=538, actual=601, delta=63). **Always treat the HANDOFF smoke number as authoritative, not the tool output.** Run `node smoke.js` for ground truth.

### Drive Specs
1. Archive Intelligence — 1fMZFs2WOi_hPcX5hUB1UJf5mWvItTLB6EwZ881LcC3s
2. Backfill Enrichment — 1Zs0fFrokCnd3D7UhTlFFykRgPHAW0_ygqgPSYyedzXI
3. Compound Architecture — 1cWgNEs3uanFh_PDi2ISSrIBTINdousbHcE1VQphvZ2I
4. Circadian + Gap Closers — 1NeAFkfKhBKhqeez-broEmb-q-ULB9u6L8tvwEWYyMeU
5. Context Dimensions — 1XulILxMMU4MtDI6NhwVs5kMv8XsKOmANWUly3_JsCwQ
6. Bracket Compound — 1Wm29D2KYtEPR1G3N-n__7KPm6FKR-0L6_4S99mtsAxU
7. Surface Compounds — 1UxVjbcsven_Nbf7L1g2mDGZA-KDT5D4HG-3rWxlwBQU
8. Info Disclosure — 11T6jE6z2R7WFVGFKrSq2JO7MU76Hr_xmAYGIMiafRug
9. Journalism Loop — 1PKkEGpe306ovRngvBCAZgoQyjeaj02SQ0khAp0OrOfU
10. External API — 1kLEZnwLmmvvGdEtPn26jC8iUKbSR_9PK4ZxSpjDvkvE

### Drive upload outbox
- `.github/workflows/drive-upload-outbox.yml` — triggers on `outbox/cc-*.md` or `outbox/rule59-*.md` pushes
- Apps Script bridge (script.google.com "FIELD documentation" project)
- Folder: `0ABxH84VndHL7Uk9PVA`

### Gemini API Rate Limits (June 16)
- Gemini 3.1 Flash Lite: RPM 88% (3.54K/4K), **TPM 157% (6.27M/4M)**, RPD 66% (98.73K/150K)
- Haiku fallback expected for some briefs during TPM throttle period
- Mitigation: pacing backfill, throttling relay-side calls. Model-split (3.1 live / 2.5 backfill) available if needed.

### CC Task Queue
1. **Remove zombie NBA clutch GH Actions workflow** — `git rm .github/workflows/nba-clutch-update.yml scripts/nba-clutch-update.py` + commit. Relay-native since 467b35e.
2. **Add deploy-trigger guard to CLAUDE.md** — rule: deploy triggers must target `outbox/.trigger-deploy`, never `src/` files
3. Context Graph, relay compound, client compound CC prompts ready (~35 hrs specced)
