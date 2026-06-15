# FIELD Handoff — June 15 2026 (Full Session)

**jubilant-bassoon HEAD:** `49d32cb` · Smoke: **651/0** · SW_VERSION `2026-06-15a`
**field-relay-nba HEAD:** `0aa14d9` (unchanged)

---

## WHAT SHIPPED

### Governance
- **Rule 59 — Claude Code trusted-but-unverified (CC-AUDIT-A)** — new STANDARDS.md rule codifying session-boundary governance for CC commits. CLAUDE.md Rule 17 cross-references. Three case studies (ADR-002 success, CSS Grid failure, championship brief partial). Commit: 0ac7d87.
- **Complete CC governance audit** — documented all CC governance artifacts: CLAUDE.md (17 rules), CLAUDE-CODE-PROMPT-RULES.md (6 rules), .claude/hooks/session-start.sh, Rule 25 (Gemini) vs Rule 59 (CC) relationship.

### Score Overlay Fix
- **Layer 1:** V2 merge block skips espnScores write when _scoresNull && !prev. No more false 0-0 on page load.
- **Layer 2:** hydrateEspnScoresFromFinals() scans allData.sports for games with homeScore/awayScore. SCF G1-G6, ECF G2-G5, WCF G2-G4, NBA ECF G1/G3/G4, NBA WCF G3-G6, NBA Finals G1-G4 all enriched with numeric scores. 18 games total.
- **Layer 3 (DEFERRED):** Relay-side KV cache. Requires field-relay-nba changes.
- Commit: ce676fb (chat), a519be2 (CC).

### CC Build Session Results (3 tasks executed)
- SCF G3 duplicate matchupNote removed (commit 621fe83)
- Night Owl championship context wired into both static + Claude paths (commit 2168559)
- A604-A608 assertion reorder for consistency (CC commit, descending numeric order)
- A606 (score overlay merge guard), A607 (score overlay L1+L2 skip), A608 (Night Owl championship), A609 TBD (iOS Safari infra)

### CC Rule 59 Verification Audit
- J2 championship brief wiring: **VERIFIED CORRECT** — both fetchGameBriefOnDemand and fetchSeriesPreviewFromClaude call sites confirmed, signatures match, reachable callers. HANDOFF "not yet verified" note CLEARED.
- FRANCHISE_LAST_TITLE: 63 entries (32 NHL + 30 NBA + 1 alias)
- Stale-HEAD finding: CC ran from a17bf8e, missed chat commits. Documented in postscript.

### Infrastructure — Drive Upload Automation
- Google Apps Script deployed at script.google.com ("FIELD documentation" project)
- GitHub secrets set: APPS_SCRIPT_URL + APPS_SCRIPT_SECRET (via PyNaCl)
- Workflow: drive-upload-outbox.yml — triggers on outbox/cc-*.md and outbox/rule59-*.md pushes
- Pipeline: CC pushes outbox file → GitHub Action → Apps Script → Google Doc in FIELD session folder
- Workflow modification lock prevented first test — will activate on next CC push
- 7 CC output files uploaded to Drive manually this session

### Infrastructure — iOS Safari + Android Chrome Testing (FREE, $0/mo)
- **iOS Safari POC: VERIFIED** — GitHub Actions macos-latest + iOS Simulator + xcrun simctl. Simulator boots, Safari opens FIELD URL with ?wpt, screenshot captured, Appium + Safari driver installed. All steps green.
- **Android Chrome POC: VERIFIED** — GitHub Actions ubuntu-latest + KVM + reactivecircus/android-emulator-runner. API 33 + google_apis. Emulator boots, Chrome opens URL, screenshot captured. All steps green.
- CC command spec for full 22-assertion Appium suite: docs/CC-CMD-2026-06-15-ios-safari.md
- Claude Code KVM: CONFIRMED NOT AVAILABLE (no /dev/kvm, no virt extensions). CI-as-proxy is the path.

### Network Allowlist Updates
- objects.githubusercontent.com — read GitHub Actions job logs directly
- *.blob.core.windows.net — download GitHub Actions artifacts
- googleapis.com — direct Google Drive API access
- script.google.com — test Apps Script endpoint
- Takes effect in new conversations only.

## Smoke Discrepancy (Resolved)
- MCP get_smoke_count reads source assert( count (588), not runtime (651)
- FEATURE_GUARDS forEach generates 64 dynamic assertions from 1 source call
- A515 (SW_VERSION date) auto-resolved on deploy

## Known Issues (carry forward)
- Layer 3 relay score cache (field-relay-nba) — deferred
- ESPN WC live scores relay endpoint (/soccer/fifa.world) — pending
- Drive upload workflow modification lock — clears on next CC push
- Relay Night Owl championship context — client done, relay pending
- iOS/Android full Appium suite — CC command spec ready, not yet executed

## Priority Queue
1. WC Groups G-L D1 updates as matches complete (Groups G/H today)
2. Layer 3 relay score cache
3. CC: Execute iOS Safari Appium suite (docs/CC-CMD-2026-06-15-ios-safari.md)
4. CC: Add Android Chrome to same suite
5. ESPN WC relay endpoint
6. Drive upload workflow verification (next CC push)
