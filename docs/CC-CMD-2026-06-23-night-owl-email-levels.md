# FIELD — Night Owl Email: Five-Level Upgrade Spec
# 2026-06-23 | Target: scripts/night-owl-email.js + night-owl-email.yml

---

## CURRENT STATE (Level 0)

scripts/night-owl-email.js:
- Template-based HTML. No LLM. No FIELD voice.
- Single game per email (highest drama score only)
- Drama from final scores only (heuristic 0-10)
- System fonts. Wrong orange (#f97316 not gold #f59e0b)
- No Chakra Petch, no DM Mono, no FIELD chip taxonomy
- Covers NBA, NHL, MLB only — WC MISSING ENTIRELY
- Sends from onboarding@resend.dev (Resend sandbox, spam risk)
- Single hardcoded recipient (jeffunglesbee@gmail.com)
- Night Owl card: one sentence + one drama signal sentence

---

## LEVEL 1 — Real FIELD Journalism

Replace template "Argentina edged Austria 2-1 in a one-goal finish."
with actual relay journalism prose via `/journalism/game/{id}`.

### Relay endpoint
GET https://field-relay-nba.jeffunglesbee.workers.dev/journalism/game/{espnEventId}

Returns: { brief: "De Paul pulled Argentina clear in the 78th minute...", score: 187 }

### Implementation in main()

After selecting top drama game:

```javascript
async function fetchRelayBrief(espnEventId, sport) {
  if (!espnEventId) return null;
  const sportPath = sport.toLowerCase().includes('soccer') ? 'soccer' : 
                    sport.toLowerCase().includes('hockey') ? 'hockey' :
                    sport.toLowerCase().includes('baseball') ? 'baseball' : 'basketball';
  try {
    const url = `https://field-relay-nba.jeffunglesbee.workers.dev/journalism/game/${espnEventId}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.brief || data.text || null;
  } catch (e) {
    console.log('Relay brief unavailable, using template fallback:', e.message);
    return null;
  }
}
```

Fallback: if relay returns null/error, use existing template sentence.
Never block email send on relay availability.

### ESPN event ID capture

Add `espnEventId: ev.id` to each game object in the workflow fetch steps.
The relay journalism routes index by ESPN event ID.

---

## LEVEL 2 — FIELD Design System

### Typography (email-safe Google Fonts CDN)

Add to <head>:
```html
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@700;800&family=DM+Mono:wght@500&display=swap" rel="stylesheet">
```

Apply:
- Night Owl header + team names: font-family: 'Chakra Petch', sans-serif; font-weight: 700
- Score display: font-family: 'DM Mono', monospace; font-weight: 500
- Body prose: -apple-system, BlinkMacSystemFont, 'Segoe UI' (unchanged — email safe)

### Color corrections (COLOUR-SYS-A tokens)

WRONG (current)   → CORRECT
#f97316 (orange)  → #f59e0b (gold) — Night Owl header, CTA button
#60a5fa (blue)    → #0d9488 (teal) — PLAYOFFS chip
No purple         → #7c3aed — WC chip background

All other dark surfaces (#0a0f14, #111827, #1e293b, #e2e8f0) are correct.

### Chip taxonomy

Replace current plain text league label with FIELD chip system:

```javascript
function buildLeagueChip(game) {
  const chips = {
    nba: { bg: '#1e3a5f', color: '#60a5fa', label: 'NBA' },
    nhl: { bg: '#1a2e1a', color: '#4ade80', label: 'NHL' },
    mlb: { bg: '#2d1a1a', color: '#f87171', label: 'MLB' },
    soccer: { bg: '#1a1a2e', color: '#a78bfa', label: 'WC 2026' },
    wnba: { bg: '#2d1a2e', color: '#f472b6', label: 'WNBA' },
  };
  const sp = (game.sport||'').toLowerCase().includes('soccer') ? 'soccer' :
             (game.sport||'').toLowerCase().includes('hockey') ? 'nhl' :
             (game.sport||'').toLowerCase().includes('baseball') ? 'mlb' :
             (game.sport||'').toLowerCase().includes('basketball') ? 'nba' : 'nba';
  const c = chips[sp] || chips.nba;
  return `<span style="background:${c.bg};color:${c.color};font-size:.65em;
    font-weight:700;padding:.15rem .45rem;border-radius:4px;
    text-transform:uppercase;letter-spacing:.06em">${c.label}</span>`;
}
```

Add PLAYOFF chip when isPlayoff=true:
```html
<span style="background:#1e3a5f;color:#0d9488;font-size:.65em;
  font-weight:700;padding:.15rem .45rem;border-radius:4px;
  text-transform:uppercase;letter-spacing:.06em;margin-left:.4rem">PLAYOFF</span>
```

Add OT chip when isOT=true:
```html
<span style="background:#2d2000;color:#f59e0b;font-size:.65em;
  font-weight:700;padding:.15rem .45rem;border-radius:4px;
  text-transform:uppercase;letter-spacing:.06em;margin-left:.4rem">OT</span>
```

### Score display correction

Change score format:
BEFORE: `${awayScore}–${homeScore}` (em dash — renders wrong in some clients)
AFTER:  `${awayScore}-${homeScore}` (hyphen, universally safe)

Score size: font-size:2rem (unchanged) but now in DM Mono.

---

## LEVEL 3 — Full Morning Digest

Restructure from single-game to three sections.

### Section 1: TOP GAME
Full Level 1 relay brief (60-80 words) for highest drama game.
Same hero card design as Level 2.

### Section 2: QUICK RECAPS
Next 2-3 drama-scoring games (drama score >= 2), one sentence each.
Template-based (no LLM) — sport language from getSportLanguage().

```javascript
function buildQuickRecapRow(game) {
  const diff = Math.abs((game.homeScore||0) - (game.awayScore||0));
  const homeWon = (game.homeScore||0) >= (game.awayScore||0);
  const winner = homeWon ? game.home : game.away;
  const { descriptor } = getSportLanguage(game, diff);
  return `<tr>
    <td style="padding:6px 0;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:.8em">
      <span style="color:#f1f5f9;font-weight:600">${game.away} ${game.awayScore}-${game.homeScore} ${game.home}</span>
      &nbsp;— ${winner} in a ${descriptor} finish.
      ${game.isPlayoff && game.seriesRecord ? 
        `<span style="color:#64748b;font-size:.85em"> Series: ${game.seriesRecord}</span>` : ''}
    </td>
  </tr>`;
}
```

### Section 3: WHAT TO WATCH TONIGHT
Today's top 3 upcoming games by drama potential (playoff > national broadcast > WC > regular).
Static — no LLM, no Exa at this level.

```javascript
// Fetches today's scoreboard, filters status=pre, returns top 3 by priority
async function fetchTonightSlate(dateStr) {
  const sports = [
    { key: 'basketball/nba', label: 'NBA' },
    { key: 'hockey/nhl', label: 'NHL' },
    { key: 'baseball/mlb', label: 'MLB' },
    { key: 'soccer/fifa.world', label: 'WC' },
  ];
  const upcoming = [];
  for (const { key, label } of sports) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/${key}/scoreboard?dates=${dateStr}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json();
      for (const ev of data.events || []) {
        const comp = ev.competitions?.[0];
        if (!comp) continue;
        const status = comp.status?.type?.state;
        if (status !== 'pre') continue;
        const teams = comp.competitors || [];
        const home = teams.find(t => t.homeAway === 'home');
        const away = teams.find(t => t.homeAway === 'away');
        const notes = (comp.notes||[]).map(n=>n.headline||'').join(' ').toLowerCase();
        const isPlayoff = notes.includes('playoff') || ev.season?.type === 3;
        const startTime = ev.date ? new Date(ev.date).toLocaleTimeString('en-US',
          {hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}) + ' ET' : 'TBD';
        upcoming.push({
          label, isPlayoff,
          home: home?.team?.shortDisplayName||'?',
          away: away?.team?.shortDisplayName||'?',
          startTime,
          priority: isPlayoff ? 2 : label === 'WC' ? 1 : 0,
        });
      }
    } catch (_) {}
  }
  return upcoming.sort((a,b) => b.priority - a.priority).slice(0, 3);
}
```

### WC addition to night-owl-email.yml

Add a new step after MLB results:

```yaml
- name: Fetch WC results
  id: wc
  run: |
    DATE="${{ steps.dates.outputs.espn_date }}"
    DATA=$(curl -sf --max-time 15       "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=$DATE"       || echo '{}')
    GAMES=$(echo "$DATA" | node -e "
      const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
      const games = (d.events || []).map(ev => {
        const comp = ev.competitions?.[0];
        if (!comp) return null;
        const status = comp.status?.type?.name || '';
        if (!status.includes('Final') && !status.includes('STATUS_FINAL')) return null;
        const teams = comp.competitors || [];
        const home = teams.find(t=>t.homeAway==='home');
        const away = teams.find(t=>t.homeAway==='away');
        return {
          sport: 'soccer', league: 'WC 2026',
          espnEventId: ev.id,
          home: home?.team?.displayName || '?',
          away: away?.team?.displayName || '?',
          homeScore: parseInt(home?.score||0),
          awayScore: parseInt(away?.score||0),
          isOT: comp.status?.period > 2,
          isPlayoff: ev.season?.slug?.includes('knockout') || false,
        };
      }).filter(Boolean);
      console.log(JSON.stringify(games));
    " 2>/dev/null || echo '[]')
    echo "games=$GAMES" >> $GITHUB_OUTPUT
```

Add WC to the merge step:
```javascript
const wc = JSON.parse(process.env.WC_GAMES || '[]');
const all = [...nba, ...nhl, ...mlb, ...wc];
```

---

## LEVEL 4 — Intelligent Enrichment

### 4a: Odds Story in "What to Watch Tonight"

For each game in tonight's slate with odds history in D1:

```javascript
// Call relay odds endpoint per game
async function fetchOddsStory(espnEventId) {
  try {
    const url = `https://field-relay-nba.jeffunglesbee.workers.dev/odds/history/${espnEventId}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.opening || !data.current) return null;
    const drift = Math.abs(data.current.spread - data.opening.spread);
    if (drift < 2) return null;
    const dir = data.current.spread < data.opening.spread ? 'shortened' : 'drifted out';
    return `Line ${dir} from ${data.opening.spread > 0 ? '+' : ''}${data.opening.spread} to ${data.current.spread > 0 ? '+' : ''}${data.current.spread}.`;
  } catch (_) { return null; }
}
```

### 4b: Brief Freshness staleness signal

For MLB games in recap — check if starting pitcher changed via ESPN:

```javascript
async function checkLineupsChanged(espnEventId, briefText) {
  // Only relevant for MLB where SP is named in brief
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${espnEventId}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const lineups = data.lineups?.home?.starters?.[0]?.athlete?.displayName;
    if (!lineups) return null;
    const lastName = lineups.split(' ').pop();
    if (briefText && !briefText.includes(lastName)) {
      return `Lineup may have changed since this was written.`;
    }
    return null;
  } catch (_) { return null; }
}
```

---

## LEVEL 5 — THE SCORECARD (CI Adaptation)

Original spec (Drive: 1_w5pMbUi1kygIJtTvT2SLEN2FAazxKgi2VVSBVHVFng) uses
localStorage for drama peak + history. CI has no localStorage.
This section defines the email-side CI adaptation.

### CI data mapping

DRAMA grade (from heuristic drama score, 0–10 scale → 0–100):
```javascript
function ciDramaScore(game) {
  // dramaTierHeuristic already computes 0-10 correctly
  // Multiply by 10, cap at 100
  const h = dramaTierHeuristic(game);
  return Math.min(h * 10, 100);
}
```

CLOSENESS grade (from final score margin + OT):
```javascript
function ciClosenessScore(game) {
  const diff = Math.abs((game.homeScore||0) - (game.awayScore||0));
  if (game.isOT || game.isShootout) return 90;
  const sp = (game.sport||'').toLowerCase();
  if (sp.includes('basketball')) {
    if (diff <= 2) return 85;
    if (diff <= 5) return 75;
    if (diff <= 8) return 62;
    if (diff <= 12) return 48;
    return 30;
  }
  if (sp.includes('hockey') || sp.includes('soccer')) {
    if (diff === 0) return 85;
    if (diff === 1) return 78;
    if (diff === 2) return 55;
    return 30;
  }
  // Baseball
  if (diff === 1) return 82;
  if (diff === 2) return 68;
  if (diff === 3) return 50;
  return 32;
}
```

PLOT grade (from structural context flags):
```javascript
function ciPlotScore(game) {
  if (!game.isPlayoff) return game.isNational ? 68 : 35;
  const sr = (game.seriesRecord||'').toLowerCase();
  const isDeciding = sr.includes('3-3') || sr.includes('3-2') || sr.includes('leads 3');
  const isElimination = sr.includes('leads 3') || sr.includes('3-0') || sr.includes('3-1');
  if (isElimination) return 95;
  if (isDeciding) return 90;
  if (sr && sr !== '0-0') return 80;
  return 72; // playoff, no series record
}
```

### scoreToGrade (from original spec — unchanged)

```javascript
function scoreToGrade(score) {
  const base = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D';
  const threshold = {A:90, B:75, C:60, D:0}[base];
  const next = {A:100, B:90, C:75, D:60}[base];
  const range = next - threshold;
  const pos = range > 0 ? (score - threshold) / range : 0;
  const mod = pos >= 0.75 ? (base !== 'A' ? '+' : (score >= 96 ? '+' : ''))
            : pos <= 0.15 ? '-' : '';
  return base + mod;
}

function computeScorecardCI(game) {
  const dramaGrade     = scoreToGrade(ciDramaScore(game));
  const closenessGrade = scoreToGrade(ciClosenessScore(game));
  const plotGrade      = scoreToGrade(ciPlotScore(game));
  return { dramaGrade, closenessGrade, plotGrade };
}
```

### Grade color coding (from original spec)

A / A+ / A- → #c9a84c (gold)
B / B+ / B- → #4a9eff (blue)
C / C+ / C- → #888888 (muted)
D           → #555555 (dim)

```javascript
function gradeColor(grade) {
  const base = grade[0];
  return base === 'A' ? '#c9a84c' :
         base === 'B' ? '#4a9eff' :
         base === 'C' ? '#888888' : '#555555';
}
```

### "Because" sentences (A and B+ grades only)

```javascript
function becauseSentence(dimension, grade, game) {
  if (!['A+','A','A-','B+'].includes(grade)) return '';
  const diff = Math.abs((game.homeScore||0) - (game.awayScore||0));
  if (dimension === 'drama') {
    if (game.isOT || game.isShootout) return 'Went to overtime — maximum late-game tension.';
    if (diff <= 2) return `Final margin of ${diff === 1 ? 'one' : 'two'} — decided in the closing moments.`;
    return 'High-drama finish by heuristic score.';
  }
  if (dimension === 'closeness') {
    if (game.isOT) return 'Tied at the buzzer — competitive throughout.';
    return `Final margin of ${diff} — closely contested from start.`;
  }
  if (dimension === 'plot') {
    const sr = game.seriesRecord || '';
    if (sr.includes('leads 3')) return 'Elimination game — winner advances, loser goes home.';
    if (sr.includes('3-3')) return 'Game 7 — winner-take-all.';
    if (game.isPlayoff) return `${sr ? 'Series: ' + sr + '.' : 'Playoff game.'}`;
    return '';
  }
  return '';
}
```

### Email HTML for Scorecard section

Placed below the relay brief prose, above the CTA button.

```javascript
function buildScorecardHTML(scorecard, game) {
  const { dramaGrade, closenessGrade, plotGrade } = scorecard;
  const dims = [
    { label: 'DRAMA',     grade: dramaGrade,     dim: 'drama' },
    { label: 'CLOSENESS', grade: closenessGrade,  dim: 'closeness' },
    { label: 'PLOT',      grade: plotGrade,       dim: 'plot' },
  ];
  const becauses = dims
    .map(d => becauseSentence(d.dim, d.grade, game))
    .filter(Boolean);

  return `
    <div style="margin:16px 0;padding:14px 16px;background:#0d1117;
      border:1px solid #1e293b;border-radius:8px">
      <div style="font-size:.55em;font-weight:700;letter-spacing:.1em;
        text-transform:uppercase;color:#64748b;margin-bottom:10px">
        THE FIELD SCORECARD
      </div>
      <div style="display:flex;gap:20px">
        ${dims.map(d => `
          <div>
            <div style="font-size:.55rem;text-transform:uppercase;
              letter-spacing:.08em;color:#475569;margin-bottom:3px">
              ${d.label}
            </div>
            <div style="font-size:1.2rem;font-weight:800;
              color:${gradeColor(d.grade)};font-family:'DM Mono',monospace">
              ${d.grade}
            </div>
          </div>
        `).join('')}
      </div>
      ${becauses.length ? `
        <div style="margin-top:10px;font-size:.75em;color:#64748b;line-height:1.5">
          ${becauses.join(' ')}
        </div>` : ''}
    </div>`;
}
```

---

## PROMPT SEQUENCE

Two CC sessions. Session 1 ships Levels 1, 2, 5.
Session 2 ships Levels 3 and 4.

### WHY THIS SPLIT

Level 1 (relay journalism) + Level 2 (design) + Level 5 (Scorecard) are all
changes to the content and presentation of the single top-game card.
They can be verified together in one email send.

Level 3 (digest) restructures the email into sections — a more significant
architectural change. Level 4 (enrichment) adds external fetches.
Both require the Level 1-2-5 baseline to be stable first.

---

## NON-GOALS

- No Beehiiv at any level (separate spec: SPEC-email-distribution-beehiiv-2026-06-23.md)
- No custom domain email (stays onboarding@resend.dev for testing)
- No personalization by sport preference (no subscriber DB yet)
- No Brief Freshness Guard full D1 integration (Level 4b is simplified to SP check only)
- No Night Owl Audio (separate feature #TBD)

---

## REFERENCES

- scripts/night-owl-email.js — target file (sole developer changes)
- .github/workflows/night-owl-email.yml — target workflow
- The Scorecard spec: Drive 1_w5pMbUi1kygIJtTvT2SLEN2FAazxKgi2VVSBVHVFng
- COLOUR-SYS-A tokens: docs/VIEWPORT-V4-SPEC.md (Chakra Petch + DM Mono confirmed)
- Brief Freshness Guard spec: Drive 1tEru3BaKjaJgvpWO8DoQFM3Z5pJKs49bSJiGhMTdy5Q
- Odds Story spec: Drive 1WX8gNb_Z1fhX5StARh03kO_MCN9P1WuSd7kdITzn6Co
- Distribution spec (staged): docs/SPEC-email-distribution-beehiiv-2026-06-23.md
