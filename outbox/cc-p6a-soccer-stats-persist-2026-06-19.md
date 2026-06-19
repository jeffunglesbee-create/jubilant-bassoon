CC-CMD-2026-06-19 — P6A: Persist V2 soccer match stats at final state

PROBLEM
  Night Owl recaps for WC soccer games hallucinate match stats
  ("Australia 71 shots") because V2 clears the situation object to null
  when games go final. The recap prompt therefore receives zero
  shot/possession/corner data and the LLM invents numbers.

VERIFICATION (Rule 61 — what could be probed, what couldn't)
  CI-as-proxy probe: .github/workflows/wc-situation-probe.yml
  Result: outbox/wc-situation-result-20260619T225200Z.txt

  Captured:
    - All 7 final wc26 games on June 16 & 18 returned situation=null.
      Confirms the "V2 clears at final" premise.
    - Game top-level keys: away, clock, home, id, league, periodLabel,
      periodNum, round, situation, sport, start, state, venue.
    - No live wc26 games were in flight at probe time (no game today;
      previous day's games already final).

  NOT verifiable from this session:
    - The exact key set on a LIVE soccer situation object. The relay
      empties it before this session could capture a live snapshot.

DESIGN DECISION (Rule 1 — DO NOT INVENT)
  The prompt named specific fields (homeShots, awayShots, homeSOT,
  awaySOT, homePossession, homeCorners, awayCorners, hasStats). I cannot
  independently verify those exact names from the probe. Rather than
  type those names into client code and risk Rule 1 / Rule 48 violation,
  the persistence is SHAPE-AGNOSTIC: it persists fg.situation as-is
  under the key. Whatever keys the relay supplies are preserved verbatim;
  whatever it doesn't supply is absent.

  This honours Rule 60 (relay owns the data contract) — the client is a
  pure passthrough. When the relay schema is documented or a live probe
  succeeds, the recap consumer can read keys it knows are real.

IMPLEMENTATION
  Hook point: fetchV2AllScores forEach, immediately after the merge
  guard and the anyLive flag, before sport-specific leader branches
  (around line 16499).

  Gate:
    V2_PERIOD_PREFIX[sport] === "'"   // any soccer family sport
    && v2Entry.state !== 'post'        // post = final after mapV2ToESPN
    && fg.situation                    // non-null
    && typeof fg.situation === 'object'
    && Object.keys(fg.situation).length > 0  // non-empty

  Write:
    localStorage.setItem('soccer_stats_' + key, JSON.stringify({
      situation:  fg.situation,    // verbatim relay shape
      homeScore:  v2Entry.homeScore,
      awayScore:  v2Entry.awayScore,
      periodLabel: v2Entry.detail,
      state:      v2Entry.state,
      ts:         Date.now(),
    }));

  key = `${fg.home.name}|${fg.away.name}` — same convention as
  espnScores and _scoresBySource (verified pattern from line 16436).

  Fires every poll cycle while the game is live. Last live poll before
  final wins. localStorage write wrapped in try/catch (quota, private
  mode silent fail).

STEP 3 SANITY CHECK
  Gate walkthrough (Node):
    WRITE  wc26 live Scotland vs Morocco, hasStats:true + homeShots:7
    SKIP   wc26 live, situation null
    SKIP   wc26 live, situation = {}
    SKIP   wc26 final, situation populated (state==post blocks write)
    SKIP   wc26 pre-game, situation null
    WRITE  mls live, situation populated
    SKIP   nba live, situation populated (wrong family — Q prefix)
    SKIP   mlb live, situation populated (wrong family — T prefix)

  All eight cases match intent.

INTEGRATION STATUS (Rule 65)
  - RELAY CONTRACT: /v2/games?sport=wc26&date=YYYY-MM-DD → {games:[...]}.
    Each game carries situation:{...|null}. Verified final state =>
    situation=null. Live state shape NOT empirically captured this
    session.
  - CLIENT WRITER: fetchV2AllScores forEach, persist block above.
  - CLIENT READER: NOT WIRED. Night Owl recap context builder must read
    localStorage.getItem('soccer_stats_' + key) and feed into the prompt.
    That's the next prompt (P6B?) — without a reader, this commit is
    STAGED for the Night Owl prompt-builder change.
  - KNOWN MISMATCHES: client doesn't (yet) name keys inside the stored
    situation object — the consumer must accept whatever keys the relay
    supplied. Recommend the relay session document the exact key set.

FOLLOW-UPS (carry-forward)
  1. Capture a live wc26 situation shape during a live match (probe with
     a real Scotland v Morocco / Brazil v X / etc. when live). Confirms
     the keys the recap consumer should read.
  2. P6B: wire the localStorage reader into the Night Owl context
     builder so the persisted stats reach the prompt. Without it, this
     commit accumulates data but doesn't yet eliminate the
     hallucination — it stages the fix.
  3. Optional TTL/pruning of soccer_stats_* localStorage entries (not
     urgent; team-pair keys collide naturally next time the same
     fixture is played).

SMOKE
  696/0 — no new assertion. The persistence sits inside an existing
  forEach without changing any structural pattern smoke.js audits.
  A future smoke can pin the gate substring once the reader exists.

SW: 2026-06-19h → 2026-06-19i
