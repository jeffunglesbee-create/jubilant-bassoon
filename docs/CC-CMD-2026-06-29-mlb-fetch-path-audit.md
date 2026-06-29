# CC-CMD — MLB Fetch Path Audit: Relay vs Direct

**Date:** 2026-06-29
**Repo:** jeffunglesbee-create/jubilant-bassoon (CLIENT ONLY)
**Scope:** Read 6 CONSUMED MLB functions, report whether each calls relay or statsapi.mlb.com directly
**Target time:** 10 min
**No code changes.** Read-only audit.

---

## DONE CONDITION

Console output showing for each function:
- Function name and line number
- The fetch URL (relay constant or statsapi.mlb.com direct)
- RELAY or DIRECT verdict

---

## THE CHECK

```bash
# For each of the 6 CONSUMED functions from C2 audit, read the fetch URL

echo "=== 1. fetchMLBSchedule (L19656) ==="
sed -n '19650,19680p' index.html | grep -E "fetch\(|MLB_STATS|RELAY|statsapi"

echo ""
echo "=== 2. fetchMLBStandingsParsed (L27621) ==="
sed -n '27610,27650p' index.html | grep -E "fetch\(|MLB_STATS|RELAY|statsapi"

echo ""
echo "=== 3. fetchMLBGameNotes (L28684) ==="
sed -n '28680,28710p' index.html | grep -E "fetch\(|MLB_STATS|RELAY|statsapi"

echo ""
echo "=== 4. fetchMLBLiveGame (L19674) ==="
sed -n '19670,19700p' index.html | grep -E "fetch\(|MLB_STATS|RELAY|statsapi"

echo ""
echo "=== 5. fetchMLBPlatoon (L33944) ==="
sed -n '33940,33970p' index.html | grep -E "fetch\(|MLB_STATS|RELAY|statsapi"

echo ""
echo "=== 6. fetchMLBLeader / fetchMLBBoxscoreContext (L17654 / L17697) ==="
sed -n '17650,17710p' index.html | grep -E "fetch\(|MLB_STATS|RELAY|statsapi"
```

Also check what MLB_STATS_RELAY and MLB_STATS_BASE are set to:

```bash
echo ""
echo "=== Constants ==="
grep -n "MLB_STATS_RELAY\|MLB_STATS_BASE\|const.*MLB.*=.*http" index.html | head -10
```

---

## OUTPUT FORMAT

```
FUNCTION                      LINE    URL                              VERDICT
──────────────────────────────────────────────────────────────────────────────
fetchMLBSchedule              19656   statsapi.mlb.com/api/v1/...      DIRECT
fetchMLBStandingsParsed       27621   ?                                ?
fetchMLBGameNotes             28684   ?                                ?
fetchMLBLiveGame              19674   ?                                ?
fetchMLBPlatoon               33944   ?                                ?
fetchMLBLeader                17654   ?                                ?
fetchMLBBoxscoreContext       17697   ?                                ?
```

Fill in every row. No "?" allowed. If the function uses a variable, read what the variable is set to.

---

**Session: 2026-06-29 · CLIENT ONLY · 10 min target · Read-only**
