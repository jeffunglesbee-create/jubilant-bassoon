# CC-CMD: Health Protocol — Standalone Cloudflare Worker
**Date:** 2026-06-26
**Repo:** health-protocol ONLY — zero changes to jubilant-bassoon or field-relay-nba
**Supersedes:** CC-CMD-2026-06-26-health-protocol-relay.md (DO NOT RUN that one)
**Rule 87:** Self-completing. No carry-forwards. All terminal work automated.

---

## CREDENTIALS (from conversation — set as variables immediately)

```bash
# Set at top of session — do not inline in commands below
CLIENT_ID="261196"
CLIENT_SECRET="54de6106ebfb087d7d0c01a611c93788dc75d3ef"
REFRESH_TOKEN="71762cc472c4d80c5eb107d820e1fd193da91569"
CF_ACCOUNT_ID="b57e9af57ab46c52ca9215804e689c29"
# FIELD_PAT: use value from memory (ghp_ prefixed PAT, May 2027 expiry)
```

---

## PROBE BLOCK

```bash
cd /home/claude
git clone https://${FIELD_PAT}@github.com/jeffunglesbee-create/health-protocol.git
cd health-protocol

HP_HEAD=$(git rev-parse HEAD)
echo "HP_HEAD: $HP_HEAD"

# 1. Confirm no src/ or wrangler.toml yet
ls src/ 2>/dev/null && echo "WARN: src EXISTS" || echo "OK: src missing"
ls wrangler.toml 2>/dev/null && echo "WARN: wrangler.toml EXISTS" || echo "OK: wrangler.toml missing"

# 2. Verify wrangler auth
npx wrangler whoami 2>&1 | head -5
# Expected: shows authenticated account — if not, check CF_TOKEN env

# 3. Confirm index.html needs URL update
grep "OURA_URL\|STRAVA_URL\|WHOOP_URL" index.html
# Expected: WHOOP_URL points to field-relay-nba, OURA_URL to jubilant-bassoon raw URL

# 4. Create KV namespace
KV_RAW=$(npx wrangler kv namespace create hp-kv 2>&1)
echo "$KV_RAW"

KV_ID=$(echo "$KV_RAW" | grep -Eo '[a-f0-9]{32}' | head -1)

# If already exists, fetch existing ID
if [ -z "$KV_ID" ]; then
    echo "hp-kv may already exist — listing namespaces"
    KV_ID=$(npx wrangler kv namespace list 2>&1 | python3 -c "
import json,sys,re
raw = sys.stdin.read()
match = re.search(r'\[.*\]', raw, re.DOTALL)
if match:
    ns_list = json.loads(match.group())
    for ns in ns_list:
        if 'hp-kv' in ns.get('title',''):
            print(ns['id'])
            break
")
fi

echo "KV_ID=${KV_ID}"
[ -z "$KV_ID" ] && echo "ERROR: KV_ID empty — cannot continue" && exit 1
```

Stop if KV_ID is empty or wrangler auth fails.

---

## TASK 1 — Create src/index.js

```bash
mkdir -p /home/claude/health-protocol/src
cat > /home/claude/health-protocol/src/index.js << 'JSEOF'
// health-protocol Worker — personal biometric API
// Completely separate from FIELD. Added: 2026-06-26.
// Endpoints: / /oura /strava /strava/callback /whoop

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...extra },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url      = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    try {
      if (pathname === '/')                return handleRoot();
      if (pathname === '/oura')            return handleOura(env);
      if (pathname === '/strava')          return handleStrava(env);
      if (pathname === '/strava/callback') return handleStravaCallback(url, env);
      if (pathname === '/whoop')           return handleWhoop();
      return new Response('Not found', { status: 404, headers: CORS });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  },
};

function handleRoot() {
  return json({
    name: 'health-protocol',
    version: '1.0.0',
    endpoints: ['/oura', '/strava', '/whoop'],
    strava_reauth: '/strava/callback (OAuth callback if tokens expire)',
    updated: new Date().toISOString(),
  });
}

// /oura — reads jubilant-bassoon private outbox via GITHUB_PAT secret
async function handleOura(env) {
  const r = await fetch(
    'https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/outbox/oura-data.json',
    { headers: { Authorization: `token ${env.GITHUB_PAT}`, Accept: 'application/json' } }
  );
  if (!r.ok) return json({ error: `oura upstream ${r.status}` }, r.status);
  return new Response(await r.text(), {
    headers: {
      'Content-Type': 'application/json',
      ...CORS,
      'Cache-Control': 'public, max-age=300',
    },
  });
}

// /strava — live Strava API, tokens stored in HP_KV, auto-refreshes on expiry
async function handleStrava(env) {
  let tokens = (await env.HP_KV.get('strava:tokens', 'json')) || {};
  let { access_token, refresh_token, expires_at } = tokens;

  if (!refresh_token) {
    return json({
      error: 'Strava not configured',
      setup: 'POST initial tokens to KV or visit /strava/callback',
    }, 503);
  }

  // Refresh if expired or within 60s of expiry (expires_at=0 always triggers)
  if (!access_token || Date.now() > expires_at - 60_000) {
    const r = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     env.STRAVA_CLIENT_ID,
        client_secret: env.STRAVA_CLIENT_SECRET,
        refresh_token,
        grant_type:    'refresh_token',
      }),
    });
    const d = await r.json();
    if (!d.access_token) return json({ error: 'Strava refresh failed', detail: d }, 502);
    access_token  = d.access_token;
    refresh_token = d.refresh_token;
    expires_at    = d.expires_at * 1000;
    await env.HP_KV.put('strava:tokens',
      JSON.stringify({ access_token, refresh_token, expires_at }));
  }

  const auth = { Authorization: `Bearer ${access_token}` };
  const [actResp, athResp] = await Promise.all([
    fetch('https://www.strava.com/api/v3/athlete/activities?per_page=15', { headers: auth }),
    fetch('https://www.strava.com/api/v3/athlete', { headers: auth }),
  ]);
  const [activities, athlete] = await Promise.all([actResp.json(), athResp.json()]);

  return json({
    fetched_at: new Date().toISOString(),
    athlete: {
      id: athlete.id, firstname: athlete.firstname,
      lastname: athlete.lastname, city: athlete.city, country: athlete.country,
    },
    activities: activities.map(a => ({
      id: a.id, name: a.name, sport_type: a.sport_type,
      start_local: a.start_date_local, distance: a.distance,
      moving_time: a.moving_time, elapsed_time: a.elapsed_time,
      elevation: a.total_elevation_gain, avg_speed: a.average_speed,
      max_speed: a.max_speed, avg_hr: a.average_heartrate,
      max_hr: a.max_heartrate, avg_cadence: a.average_cadence,
      calories: a.calories, achievement_count: a.achievement_count,
      pr_count: a.pr_count,
    })),
  }, 200, { 'Cache-Control': 'public, max-age=300' });
}

// /strava/callback — OAuth callback, stores tokens in KV automatically
// Authorize URL:
//   https://www.strava.com/oauth/authorize?client_id=261196
//     &redirect_uri=https://health-protocol.jeffunglesbee.workers.dev/strava/callback
//     &response_type=code&scope=activity:read_all
async function handleStravaCallback(url, env) {
  const code  = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  if (error) return page(`<h1>Strava denied: ${error}</h1>`, 400);
  if (!code)  return page('<h1>No auth code — tokens already seeded via KV</h1>');

  const r = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.STRAVA_CLIENT_ID, client_secret: env.STRAVA_CLIENT_SECRET,
      code, grant_type: 'authorization_code',
    }),
  });
  const d = await r.json();
  if (!d.access_token) return page(`<h1>Token exchange failed</h1><pre>${JSON.stringify(d,null,2)}</pre>`, 502);

  await env.HP_KV.put('strava:tokens', JSON.stringify({
    access_token: d.access_token, refresh_token: d.refresh_token,
    expires_at: d.expires_at * 1000,
  }));

  const name = d.athlete ? `${d.athlete.firstname} ${d.athlete.lastname}` : 'Unknown';
  return page(`<h1 style="color:#22D3EE">&#10003; Strava Reconnected</h1>
    <p>Athlete: <strong>${name}</strong></p>
    <p>Tokens refreshed in KV.</p>
    <p><a href="https://jeffunglesbee-create.github.io/health-protocol">&#8594; Dashboard</a></p>`);
}

// /whoop — read-only proxy to field-relay-nba (URL fetch only, no code import)
async function handleWhoop() {
  const r = await fetch('https://field-relay-nba.jeffunglesbee.workers.dev/whoop/fetch?days=5');
  if (!r.ok) return json({ error: `whoop upstream ${r.status}` }, r.status);
  return new Response(await r.text(), {
    headers: { 'Content-Type': 'application/json', ...CORS, 'Cache-Control': 'public, max-age=60' },
  });
}

function page(body, status = 200) {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="UTF-8">
     <style>body{background:#0A1628;color:#fff;font-family:monospace;
     padding:40px;text-align:center}a{color:#22D3EE}</style></head>
     <body>${body}</body></html>`,
    { status, headers: { 'Content-Type': 'text/html' } }
  );
}
JSEOF
echo "src/index.js written: $(wc -l src/index.js) lines"
```

---

## TASK 2 — Create wrangler.toml with real KV_ID

```bash
cd /home/claude/health-protocol
cat > wrangler.toml << EOF
name            = "health-protocol"
main            = "src/index.js"
compatibility_date = "2026-06-26"
account_id      = "b57e9af57ab46c52ca9215804e689c29"

[[kv_namespaces]]
binding = "HP_KV"
id      = "${KV_ID}"

# Secrets managed via wrangler secret put (done in Task 4):
#   GITHUB_PAT           — reads jubilant-bassoon private outbox
#   STRAVA_CLIENT_ID     — 261196
#   STRAVA_CLIENT_SECRET — from strava.com/settings/api
EOF

echo "wrangler.toml written — KV_ID: $(grep 'id' wrangler.toml | tail -1)"
grep "REPLACE_WITH" wrangler.toml && echo "ERROR: placeholder not replaced" || echo "OK: no placeholders"
```

---

## TASK 3 — Create worker-deploy.yml

```bash
mkdir -p /home/claude/health-protocol/.github/workflows
cat > /home/claude/health-protocol/.github/workflows/worker-deploy.yml << 'YMLEOF'
name: Deploy Health Protocol Worker

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'wrangler.toml'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy Worker
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: b57e9af57ab46c52ca9215804e689c29
YMLEOF
echo "worker-deploy.yml written"
```

---

## TASK 4 — Update index.html

Find and replace the URL constants block. Find:
```
const WHOOP_URL = 'https://field-relay-nba.jeffunglesbee.workers.dev/whoop/fetch?days=5';
const OURA_URL = 'https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/outbox/oura-data.json';
```

Replace with:
```javascript
const WHOOP_URL  = 'https://health-protocol.jeffunglesbee.workers.dev/whoop';
const OURA_URL   = 'https://health-protocol.jeffunglesbee.workers.dev/oura';
const STRAVA_URL = 'https://health-protocol.jeffunglesbee.workers.dev/strava';
```

Then find the Promise.all block:
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
      setStrava(s?.activities?.length ? s : null);
      setLoading(false);
    })
```

Add `const [strava, setStrava] = useState(null);` alongside the other useState calls.

Add Strava panel in JSX after the Whoop panel:
```jsx
{!loading && strava && (
  <div className="rounded-2xl p-4 mb-4 bg-white" style={{border:'1px solid #E5E7EB'}}>
    <div className="font-black mb-3" style={{color:'#0A1628',fontSize:10,letterSpacing:'0.15em'}}>
      STRAVA · {strava.fetched_at ? new Date(strava.fetched_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}
    </div>
    {strava.activities.slice(0, 5).map((a, i) => (
      <div key={a.id||i} className="flex justify-between items-center py-1.5 border-b" style={{borderColor:'#F3F4F6'}}>
        <div>
          <span className="font-semibold text-sm" style={{color:'#0A1628'}}>{a.name}</span>
          <span className="text-xs ml-2" style={{color:'#6B7280'}}>{a.sport_type}</span>
        </div>
        <div className="text-right">
          <span className="font-mono font-bold text-sm" style={{color:'#7C3AED'}}>
            {a.distance ? (a.distance/1000).toFixed(1)+'km' : '—'}
          </span>
          {a.pr_count > 0 && (
            <span className="ml-1 text-xs font-bold" style={{color:'#C2410C'}}>{a.pr_count}PR</span>
          )}
        </div>
      </div>
    ))}
  </div>
)}
```

Verify:
```bash
grep "health-protocol.jeffunglesbee.workers.dev" index.html | wc -l
# Expected: 3 (WHOOP_URL, OURA_URL, STRAVA_URL)
grep "setStrava" index.html | wc -l
# Expected: 2+ (useState + setter call)
```

---

## TASK 5 — npm install (wrangler needs node_modules)

```bash
cd /home/claude/health-protocol
npm init -y 2>/dev/null || true
npm install wrangler --save-dev --silent
echo "wrangler installed: $(npx wrangler --version)"
```

---

## TASK 6 — Deploy Worker

```bash
cd /home/claude/health-protocol
npx wrangler deploy 2>&1
# Expected output includes:
# "Deployed health-protocol triggers"
# URL: https://health-protocol.jeffunglesbee.workers.dev

# Verify Worker is live
sleep 5
WORKER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "https://health-protocol.jeffunglesbee.workers.dev/")
echo "Worker root: HTTP $WORKER_STATUS"
[ "$WORKER_STATUS" = "200" ] || echo "WARN: unexpected status — check wrangler output"
```

---

## TASK 7 — Set Worker secrets (fully automated)

```bash
cd /home/claude/health-protocol

# GITHUB_PAT — reads jubilant-bassoon private outbox for Oura data
echo "${FIELD_PAT}" | npx wrangler secret put GITHUB_PAT
echo "GITHUB_PAT: $?"

# STRAVA_CLIENT_ID
echo "${CLIENT_ID}" | npx wrangler secret put STRAVA_CLIENT_ID
echo "STRAVA_CLIENT_ID: $?"

# STRAVA_CLIENT_SECRET
echo "${CLIENT_SECRET}" | npx wrangler secret put STRAVA_CLIENT_SECRET
echo "STRAVA_CLIENT_SECRET: $?"

# Verify secrets registered (not values — just names)
npx wrangler secret list 2>&1
# Expected: GITHUB_PAT, STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET listed
```

---

## TASK 8 — Seed Strava tokens in KV (fully automated)

Access token from screenshots is already expired (2026-06-26T21:58:10Z).
Setting expires_at=0 so Worker auto-refreshes immediately on first request.
The refresh_token is valid indefinitely until revoked.

```bash
cd /home/claude/health-protocol

STRAVA_TOKENS=$(python3 -c "
import json
print(json.dumps({
    'access_token': '1974e6b574eda8fa16af67b1061005d8b067b0d7',
    'refresh_token': '${REFRESH_TOKEN}',
    'expires_at': 0
}))
")

npx wrangler kv key put \
    --namespace-id="${KV_ID}" \
    "strava:tokens" \
    "${STRAVA_TOKENS}"

echo "KV seed result: $?"

# Verify KV write
npx wrangler kv key get \
    --namespace-id="${KV_ID}" \
    "strava:tokens" 2>&1 | head -1
# Expected: JSON with access_token, refresh_token, expires_at
```

---

## TASK 9 — Test all endpoints

```bash
BASE="https://health-protocol.jeffunglesbee.workers.dev"

echo "=== Endpoint smoke test ==="

# Root health check
ROOT=$(curl -s "${BASE}/")
echo "/ → $(echo $ROOT | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['name'], d['endpoints'])" 2>/dev/null || echo "PARSE ERROR: $ROOT")"

# Oura
OURA_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/oura")
echo "/oura → HTTP $OURA_STATUS (200=data, 401=PAT issue, 404=outbox missing)"

# Strava — should auto-refresh token and return activities
STRAVA=$(curl -s "${BASE}/strava")
STRAVA_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/strava")
echo "/strava → HTTP $STRAVA_STATUS"
echo "$STRAVA" | python3 -c "
import json,sys
d=json.load(sys.stdin)
if 'activities' in d:
    print(f'Activities: {len(d[\"activities\"])}, Athlete: {d[\"athlete\"][\"firstname\"]} {d[\"athlete\"][\"lastname\"]}')
elif 'error' in d:
    print(f'Error: {d[\"error\"]}')
" 2>/dev/null

# Whoop — proxies field relay
WHOOP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/whoop")
echo "/whoop → HTTP $WHOOP_STATUS"

# Strava callback (no code = shows existing KV note)
CB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/strava/callback")
echo "/strava/callback (no code) → HTTP $CB_STATUS (expect 200)"

# Confirm FIELD relay untouched
FIELD_HEALTH=$(curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/health" | head -c 30)
echo "FIELD relay /health → ${FIELD_HEALTH}..."
```

---

## TASK 10 — Commit and push health-protocol

```bash
cd /home/claude/health-protocol
git config user.email "github-actions@github.com"
git config user.name "Claude Code"

git add src/index.js wrangler.toml .github/workflows/worker-deploy.yml index.html
git status

git commit -m "feat: standalone health-protocol Worker + live Oura/Strava/Whoop endpoints"
git push origin main
echo "Push result: $?"

# GitHub Pages redeploys automatically via pages.yml
# GitHub Actions worker-deploy.yml will fire on future src/ changes
```

---

## DONE CONDITIONS

```bash
# 1. Worker root returns correct JSON
curl -s "https://health-protocol.jeffunglesbee.workers.dev/" | \
  python3 -c "import json,sys; d=json.load(sys.stdin); assert d['name']=='health-protocol'; print('OK: root')"

# 2. /strava returns activities (auto-refresh worked)
curl -s "https://health-protocol.jeffunglesbee.workers.dev/strava" | \
  python3 -c "import json,sys; d=json.load(sys.stdin); assert 'activities' in d; print(f'OK: strava — {len(d[\"activities\"])} activities')"

# 3. /oura returns data or expected auth shape (not 404)
OURA_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://health-protocol.jeffunglesbee.workers.dev/oura")
python3 -c "assert '${OURA_CODE}' != '404', 'FAIL: /oura returning 404'; print(f'OK: /oura HTTP ${OURA_CODE}')"

# 4. /whoop proxies field relay
WHOOP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://health-protocol.jeffunglesbee.workers.dev/whoop")
python3 -c "assert '${WHOOP_CODE}' == '200', f'FAIL: /whoop HTTP ${WHOOP_CODE}'; print('OK: /whoop')"

# 5. index.html uses Worker URLs (not old raw.githubusercontent or field-relay WHOOP_URL)
grep -c "health-protocol.jeffunglesbee.workers.dev" index.html | \
  python3 -c "import sys; n=int(sys.stdin.read()); assert n>=3, f'Only {n} Worker URLs found'; print(f'OK: {n} Worker URLs in index.html')"

# 6. wrangler.toml has real KV ID (not placeholder)
grep "REPLACE_WITH" wrangler.toml && echo "FAIL: placeholder in wrangler.toml" || echo "OK: wrangler.toml clean"

# 7. FIELD relay untouched
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/health" | grep -q "RELAY OK" && \
  echo "OK: FIELD relay unchanged" || echo "WARN: FIELD relay unexpected response"

# 8. src/index.js committed to health-protocol
git -C /home/claude/health-protocol log --oneline -3
```

---

## ONE MANUAL STEP (post-completion)

Add `CLOUDFLARE_API_TOKEN` to health-protocol GitHub repo secrets so
`worker-deploy.yml` auto-deploys on future `src/` pushes:

```
github.com/jeffunglesbee-create/health-protocol/settings/secrets/actions
→ New repository secret → CLOUDFLARE_API_TOKEN → [CF API token]
```

Everything else — Strava tokens, GITHUB_PAT, KV seeding, Worker deploy — is automated above.

---

## OUT OF SCOPE

- field-relay-nba: zero changes
- jubilant-bassoon: zero changes
- FIELD smoke tests: not applicable
- Strava OAuth callback flow: not needed (tokens seeded in Task 8)
- GitHub Actions Strava workflow: not needed (Worker handles token refresh live in KV)
