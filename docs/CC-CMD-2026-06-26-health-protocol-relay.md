# CC-CMD: Health Protocol — Relay Endpoints + Biometric Workflows
**Date:** 2026-06-26  
**Repos:** field-relay-nba (relay) · health-protocol · NOT jubilant-bassoon  
**Rule 87:** Self-completing. No carry-forwards.  
**Separation mandate:** Health Protocol routes must be cleanly namespaced away from FIELD.

---

## CONTEXT

`https://jeffunglesbee-create.github.io/health-protocol/` is live (public GitHub Pages).  
Dashboard currently fetches Whoop live via relay. Oura fails (jubilant-bassoon outbox is private).  
Strava has no relay endpoint yet.

This CC-CMD ships:
1. `/hp/oura` + `/hp/strava` GET routes on field-relay-nba relay
2. `oura-fetch.yml` + `strava-fetch.yml` GitHub Actions in health-protocol
3. Updated `index.html` pointing to relay endpoints

Namespace: `/hp/` (health protocol) — `/health` and `/health/sources` are FIELD-internal. Never use `/health/`.

---

## PROBE BLOCK

```bash
# ── field-relay-nba ─────────────────────────────────────────────────────────

# 1. Clone relay (not jubilant-bassoon)
cd /home/claude
git clone https://GHP_FIELD_PAT_SEE_SECRETS@github.com/jeffunglesbee-create/field-relay-nba.git
cd field-relay-nba

RELAY_HEAD=$(git rev-parse HEAD)
echo "RELAY_HEAD: $RELAY_HEAD"

# 2. Confirm /hp/ routes do not yet exist (they shouldn't)
grep -n "pathname.*hp" src/index.js | head -5
# Expected: no matches

# 3. Confirm insert point — find whoop/callback comment line
grep -n "whoop/callback" src/index.js | head -3
# Expected: line ~7140 — "// /whoop/callback — OAuth callback"

# 4. Confirm relayFetch signature at line 736
sed -n '736p' src/index.js
# Expected: async function relayFetch(targetUrl, headers, ttl, source, ctx) {

# 5. Confirm CORS constant exists
grep -n "^const CORS" src/index.js | head -3
# Expected: module-level CORS object used in relayFetch

# ── health-protocol ──────────────────────────────────────────────────────────

cd /home/claude
git clone https://GHP_FIELD_PAT_SEE_SECRETS@github.com/jeffunglesbee-create/health-protocol.git
cd health-protocol

HP_HEAD=$(git rev-parse HEAD)
echo "HP_HEAD: $HP_HEAD"

# 6. Confirm current OURA_URL in dashboard
grep -n "OURA_URL\|WHOOP_URL\|STRAVA_URL" index.html
# Expected: WHOOP_URL points to relay, OURA_URL points to raw.githubusercontent.com/jubilant-bassoon (needs updating)

# 7. Confirm outbox/ dir doesn't exist yet
ls outbox/ 2>/dev/null && echo "outbox exists" || echo "outbox: missing — will create"

# 8. Confirm .github/workflows/ status
ls .github/workflows/ 2>/dev/null
# Expected: pages.yml only
```

Stop if any probe fails unexpectedly. Diagnose before proceeding.

---

## TASK 1 — Add /hp/ routes to field-relay-nba relay

In `src/index.js`, find the line containing `// /whoop/callback — OAuth callback` (~line 7140).  
Insert the following block IMMEDIATELY BEFORE that line.  
Do NOT modify any existing route. Do NOT add inside any existing if-block.

```javascript
        // ── HEALTH PROTOCOL routes (/hp/*) ──────────────────────────────────────
        // Personal biometric data proxy for health-protocol GitHub Pages dashboard.
        // Namespace /hp/ chosen to avoid collision with FIELD /health + /health/sources.
        // Both routes proxy public raw.githubusercontent.com (health-protocol is public).
        // No GITHUB_PAT needed. No FIELD data. No FIELD logic. Added: 2026-06-26.
        if (pathname === '/hp/oura') {
            return relayFetch(
                'https://raw.githubusercontent.com/jeffunglesbee-create/health-protocol/main/outbox/oura-data.json',
                { 'Accept': 'application/json' },
                300, 'hp-oura', ctx
            );
        }
        if (pathname === '/hp/strava') {
            return relayFetch(
                'https://raw.githubusercontent.com/jeffunglesbee-create/health-protocol/main/outbox/strava-data.json',
                { 'Accept': 'application/json' },
                300, 'hp-strava', ctx
            );
        }
        // ── END HEALTH PROTOCOL routes ───────────────────────────────────────────
```

Verify insertion:
```bash
grep -n "hp/oura\|hp/strava\|HEALTH PROTOCOL routes" src/index.js | head -10
# Expected: 3+ hits, all before the whoop/callback line
grep -n "whoop/callback" src/index.js | head -2
# Expected: line number AFTER the /hp/ block
```

Commit and push relay:
```bash
git add src/index.js
git commit -m "feat(hp): add /hp/oura + /hp/strava proxy routes — health protocol dashboard"
git push origin main
echo "Relay push: $?"
# Relay auto-deploys via deploy.yml on push to main (~2 min)
```

---

## TASK 2 — Add oura-fetch.yml to health-protocol

Create `.github/workflows/oura-fetch.yml` in health-protocol repo.  
This is a standalone workflow — identical purpose to jubilant-bassoon's oura-fetch.yml  
but writes to health-protocol/outbox/ (public repo, no auth needed to read).

```yaml
name: Oura Fetch

on:
  schedule:
    - cron: '30 */6 * * *'
  workflow_dispatch:
    inputs:
      days:
        description: 'Days of data to fetch'
        default: '5'
        required: false

jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Fetch Oura data
        env:
          OURA_ACCESS_TOKEN: ${{ secrets.OURA_ACCESS_TOKEN }}
        run: |
          mkdir -p outbox
          DAYS="${{ inputs.days || '5' }}"
          python3 << PYEOF
          import urllib.request, json, datetime
          from datetime import date, timedelta

          days = int("$DAYS")
          end_date = date.today()
          start_date = end_date - timedelta(days=days)
          token = "$OURA_ACCESS_TOKEN"
          base = "https://api.ouraring.com/v2/usercollection"

          endpoints = {
              "daily_readiness": f"{base}/daily_readiness?start_date={start_date}&end_date={end_date}",
              "daily_sleep":     f"{base}/daily_sleep?start_date={start_date}&end_date={end_date}",
              "daily_spo2":      f"{base}/daily_spo2?start_date={start_date}&end_date={end_date}",
              "daily_stress":    f"{base}/daily_stress?start_date={start_date}&end_date={end_date}",
              "daily_activity":  f"{base}/daily_activity?start_date={start_date}&end_date={end_date}",
          }

          result = {"fetched_at": datetime.datetime.utcnow().isoformat() + "Z"}
          for key, url in endpoints.items():
              req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
              try:
                  with urllib.request.urlopen(req) as r:
                      data = json.loads(r.read())
                  result[key] = {"data": data}
                  print(f"{key}: {len(data.get('data', []))} records")
              except Exception as e:
                  print(f"{key}: ERROR {e}")
                  result[key] = {"error": str(e)}

          with open("outbox/oura-data.json", "w") as f:
              json.dump(result, f)
          print("Written: outbox/oura-data.json")
          PYEOF

      - name: Commit data
        run: |
          git config user.email "github-actions@github.com"
          git config user.name "GitHub Actions"
          git add outbox/oura-data.json
          git diff --cached --quiet && echo "No changes" || git commit -m "chore: refresh oura data [skip ci]"
          git push
```

---

## TASK 3 — Add strava-fetch.yml to health-protocol

Create `.github/workflows/strava-fetch.yml` in health-protocol.  
Strava access tokens expire every 6 hours — workflow refreshes and rotates them.  
Secret rotation uses PyNaCl + GitHub API (same pattern as Whoop in jubilant-bassoon).

Requires secrets in health-protocol repo (see MANUAL SETUP REQUIRED below):
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`  
- `STRAVA_REFRESH_TOKEN`
- `GH_PAT` (same `GHP_FIELD_PAT_SEE_SECRETS` PAT — store as secret for secret rotation)

```yaml
name: Strava Fetch

on:
  schedule:
    - cron: '0 */5 * * *'
  workflow_dispatch:
    inputs:
      per_page:
        description: 'Activities to fetch'
        default: '15'
        required: false

jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Refresh Strava token and fetch activities
        env:
          STRAVA_CLIENT_ID: ${{ secrets.STRAVA_CLIENT_ID }}
          STRAVA_CLIENT_SECRET: ${{ secrets.STRAVA_CLIENT_SECRET }}
          STRAVA_REFRESH_TOKEN: ${{ secrets.STRAVA_REFRESH_TOKEN }}
          GH_PAT: ${{ secrets.GH_PAT }}
        run: |
          pip install pynacl --quiet
          mkdir -p outbox
          PER_PAGE="${{ inputs.per_page || '15' }}"
          python3 << PYEOF
          import urllib.request, urllib.parse, json, datetime, os, sys
          from base64 import b64encode

          client_id     = os.environ["STRAVA_CLIENT_ID"]
          client_secret = os.environ["STRAVA_CLIENT_SECRET"]
          refresh_token = os.environ["STRAVA_REFRESH_TOKEN"]
          gh_pat        = os.environ["GH_PAT"]
          per_page      = int("$PER_PAGE")

          # ── Step 1: Refresh access token ────────────────────────────────────
          data = urllib.parse.urlencode({
              "client_id":     client_id,
              "client_secret": client_secret,
              "refresh_token": refresh_token,
              "grant_type":    "refresh_token",
          }).encode()
          req = urllib.request.Request(
              "https://www.strava.com/oauth/token",
              data=data, method="POST"
          )
          with urllib.request.urlopen(req) as r:
              token_data = json.loads(r.read())

          access_token  = token_data["access_token"]
          new_refresh   = token_data["refresh_token"]
          print(f"Token refreshed. Expires: {datetime.datetime.fromtimestamp(token_data['expires_at'])}")

          # ── Step 2: Rotate STRAVA_REFRESH_TOKEN secret in health-protocol ──
          owner = "jeffunglesbee-create"
          repo  = "health-protocol"
          headers = {
              "Authorization": f"token {gh_pat}",
              "Accept": "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28"
          }
          # Get repo public key
          req = urllib.request.Request(
              f"https://api.github.com/repos/{owner}/{repo}/actions/secrets/public-key",
              headers=headers
          )
          with urllib.request.urlopen(req) as r:
              pk_data = json.loads(r.read())
          key_id = pk_data["key_id"]
          pub_key = pk_data["key"]

          # Encrypt with PyNaCl
          from nacl.public import SealedBox, PublicKey
          from nacl.encoding import Base64Encoder
          pk = PublicKey(pub_key, encoder=Base64Encoder)
          encrypted = b64encode(SealedBox(pk).encrypt(new_refresh.encode())).decode()

          # PUT secret
          payload = json.dumps({"encrypted_value": encrypted, "key_id": key_id}).encode()
          req = urllib.request.Request(
              f"https://api.github.com/repos/{owner}/{repo}/actions/secrets/STRAVA_REFRESH_TOKEN",
              data=payload, headers={**headers, "Content-Type": "application/json"}, method="PUT"
          )
          with urllib.request.urlopen(req) as r:
              print(f"Secret rotated: HTTP {r.status}")

          # ── Step 3: Fetch activities ─────────────────────────────────────────
          auth_header = {"Authorization": f"Bearer {access_token}"}

          req = urllib.request.Request(
              f"https://www.strava.com/api/v3/athlete/activities?per_page={per_page}",
              headers=auth_header
          )
          with urllib.request.urlopen(req) as r:
              activities = json.loads(r.read())

          req = urllib.request.Request(
              "https://www.strava.com/api/v3/athlete",
              headers=auth_header
          )
          with urllib.request.urlopen(req) as r:
              athlete = json.loads(r.read())

          # ── Step 4: Write output ─────────────────────────────────────────────
          output = {
              "fetched_at": datetime.datetime.utcnow().isoformat() + "Z",
              "athlete": {
                  "id":        athlete.get("id"),
                  "firstname": athlete.get("firstname"),
                  "lastname":  athlete.get("lastname"),
                  "city":      athlete.get("city"),
                  "country":   athlete.get("country"),
                  "sex":       athlete.get("sex"),
              },
              "activities": [
                  {
                      "id":            a.get("id"),
                      "name":          a.get("name"),
                      "sport_type":    a.get("sport_type"),
                      "start_local":   a.get("start_date_local"),
                      "distance":      a.get("distance"),
                      "moving_time":   a.get("moving_time"),
                      "elapsed_time":  a.get("elapsed_time"),
                      "elevation":     a.get("total_elevation_gain"),
                      "avg_speed":     a.get("average_speed"),
                      "max_speed":     a.get("max_speed"),
                      "avg_hr":        a.get("average_heartrate"),
                      "max_hr":        a.get("max_heartrate"),
                      "avg_cadence":   a.get("average_cadence"),
                      "calories":      a.get("calories"),
                      "achievement_count": a.get("achievement_count"),
                      "pr_count":      a.get("pr_count"),
                  }
                  for a in activities
              ],
          }
          with open("outbox/strava-data.json", "w") as f:
              json.dump(output, f)
          print(f"Written {len(activities)} activities to outbox/strava-data.json")
          PYEOF

      - name: Commit data
        run: |
          git config user.email "github-actions@github.com"
          git config user.name "GitHub Actions"
          git add outbox/strava-data.json
          git diff --cached --quiet && echo "No changes" || git commit -m "chore: refresh strava data [skip ci]"
          git push
```

---

## TASK 4 — Update health-protocol index.html

In `index.html`, find the two URL constants at the top of the script block and replace them:

Find:
```javascript
const WHOOP_URL = 'https://field-relay-nba.jeffunglesbee.workers.dev/whoop/fetch?days=5';
const OURA_URL = 'https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/outbox/oura-data.json';
```

Replace with:
```javascript
const WHOOP_URL   = 'https://field-relay-nba.jeffunglesbee.workers.dev/whoop/fetch?days=5';
const OURA_URL    = 'https://field-relay-nba.jeffunglesbee.workers.dev/hp/oura';
const STRAVA_URL  = 'https://field-relay-nba.jeffunglesbee.workers.dev/hp/strava';
```

Then find where `Promise.all` fetches WHOOP and OURA, and add Strava:

Find:
```javascript
    Promise.all([
      fetch(WHOOP_URL).then(r=>r.json()).catch(()=>null),
      fetch(OURA_URL).then(r=>r.json()).catch(()=>null),
    ]).then(([w, o]) => {
      setWhoop(w ? extractWhoop(w) : null);
      setOura(o ? extractOura(o) : null);
      setLoading(false);
    })
```

Replace with:
```javascript
    Promise.all([
      fetch(WHOOP_URL).then(r=>r.json()).catch(()=>null),
      fetch(OURA_URL).then(r=>r.json()).catch(()=>null),
      fetch(STRAVA_URL).then(r=>r.json()).catch(()=>null),
    ]).then(([w, o, s]) => {
      setWhoop(w ? extractWhoop(w) : null);
      setOura(o ? extractOura(o) : null);
      setStrava(s);
      setLoading(false);
    })
```

Also add `const [strava, setStrava] = useState(null);` alongside the other useState declarations.

Add a Strava panel after the Whoop panel in the JSX — only renders if strava data exists:

```jsx
{!loading && strava?.activities?.length > 0 && (
  <div className="rounded-2xl p-4 mb-4 bg-white" style={{border:'1px solid #E5E7EB'}}>
    <div className="font-black mb-3" style={{color:'#0A1628',fontSize:10,letterSpacing:'0.15em'}}>
      STRAVA · {strava.fetched_at ? new Date(strava.fetched_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}
    </div>
    {strava.activities.slice(0, 5).map((a, i) => (
      <div key={a.id || i} className="flex justify-between items-center py-1.5 border-b" style={{borderColor:'#F3F4F6'}}>
        <div>
          <span className="font-semibold text-sm" style={{color:'#0A1628'}}>{a.name}</span>
          <span className="text-xs ml-2" style={{color:'#6B7280'}}>{a.sport_type}</span>
        </div>
        <div className="text-right">
          <span className="font-mono font-bold text-sm" style={{color:'#7C3AED'}}>{a.distance ? (a.distance/1000).toFixed(1)+'km' : '—'}</span>
          {a.pr_count > 0 && <span className="ml-1 text-xs font-bold" style={{color:'#C2410C'}}>{a.pr_count}PR</span>}
        </div>
      </div>
    ))}
  </div>
)}
```

Commit health-protocol changes:
```bash
cd /home/claude/health-protocol
git add index.html .github/workflows/oura-fetch.yml .github/workflows/strava-fetch.yml
git commit -m "feat: add oura + strava workflows, update dashboard to use relay /hp/ endpoints"
git push origin main
# GitHub Pages redeploys automatically via pages.yml on push to main
```

---

## DONE CONDITIONS

```bash
# 1. Relay routes exist in src/index.js
grep -c "hp/oura\|hp/strava" /home/claude/field-relay-nba/src/index.js
# Expected: 2

# 2. Routes are BEFORE whoop/callback in the file
OURA_LINE=$(grep -n "hp/oura" /home/claude/field-relay-nba/src/index.js | head -1 | cut -d: -f1)
WHOOP_LINE=$(grep -n "whoop/callback" /home/claude/field-relay-nba/src/index.js | head -1 | cut -d: -f1)
echo "hp/oura at $OURA_LINE, whoop/callback at $WHOOP_LINE"
python3 -c "assert $OURA_LINE < $WHOOP_LINE, 'ORDER WRONG'"
# Expected: oura line < whoop line

# 3. health-protocol workflows exist
ls /home/claude/health-protocol/.github/workflows/
# Expected: oura-fetch.yml, pages.yml, strava-fetch.yml

# 4. Dashboard uses relay URLs
grep "OURA_URL\|STRAVA_URL" /home/claude/health-protocol/index.html
# Expected: both point to field-relay-nba.jeffunglesbee.workers.dev/hp/...

# 5. Relay /hp/oura responds (may return 502 until oura-fetch workflow runs — that's OK)
sleep 150  # wait for relay to deploy via GitHub Actions
curl -s -o /dev/null -w "%{http_code}" \
  "https://field-relay-nba.jeffunglesbee.workers.dev/hp/oura"
# Expected: 200 (if oura-data.json populated) OR 502/404 (if outbox empty — acceptable)
# NOT acceptable: 404 with X-RELAY-Error about routing

curl -s -o /dev/null -w "%{http_code}" \
  "https://field-relay-nba.jeffunglesbee.workers.dev/hp/strava"
# Expected: same — route exists, data may not yet be populated

# 6. Field relay /health still works (FIELD not broken)
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/health" | head -1
# Expected: "RELAY OK — nba + ..." (FIELD health check unchanged)

# 7. Git log confirms both repos pushed
cd /home/claude/field-relay-nba && git log --oneline -2
cd /home/claude/health-protocol  && git log --oneline -2
```

---

## MANUAL SETUP REQUIRED (after CC-CMD completes)

These steps require browser access — CC cannot complete them.  
Without them, workflows exist but cannot run (missing secrets).

### Strava API App (one-time)

1. Go to `strava.com/settings/api`
2. Create app: Name "Health Protocol", Category "Other", Website `https://jeffunglesbee-create.github.io/health-protocol`
3. Note `Client ID` and `Client Secret`
4. Authorize: visit this URL (replace CLIENT_ID):
   ```
   https://www.strava.com/oauth/authorize?client_id=CLIENT_ID&redirect_uri=http://localhost&response_type=code&scope=activity:read_all
   ```
5. After redirect, grab `code=XXXXX` from URL
6. Exchange for refresh token:
   ```bash
   curl -X POST https://www.strava.com/oauth/token \
     -F client_id=CLIENT_ID \
     -F client_secret=CLIENT_SECRET \
     -F code=XXXXX \
     -F grant_type=authorization_code
   ```
7. Note `refresh_token` from response

### GitHub Secrets for health-protocol

Go to: `github.com/jeffunglesbee-create/health-protocol/settings/secrets/actions`

Add these secrets:
| Secret | Value |
|---|---|
| `OURA_ACCESS_TOKEN` | Copy from jubilant-bassoon repo secrets (same token) |
| `STRAVA_CLIENT_ID` | From Step 3 above |
| `STRAVA_CLIENT_SECRET` | From Step 3 above |
| `STRAVA_REFRESH_TOKEN` | From Step 7 above |
| `GH_PAT` | `GHP_FIELD_PAT_SEE_SECRETS` (PAT for secret rotation) |

### Trigger first data runs

After secrets are set:
1. `github.com/jeffunglesbee-create/health-protocol/actions` → Run `Oura Fetch` manually
2. `github.com/jeffunglesbee-create/health-protocol/actions` → Run `Strava Fetch` manually
3. Both commit to `outbox/` → relay /hp/ endpoints return 200 → dashboard live

---

## OUT OF SCOPE

- Whoop data write (already live via D1-stored tokens in relay — no change needed)
- Apple Health (device-only — cannot be fetched remotely)
- Relay GITHUB_PAT env var (not needed — health-protocol outbox is public)
- jubilant-bassoon changes (zero — this CC-CMD does not touch it)
- FIELD smoke tests (relay change is additive-only — existing routes untouched)
