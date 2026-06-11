# FIELD HANDOFF — 2026-06-11 (WHOLE FIELD Toggle 6c)

## HEADS
- jubilant-bassoon HEAD: 76aa708 (auto-overlay after 0163193)
- Last dev commit: 0163193 (feat(6c): WHOLE FIELD toggle)
- SW_VERSION: 2026-06-11b
- Smoke: 579/0 ✅
- field-relay-nba HEAD: a2e852b

## WHAT SHIPPED THIS SESSION

### WHOLE FIELD Toggle 6c (client: 0163193, smoke A533-A536)

**#wf-toggle button** in nav controls (inline-flex at 1200px+, hidden below):
  - Default label: ESSENTIALS (no active class, muted border)
  - Active label:  WHOLE FIELD (gold text, gold border, gold bg tint)
  - Persists: localStorage 'field_desktop_mode' = 'essentials' | 'whole'

**body.wf-mode CSS:**

  Laptop 1200-1439px (LEFT + RIGHT):
    - #ambient-panel: display:flex !important (overrides 820px max-width rule),
      fixed right 380px, full height, dark bg, left border
    - .main, masthead, nav, ticker: margin-right:390px
    - .games-list: 1-col (too narrow for 2-col with 380px panel taken)
    - score ticker: display:block !important (was hidden at iPad range)

  Desktop 1440px+ (LEFT + CENTRE + RIGHT):
    - Same ambient panel as laptop
    - #field-desk-section, #night-owl, #field-brief: display:block
      with margin-right:390px so they don't underrun the ambient panel

**initWFToggle IIFE:**
  - Reads localStorage on load → applies mode immediately
  - Toggles body.wf-mode, updates label + active class
  - Calls renderAmbientPanel() when switching into WHOLE FIELD
  - Writes localStorage on each toggle

**Default: ESSENTIALS** — first-visit users see no change. Existing users
with localStorage 'essentials' also unaffected.

### Also verified this session (TYPE D)

WC schedule audit:
  72 games, June 11–28, all have matchupNotes
  Broadcasts: WC26_FOX (39), WC26_FS1 (31), WC26_FREE (2 — MEX opener + USA opener)
  Group A: 34 games through all 3 matchdays

WC bracket data layer (all endpoints healthy):
  /wc/projections — 200, 48 teams, Monte Carlo live
  /wc/traps       — 200, 20 traps (Ghana +2.3pp leads)
  /wc/standings   — 200 (groups:{} — first game just finished, relay updating)
  /wc/results     — 200 (results:[] — relay hasn't ingested Mexico result yet)
  /wc/odds-probs  — 200, full odds for upcoming games
  /wc/brief/tournament — 200 (brief:null — no journalism brief generated yet)

CSS verified: body.wc-mode #wc-section[hidden]{display:block} override is
AFTER base [hidden]{display:none} in stylesheet — correct specificity order.

Note: Live viewport screenshots of WC section NOT captured — sandbox blocks
*.workers.dev. Would require GitHub Actions CI with WC-mode activation added
to screenshot_probe.js.

## PRIORITY LIST

1. State transition 6e ← next
2. Drama spectrum 6f
3. WC projections quality — Ecuador/Ivory Coast ranking anomalously high
4. M5 score ticker fade
5. Wimbledon draw context (before July 7)
6. Design system (~90 min TYPE C)

## SMOKE
579/0 ✅ CI green at 0163193 (deploy gate + smoke both pass)
