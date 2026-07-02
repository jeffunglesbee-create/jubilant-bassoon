# Claude Code Command — Player Name Mismatch Detector

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md.

Write all findings to outbox/cc-player-mismatch-detector-2026-07-02.md.

## CONTEXT

`resolveEntity('player', name)` and `CANONICAL_PLAYER` shipped today in
field-relay-nba (`src/identity-resolver.js`, commit `8bc84fc`) with
**zero real callers and one manually-found alias** (`Cristopher Sanchez`
→ `sánchez`, added by hand during verification). The design intent,
stated in that CC-CMD's own comments, is that `CANONICAL_PLAYER` grows
from real observed mismatches only — never speculative entries. This
CC-CMD builds the tool that finds those mismatches systematically,
instead of one-at-a-time by hand.

**The mismatch pattern, confirmed real this session, not theoretical:**
ESPN's roster API (`site.api.espn.com/.../roster`) strips diacritics in
its `fullName`/`lastName` fields (`"Cristopher Sanchez"`), but
Savant-sourced last-name keys in `outbox/mlb/pitch_arsenals.json`,
`pitch_tempo.json`, and `sprint_speed.json` preserve them (`"sánchez"`).
Any real player whose name contains a diacritic, a multi-word surname,
or an unusual suffix is a candidate for a silent mismatch. There may be
others beyond the one already found by hand — this tool finds all of
them, not just the one that was noticed.

**Source files, real structure confirmed 2026-07-02:**
- `outbox/mlb/pitch_arsenals.json` — `{updated, data: {lastNameKey: {team, pitches:[...]}}}`, 120 entries, has `team` per entry.
- `outbox/mlb/sprint_speed.json` — `{updated, leagueAvg, data: {lastNameKey: {..., team, ...}}}`, 423 entries, has `team` per entry.
- `outbox/mlb/pitch_tempo.json` — `{updated, data: {lastNameKey: {medianTempo, tempoClass, timerEquiv}}}`, 337 entries, **no `team` field** — cross-reference against `pitch_arsenals.json`'s team for any key that also appears there; keys with no team available from any file are logged as unresolved, not guessed.

## PRE-BUILD PROBE (Rule 87)

```bash
cat scripts/mlb-weekly-update.py | sed -n '40,50p'
curl -s https://raw.githubusercontent.com/jeffunglesbee-create/field-relay-nba/main/src/identity-resolver.js | sed -n '312,333p'
```

Confirm the exact current `name_key()` (Python) and `_stripPlayer()`
(relay JS, commit `8bc84fc`) implementations before writing the detector
— this script must duplicate `_stripPlayer`'s logic **exactly**,
including its sequential (not anchored) suffix-replacement quirk
(`"Player III"` → `"playeri"`, not `"player"`), since it lives in a
different repo and cannot import the relay's module directly. This
duplication is a known, accepted maintenance hazard — see Task 3.

## TASK 1: New script — `scripts/mlb-player-mismatch-detector.js`

Node script, run via GitHub Actions (ESPN roster fetches need network
access the sandbox doesn't have — same constraint as every other
ESPN/Savant probe this project uses; see `mlb-weekly-update.py` pattern).

Logic:
1. Load `pitch_arsenals.json`, `sprint_speed.json`, `pitch_tempo.json`.
   Build one deduped set of `{lastNameKey, team}` — for `pitch_tempo.json`
   keys, look up `team` from `pitch_arsenals.json` if present there,
   else leave team unresolved for that key.
2. Group keys by team. For each team with at least one key, fetch
   `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/{team}/roster`
   once (cache per team — do not refetch per player).
3. For each `{lastNameKey, team}`:
   - If team is unresolved, skip and log to an `unresolved` list
     (real gap, not a mismatch — do not guess a team).
   - Find the roster athlete whose `lastName`, run through the SAME
     accent-stripping used for team names (NFD-strip + lowercase), equals
     the accent-stripped form of `lastNameKey`. This loose match is only
     for FINDING the candidate — never for producing the final key.
   - If no athlete found, log to `unmatched` (real gap — team roster
     may be stale, player may be a call-up not yet on the roster, etc.
     Do not guess).
   - If found, take that athlete's real `fullName` and run it through a
     local copy of `_stripPlayer` (ported exactly per the probe step).
   - Compare the result to `lastNameKey`. If they match, this player is
     already correctly resolvable — no entry needed. If they differ,
     this is a real, evidence-based candidate mismatch: log
     `{espnFullName, realKey, team, sourceFile}`.
4. Output: write `outbox/mlb-player-mismatches.json` with three arrays:
   `candidates` (the real mismatches found, ready for human/CC review —
   this script does NOT write to `identity-resolver.js` itself),
   `unresolved` (no team available), `unmatched` (team known, no roster
   match found). Every entry must carry enough detail to manually verify
   it (the real key, the real ESPN name, the team) — no summary-only
   output.

## TASK 2: New workflow — `.github/workflows/mlb-player-mismatch-detector.yml`

`workflow_dispatch` only for now (not scheduled) — this is a
periodically-useful audit tool, not a continuous pipeline; promote to
scheduled later if the candidates list proves consistently non-empty
in practice. Runs `node scripts/mlb-player-mismatch-detector.js`,
commits the output JSON to `outbox/` with `[skip ci]` (data-only,
matches existing convention for e.g. `mlb-weekly-update.yml`).

## TASK 3: Document the duplication hazard explicitly, in-code

Top-of-file comment in the new script: this file's `_stripPlayer` port
MUST be kept in sync with `field-relay-nba/src/identity-resolver.js`'s
real implementation by hand — there is no automated cross-repo import.
If the relay's algorithm changes and this doesn't, candidates will be
computed against a stale rule and may be wrong. State the relay commit
this was ported from (`8bc84fc`) so future drift is at least detectable
by diffing against that commit's version.

## TASK 4: Verification

```bash
node -c scripts/mlb-player-mismatch-detector.js
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/mlb-player-mismatch-detector.yml'))"
```

Cannot fully verify end-to-end from the CC sandbox (needs a real
`workflow_dispatch` run against live ESPN + real outbox files). Done
condition: syntax valid, ported `_stripPlayer` logic byte-matches the
real relay implementation for the same known test cases already used to
verify the original CC-CMD (`"Player III"` → `"playeri"`,
`"Bobby Witt Jr."` → `"witt"`, `"Randy Lynch IV"` → `"lynch_iv"`) —
run these as literal inline assertions in the script itself before it
touches any real data, not just as a one-off manual check.

**Chat-side follow-up (not checkable by CC):** trigger the workflow via
`workflow_dispatch`, pull `outbox/mlb-player-mismatches.json`, and
manually review any `candidates` entries before adding them to
`CANONICAL_PLAYER` in the relay repo — this script proposes, it does not
decide. Each accepted candidate becomes one documented pair with
evidence inline, same pattern as the `sánchez` entry.

## TASK 5: Outbox manifest (last task)

State explicitly: how many teams had at least one key to resolve, how
many candidates/unresolved/unmatched were found on the first real run
(if the chat-side dispatch happens in the same session), and confirm
the inline `_stripPlayer` test assertions passed before any real roster
data was touched.
