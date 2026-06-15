# Claude Code Command — June 15 2026
# Tasks: SCF G3 matchupNote fix, Night Owl championship context, playoff score enrichment

git pull. Read CLAUDE.md. Read STANDARDS.md Rule 59 (CC-AUDIT-A) and Rule 7 (one concern per commit).

Write all findings and decisions to outbox/cc-scores-nightowl-2026-06-15.md BEFORE pushing any code.

THREE TASKS. Each is a separate commit per Rule 7. Run smoke after each.

---

## Task 1 — SCF G3 duplicate matchupNote (Rule 13 cleanup)

Line 10228 has TWO matchupNote keys in the same object literal (the SCF G3 game entry). The second silently overwrites the first. This is a JS quirk, not a syntax error — but the first matchupNote is dead code.

FIX: Remove the first matchupNote (the shorter one ending "G4 Tue Jun 9 at T-Mobile Arena, 8pm ET, ABC.") and keep the second (the longer pre-game analysis starting "VGK leads 2-1. Marner hat trick in G3").

Verify: after the fix, grep for `matchupNote` on that line — must appear exactly once.

Commit: "fix: remove duplicate matchupNote on SCF G3 (Rule 13 cleanup)"

---

## Task 2 — Playoff score enrichment (ECF + WCF + NBA conf finals)

The SCF G1-G6 game objects already have homeScore/awayScore fields (added in commit ce676fb). The ECF, WCF, and NBA conference finals game objects do NOT. Add them.

RULES:
- Parse the score from the league string or matchupNote text. DO NOT INVENT scores.
- homeScore = the score of the team in the `home:` field. awayScore = the score of the team in the `away:` field.
- If a game has no result in its text (pre-game placeholder, or game not played), do NOT add score fields.
- Place homeScore/awayScore BEFORE seriesMargins (if present) or before matchupNote.

GAMES TO ENRICH (verify each score against the text):

NHL ECF (CAR vs MTL) — lines ~10217-10220:
- G2: CAR 3-2 OT (home=CAR → homeScore:3, awayScore:2)
- G3: CAR 3-2 OT (home=MTL → homeScore:2, awayScore:3)
- G4: CAR 4-0 (home=MTL → homeScore:0, awayScore:4)
- G5: CAR 6-1 (home=CAR → homeScore:6, awayScore:1)

NHL WCF (VGK vs COL) — lines ~10237-10239:
- G2: VGK 3-1 (home=COL → homeScore:1, awayScore:3)
- G3: VGK 5-3 (home=VGK → homeScore:5, awayScore:3)
- G4: VGK 2-1 (home=VGK → homeScore:2, awayScore:1)

NBA ECF (NYK vs CLE) — lines ~10178-10180:
- G1: NYK 115-104 (home=NYK → homeScore:115, awayScore:104)
- G3: NYK 121-108 (home=CLE → homeScore:108, awayScore:121)
- G4: NYK 130-93 (home=CLE → homeScore:93, awayScore:130)

NBA WCF (SAS vs OKC) — lines ~10181-10182:
- G3: OKC 123-108 (home=SAS → homeScore:108, awayScore:123)
- G4: SAS 103-82 (home=SAS → homeScore:103, awayScore:82)

ALSO: check if there are additional NBA/NHL playoff games in the schedule that have results but no homeScore/awayScore. If found, enrich them too. Document all additions in the output file.

Commit: "data: add homeScore/awayScore to ECF + WCF + NBA conf finals completed games"

---

## Task 3 — Night Owl championship context

buildNightOwlStatic(f) at ~line 33358 generates the static Night Owl recap line. It does NOT call buildChampionshipContext(). For championship-clinching games (Stanley Cup, NBA Finals, World Series, Super Bowl), the Night Owl should include championship context.

FIX:
1. In buildNightOwlStatic(f), after the existing narrative line, check if buildChampionshipContext is available:
   ```js
   const _champEData = {homeScore: f.homeScore||0, awayScore: f.awayScore||0};
   const _champCtx = (typeof buildChampionshipContext === 'function')
     ? buildChampionshipContext(f, _champEData) : null;
   if (_champCtx) {
     line += ` ${_champCtx.winner} wins the ${_champCtx.trophy}.`;
     if (_champCtx.drought) line += ` ${_champCtx.drought}.`;
   }
   ```
2. In fetchNightOwlFromClaude (the Claude-powered Night Owl path), check if championship context is already injected into the prompt. If not, add the same pattern used in fetchGameBriefOnDemand: call buildChampionshipContext, build the champBlock, include in the prompt.

CONSTRAINTS:
- DO NOT change the relay worker (field-relay-nba). This is client-side only.
- buildChampionshipContext gates on _gameImportance === 'clinch' — the static data already has this field on SCF G5/G6. So the gate should fire for those games.
- Test: grep for buildChampionshipContext — must now appear in buildNightOwlStatic AND fetchNightOwlFromClaude in addition to its existing call sites.

Add smoke assertion A607: "Championship context wired into Night Owl path (static + Claude)"

Commit: "feat: wire championship context into Night Owl static + Claude paths"

---

## Output file

Write outbox/cc-scores-nightowl-2026-06-15.md with:
- Pre-work smoke count
- Each task: what was found, what was changed, verification
- Post-work smoke count
- Any findings or anomalies

Run smoke. Push all commits + output file when complete.
