CC-CMD-2026-06-18 — WC Group A duplicate Czechia row (defensive client merge)

OBSERVED
  Group A standings table showed two rows for "Czechia" with split stats.
  Tonight (June 18 MD2): "Czech Republic" 1G/0W/0D/1L/1GF/2GA from one D1
  row, "Czechia" 1G/0W/1D/0L/1GF/1GA from another. Both rows present in
  the rendered table — user-visible bug.

ROOT CAUSE (relay-side, being fixed separately in field-relay-nba)
  writeWCResult stored raw api-sports team names without normalization.
  The Czechia MD1 result landed under "Czech Republic", MD2 under
  "Czechia". D1 returned both rows. _wcFixTeamName at index.html:28983
  renames both to "Czechia" via _WC_NAME_FIX, but the mergedStandings
  builder at index.html:29589 only spread the renamed array — it never
  aggregated. Two "Czechia" rows survived.

CLIENT FIX (this commit — defensive aggregation layer)
  Between the .map that applies _wcFixTeamName and the d1Names Set, fold
  rows that share a normalized team name:

    const merged = {};
    for (const r of d1Teams) {
      if (!merged[r.team]) { merged[r.team] = {...r}; continue; }
      const m = merged[r.team];
      m.played += r.played; m.won += r.won; m.drawn += r.drawn; m.lost += r.lost;
      m.gf += r.gf; m.ga += r.ga;
      m.gd = m.gf - m.ga;
      m.points = m.won * 3 + m.drawn;
    }
    const d1Merged = Object.values(merged);

  Downstream consumers now use d1Merged: the d1Names Set and the
  [...d1Merged] spread into mergedStandings[g]. Idempotent for groups
  with no duplicates — first-seen team allocates its slot, subsequent
  matching rows fold in. Groups B–L therefore unchanged.

VERIFICATION (Rule 61 — end-to-end simulation against Czechia case)

  Input D1 standings.A:
    Mexico         1-0-0  GF2  GA0  Pts3
    South Korea    1-0-0  GF2  GA1  Pts3
    Czech Republic 0-0-1  GF1  GA2  Pts0  ← renames to Czechia
    Czechia        0-1-0  GF1  GA1  Pts1
    South Africa   0-0-1  GF0  GA2  Pts0

  Output (after rename + aggregation):
    Mexico         1-0-0  GF2  GA0  GD+2  Pts3
    South Korea    1-0-0  GF2  GA1  GD+1  Pts3
    Czechia        0-1-1  GF2  GA3  GD-1  Pts1    ← merged
    South Africa   0-0-1  GF0  GA2  GD-2  Pts0

  Row count: 4 (was 5 with the duplicate). Czechia matches the user's
  expected P:2 W:0 D:1 L:1 GF:2 GA:3 GD:-1 Pts:1 exactly. Other groups
  (B–L) are mechanically untouched because aggregation only fires when
  a normalized team name is encountered twice.

NOT TOUCHED
  - field-relay-nba (relay session owns writeWCResult fix)
  - stat repo
  - _wcFixTeamName + _WC_NAME_FIX dictionary (still the right place to
    declare canonical names; aggregation runs on already-renamed rows)

SMOKE
  A652 added — asserts the aggregation block, downstream use of
  d1Merged, and the points recomputation formula.
  691 → 692 / 0.
