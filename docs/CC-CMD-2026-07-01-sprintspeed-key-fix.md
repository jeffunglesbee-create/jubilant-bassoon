# Claude Code Command — Fix getSprintSpeed/getRegressionAlert Key Mismatch

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md.

Write all findings to outbox/cc-sprintspeed-key-fix-2026-07-01.md.

## CONTEXT

Found while investigating whether the identity-resolver pattern could
extend to other sports: `getSprintSpeed`/`getRegressionAlert` (~line
7642-7658) use their own inline key normalization —
`playerLastName.toLowerCase().replace(/\s+/g,'_')` — which does NOT
strip Jr./Sr./II/III suffixes. `PLAYER_SPEED`/`PLAYER_EXPECTED_STATS`
(sourced from `sprint_speed.json`/`expected_stats.json`,
`mlb-weekly-update.py`) are keyed via `name_key()`, which DOES strip
those suffixes.

**Confirmed with a real example, not theoretical:** the live
`sprint_speed.json` stores Bobby Witt Jr. under key `"witt"`. The
client's own normalizer on `"Witt Jr."` produces `"witt_jr."` — period
and suffix retained, zero match. This means `getSprintSpeed("Witt Jr.")`
silently returns `null` for a real, prominent player, right now, in
production, unrelated to anything else fixed tonight.

## PRE-BUILD PROBE (Rule 87)

```bash
sed -n '7640,7660p' index.html
```

Confirm exact current line numbers and both functions' exact bodies
before editing — line numbers above are from the 2026-07-01
investigation and may have shifted.

## TASK 1: Fix the key derivation to match name_key()'s real behavior

Replace the inline normalization in both functions with logic that
matches `name_key()` (Python, `mlb-weekly-update.py`) exactly — lowercase,
strip trailing ` jr.`/` sr.`/` ii`/` iii`, then space/hyphen → underscore:

```javascript
function _mlbPlayerKey(playerLastName) {
  let s = String(playerLastName || '').toLowerCase();
  s = s.replace(/ jr\.?$/, '').replace(/ sr\.?$/, '')
       .replace(/ ii$/, '').replace(/ iii$/, '');
  return s.replace(/[\s-]/g, '_');
}

function getSprintSpeed(playerLastName, teamAbbr) {
  if (!playerLastName) return null;
  const key = _mlbPlayerKey(playerLastName);
  const d = PLAYER_SPEED[key];
  // ... rest unchanged
}

function getRegressionAlert(playerLastName) {
  if (!playerLastName) return null;
  const key = _mlbPlayerKey(playerLastName);
  const d = PLAYER_EXPECTED_STATS[key];
  // ... rest unchanged
}
```

Verify `_mlbPlayerKey("Witt Jr.")` produces `"witt"`, matching the real
live `sprint_speed.json` key, before shipping — this is the actual test
that validates the fix, not just that the code runs.

**Also check** whether `lastNameOf()` (added earlier tonight for the
Scouting Report/At-Bat Edge arsenal work) should call this same
`_mlbPlayerKey()` internally, or whether `getPitchArsenal`/`getPitchTempo`
already handle suffix-stripping correctly on their own — confirm via
the probe rather than assuming either way; if they have the SAME latent
bug for a suffixed pitcher, fix it there too rather than leaving a
fourth inconsistent variant in place.

## TASK 2: Verification

```bash
node smoke.js index.html
```

Extend an existing assertion or add a new one confirming
`_mlbPlayerKey("Witt Jr.")` (or equivalent real-name test) produces
`"witt"` — lock this in the same way the Scouting Report bugs were
locked in earlier tonight, so this class of mismatch can't silently
recur a third time in this file.

**Chat-side follow-up (not checkable by CC):** confirm live that
Bobby Witt Jr.'s sprint speed/regression data actually renders wherever
`getSprintSpeed`/`getRegressionAlert` feed the UI, post-fix.

## TASK 3: Outbox manifest (last task)

State explicitly whether `getPitchArsenal`/`getPitchTempo` had the same
latent bug for suffixed pitcher names, and if so, whether it was fixed
in this CC-CMD or needs a follow-up.
