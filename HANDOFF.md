# FIELD HANDOFF — 2026-06-07 (Session 2)

## HEADS
- jubilant-bassoon HEAD: 5268d76 (functional — ci auto-commits on top)
- SW_VERSION: 2026-06-07a (live on Cloudflare)
- Smoke: 516/0 (canonical — node smoke.js)
- field-relay-nba HEAD: 5608845 (unchanged)

## SESSION TYPE
Daily Update + TYPE C (PM-31-JQ, PM-31-DD → PM-32-VI, PM-32-JQ)

## WHAT SHIPPED THIS SESSION

### Data patches
- `0b9c477` — NHL SCF G3 final: VGK leads 2-1. G4 advanced (Tue Jun 9, T-Mobile Arena, 8pm ET, ABC). matchupNote: Marner hat trick, Carolina 3-in-39s collapse, Theodore 2OT winner.
- `62e3e29` — NBA Finals G3 start_time corrected: 2026-06-09T00:30:00Z (Mon Jun 8, 8:30pm ET, MSG). Verified from NBA.com + ESPN Press Room.

### Broadcast verification
- NBA Finals: all games ABC, 8:30pm ET. NYK leads 2-0. G3 Mon Jun 8 at MSG. Full schedule through G7 verified.
- NHL SCF: all games ABC, 8pm ET. VGK leads 2-1. G4 Tue Jun 9 at T-Mobile Arena.

### PM-31-JQ: Brand-safe JQ gate fallback (c72a45c)
- When all journalism paths fail, renders: "Tonight's narrative is unsettled... We don't write what we can't verify." with attribution line reading window._lastJQAudit. A505. 514/0.

### PM-31-DD: Drama Dial chip (9b73036)
- Shipped static SENSITIVE/STANDARD/SELECTIVE chip. Immediately superseded by PM-32-VI as it was identical on every card. A506 updated.

### PM-32-VI: Viewer Intelligence chip system (ab7cc32)
- Three-mode user-controlled pre-game chip. getViewerIntelMode() / setViewerIntelMode() / buildViewerIntelChip(g, sections, mode).
- Modes: stakes (default) / stories / myteams — same 4 signals, different priority order.
- Signals: highStakes (elimination/late series) / hasNarrative (overlay matchupNote) / isOnlyGame (scarcity) / isMyTeam (proximity).
- Anti-hype gate: g._antiHype → no chip. Silence rule: no signal fires → no chip.
- Mode selector in My Services below Drama Dial. Chips re-render on mode change.
- Patent offense: user-controlled multi-dimensional boolean classification ordering.
- 2-sentence pitch: "FIELD is the only sports app that tells you what a game means before it starts — not how exciting it might be, but whether missing it will cost you. Set your intelligence mode once: consequence-first for games that define seasons, story-first for moments history will remember, or your-teams-first for the games that are personal — and every card on your schedule updates instantly, server-blind, from data only you control."
- A507 new. 516/0.

### PM-32-JQ: Mandatory stat citation in J5 Night Owl (5268d76)
- J5 scored 122/200 (single sample VGK-CAR G3). Root: passive citation rule.
- WITH stats: "REQUIRED — CITE ALL STATS: every bracketed stat line must appear verbatim... Lead first sentence with player name + figure."
- WITHOUT stats (new): "Every sentence must still include a specific number from the data above."
- A271 updated. 516/0.

## ACTIVE INTELLIGENCE — DOCUMENTED GAPS
Three tiers (full analysis in session doc 1mSSPGnMuP5yKHRfkGsUkdD-cohEMnuIm):
1. Data workflow self-correction (Tier 1) — daily overlay doesn't detect stale/wrong data
2. Game-completion journalism trigger (Tier 2) — WOW 8 Queues built, trigger not wired
3. Viewer Intel chip live re-render (Tier 3) — static, only updates on page reload

## OPEN ISSUES (14 total — see session doc for full detail)

### CRITICAL
- World Cup pre-flight — June 11 (4 days). Endpoint probe needed.
- Data workflow validation — home/away inversion, stale series records, off-by-one start_times will recur at WC scale (54 games).

### HIGH
- PM-32-VI patent claim documentation for provisional (~June 25)
- WOW 8 game-completion trigger for post-game journalism

### MEDIUM
- Regret Risk (VRR) — buildViewerIntelChip 5th signal tier (~40 lines). Fully specced in Drive 195lNITk3Y1ZfEZyKMZKlKkuQIDk0t2U9AfLjQbSpC0c.
- Night Owl post-game stat capture (cold-cache fix — the real J5 score ceiling)
- Night Owl G4 test validation (Tue Jun 10)

### LOW
- Arc Poster SVG (~200 lines) — "Amnesty data" still undefined
- #night-owl min-height reservation
- Chip live re-render on signal change

## NIGHT OWL QUALITY STATE
- J5 scored 122/200 (1 sample — VGK-CAR G3 2OT, Jun 6)
- PM-32-JQ (mandatory citation) addresses passive rule gap
- Remaining ceiling: when _owlStatCtx empty, max ~130/200
- Full fix: post-game stat capture at game completion
- Next test: NHL SCF G4 Tue Jun 10

## RUWT PREGAME TIMING — RESOLVED
- PM-32-VI chip fires pre-game, all signals are factual conditions
- Drama Dial governs live games, Viewer Intel Mode governs pre-game
- Two orthogonal user controls, clean separation
- No RUWT exposure confirmed

## VIEWER INTEL MODE SELECTOR POSITION
- Confirmed correct: immediately below Drama Dial in My Services
- Screenshot showed scrolled-down state, not misplacement
- No code change needed

## SESSION DOC
Drive: 1mSSPGnMuP5yKHRfkGsUkdD-cohEMnuIm
"FIELD App — 2026-06-07 Session Documentation"

## SMOKE PROGRESSION
513/0 → 514/0 (A505) → 515/0 (A506) → 516/0 (A507) → 516/0 (A271 updated)

## SW_VERSION
2026-06-07a (live). Next: 2026-06-08a on day rollover.
