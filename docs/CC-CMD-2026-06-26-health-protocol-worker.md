# CC-CMD: Health Protocol — Standalone Cloudflare Worker
**Date:** 2026-06-26
**Repo:** health-protocol ONLY — zero changes to jubilant-bassoon or field-relay-nba
**Supersedes:** CC-CMD-2026-06-26-health-protocol-relay.md (DO NOT RUN that one)
**Rule 87:** Self-completing. No carry-forwards.

---

## CONTEXT

New architecture: dedicated `health-protocol` Worker at
`health-protocol.jeffunglesbee.workers.dev` — completely separate from FIELD.

CF Account ID: b57e9af57ab46c52ca9215804e689c29

Advantages over the superseded relay approach:
- field-relay-nba src/index.js untouched
- Strava tokens refresh live in Worker KV — no GitHub Actions, no PyNaCl
- /strava/callback handles OAuth automatically in-browser
- Own wrangler.toml, own KV, own secrets — zero FIELD coupling

Endpoints to ship:
- `GET /oura`            → jubilant-bassoon outbox via GITHUB_PAT
- `GET /strava`          → live Strava API, tokens in HP_KV
- `GET /strava/callback` → OAuth callback, seeds KV tokens automatically
- `GET /whoop`           → proxies field-relay-nba (read-only, no code coupling)
- `GET /`               → health check JSON

---

## PROBE BLOCK

```bash
cd /home/claude
git clone https://GHP_FIELD_PAT_SEE_SECRETS@github.com/jeffunglesbee-create/health-protocol.git
cd health-protocol

HP_HEAD=$(git rev-parse HEAD)
echo "HP_HEAD: $HP_HEAD"

# 1. Confirm no src/ or wrangler.toml yet
ls src/ 2>/dev/null && echo "src EXISTS — check before writing" || echo "src: missing — OK"
ls wrangler.toml 2>/dev/null && echo "wrangler.toml EXISTS" || echo "wrangler.toml: missing — OK"

# 2. Confirm index.html has old OURA_URL
grep "OURA_URL\|STRAVA_URL" index.html
# Expected: OURA_URL points to jubilant-bassoon raw URL — needs updating

# 3. Create KV namespace via Cloudflare API
CF_ACCOUNT_ID="b57e9af57ab46c52ca9215804e689c29"
CF_TOKEN="${CLOUDFLARE_API_TOKEN}"

KV_RESULT=$(curl -s -X POST \
  "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"title":"hp-kv"}')

echo "$KV_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print('KV ID:', d['result']['id'] if d['success'] else 'ERROR: '+str(d['errors']))"
KV_ID=$(echo "$KV_RESULT" | python3 -c "import json,sys; print(json.load(sys.stdin)['result']['id'])")

# If KV creation fails (already exists), list and find hp-kv:
# curl -s "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces" \
#   -H "Authorization: Bearer ${CF_TOKEN}" | python3 -c "
# import json,sys
# for ns in json.load(sys.stdin)['result']:
#     print(ns['id'], ns['title'])"

echo "KV_ID=$KV_ID"
# Store KV_ID — needed for wrangler.toml
```

Stop if KV_ID is empty. Diagnose before proceeding.

---

## TASK 1 — Create Worker source

Create `src/index.js` in health-protocol:

```javascript
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

// ── / ─────────────────────────────────────────────────────────────────────────
function handleRoot() {
  return json({
    name: 'health-protocol',
    version: '1.0.0',
    endpoints: ['/oura', '/strava', '/whoop'],
    strava_setup: '/strava/callback (OAuth callback)',
    updated: new Date().toISOString(),
  });
}

// ── /oura ─────────────────────────────────────────────────────────────────────
// Reads jubilant-bassoon outbox (private repo) via GITHUB_PAT Worker secret.
// Data written by jubilant-bassoon oura-fetch.yml — no duplication needed.
async function handleOura(env) {
  const r = await fetch(
    'https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/outbox/oura-data.json',
    { headers: { Authorization: `token ${env.GITHUB_PAT}`, Accept: 'application/json' } }
  );
  if (!r.ok) return json({ error: `oura upstream ${r.status}` }, r.status);
  return new Response(await r.text(), {
    headers: { 'Content-Type': 'application/json', ...CORS, 'Cache-Control': 'public, max-age=300' },
  });
}

// ── /strava ───────────────────────────────────────────────────────────────────
// Tokens stored in HP_KV ('strava:tokens'). Auto-refreshes on expiry.
// Strava access tokens expire every 6 hours — KV update is atomic.
async function handleStrava(env) {
  let { access_token, refresh_token, expires_at } =
    (await env.HP_KV.get('strava:tokens', 'json')) || {};

  if (!refresh_token) {
    return json({
      error: 'Strava not configured',
      setup: 'Visit /strava/auth to begin OAuth flow',
    }, 503);
  }

  // Refresh token if expired or within 60 seconds of expiry
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
    expires_at    = d.expires_at * 1000; // Unix seconds → ms
    await env.HP_KV.put('strava:tokens',
      JSON.stringify({ access_token, refresh_token, expires_at }));
  }

  const authHeader = { Authorization: `Bearer ${access_token}` };
  const [actResp, athResp] = await Promise.all([
    fetch('https://www.strava.com/api/v3/athlete/activities?per_page=15', { headers: authHeader }),
    fetch('https://www.strava.com/api/v3/athlete', { headers: authHeader }),
  ]);

  const [activities, athlete] = await Promise.all([actResp.json(), athResp.json()]);

  return json({
    fetched_at: new Date().toISOString(),
    athlete: {
      id:        athlete.id,
      firstname: athlete.firstname,
      lastname:  athlete.lastname,
      city:      athlete.city,
      country:   athlete.country,
    },
    activities: activities.map(a => ({
      id:                a.id,
      name:              a.name,
      sport_type:        a.sport_type,
      start_local:       a.start_date_local,
      distance:          a.distance,
      moving_time:       a.moving_time,
      elapsed_time:      a.elapsed_time,
      elevation:         a.total_elevation_gain,
      avg_speed:         a.average_speed,
      max_speed:         a.max_speed,
      avg_hr:            a.average_heartrate,
      max_hr:            a.max_heartrate,
      avg_cadence:       a.average_cadence,
      calories:          a.calories,
      achievement_count: a.achievement_count,
      pr_count:          a.pr_count,
    })),
  }, 200, { 'Cache-Control': 'public, max-age=300' });
}

// ── /strava/callback ──────────────────────────────────────────────────────────
// OAuth callback. Strava redirects here after user authorizes.
// Exchanges code for tokens, stores in KV, returns success page.
// Authorize URL:
//   https://www.strava.com/oauth/authorize
//     ?client_id=CLIENT_ID
//     &redirect_uri=https://health-protocol.jeffunglesbee.workers.dev/strava/callback
//     &response_type=code
//     &scope=activity:read_all
async function handleStravaCallback(url, env) {
  const code  = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) return html(`<h1>Strava denied: ${error}</h1>`);
  if (!code)  return html('<h1>No auth code received</h1>', 400);

  const r = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });
  const d = await r.json();

  if (!d.access_token) {
    return html(`<h1>Token exchange failed</h1><pre>${JSON.stringify(d, null, 2)}</pre>`, 502);
  }

  await env.HP_KV.put('strava:tokens', JSON.stringify({
    access_token:  d.access_token,
    refresh_token: d.refresh_token,
    expires_at:    d.expires_at * 1000,
  }));

  const name = d.athlete ? `${d.athlete.firstname} ${d.athlete.lastname}` : 'Unknown';
  return html(`
    <h1 style="color:#22D3EE">&#10003; Strava Connected</h1>
    <p>Athlete: <strong>${name}</strong></p>
    <p>Tokens stored in KV. Auto-refresh active.</p>
    <p><a href="https://jeffunglesbee-create.github.io/health-protocol">
      &#8594; Open Dashboard</a></p>
  `);
}

// ── /whoop ────────────────────────────────────────────────────────────────────
// Read-only proxy to field-relay-nba Whoop endpoint.
// No FIELD code imported — just a URL fetch. Coupling is intentionally minimal.
async function handleWhoop() {
  const r = await fetch(
    'https://field-relay-nba.jeffunglesbee.workers.dev/whoop/fetch?days=5'
  );
  if (!r.ok) return json({ error: `whoop upstream ${r.status}` }, r.status);
  return new Response(await r.text(), {
    headers: { 'Content-Type': 'application/json', ...CORS, 'Cache-Control': 'public, max-age=60' },
  });
}

// ── helpers ───────────────────────────────────────────────────────────────────
function html(body, status = 200) {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="UTF-8">
     <style>body{background:#0A1628;color:#fff;font-family:monospace;
     padding:40px;text-align:center}a{color:#22D3EE}</style></head>
     <body>${body}</body></html>`,
    { status, headers: { 'Content-Type': 'text/html' } }
  );
}
```

---

## TASK 2 — Create wrangler.toml

Substitute the actual KV_ID from the probe block.

```toml
name            = "health-protocol"
main            = "src/index.js"
compatibility_date = "2026-06-26"
account_id      = "b57e9af57ab46c52ca9215804e689c29"

# HP_KV: token storage for Strava OAuth + any future health data
# Separate from all FIELD KV namespaces.
[[kv_namespaces]]
binding = "HP_KV"
id      = "REPLACE_WITH_KV_ID_FROM_PROBE"

# Worker secrets (set via wrangler secret put or CF dashboard):
#   GITHUB_PAT           — reads jubilant-bassoon private outbox
#   STRAVA_CLIENT_ID     — from strava.com/settings/api
#   STRAVA_CLIENT_SECRET — from strava.com/settings/api
```

---

## TASK 3 — Create worker-deploy.yml

```yaml
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
```

---

## TASK 4 — Deploy Worker and set secrets

```bash
cd /home/claude/health-protocol
npm init -y
npm install wrangler --save-dev

# Deploy Worker (uses CLOUDFLARE_API_TOKEN env var if available)
npx wrangler deploy

# Set Worker secrets
echo "GHP_FIELD_PAT_SEE_SECRETS" | npx wrangler secret put GITHUB_PAT
# STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET: set via CF dashboard after Strava app created
# (May not be available yet — skip if Strava app not created)

echo "Worker deployed at: https://health-protocol.jeffunglesbee.workers.dev"
```

If wrangler deploy fails (CF auth not available in sandbox):
- Push all files to GitHub
- Go to health-protocol/settings/secrets → add CLOUDFLARE_API_TOKEN
- worker-deploy.yml will auto-deploy on push

---

## TASK 5 — Update index.html

Find the URL constants block (near top of script tag):

```javascript
const WHOOP_URL = 'https://field-relay-nba.jeffunglesbee.workers.dev/whoop/fetch?days=5';
const OURA_URL = 'https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/outbox/oura-data.json';
```

Replace with:

```javascript
const WHOOP_URL  = 'https://health-protocol.jeffunglesbee.workers.dev/whoop';
const OURA_URL   = 'https://health-protocol.jeffunglesbee.workers.dev/oura';
const STRAVA_URL = 'https://health-protocol.jeffunglesbee.workers.dev/strava';
```

Find `Promise.all`:

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

Add `const [strava, setStrava] = useState(null);` with the other useState calls.

Add Strava panel to JSX after the Whoop panel:

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

---

## TASK 6 — Commit and push health-protocol

```bash
cd /home/claude/health-protocol
git add src/index.js wrangler.toml .github/workflows/worker-deploy.yml index.html
git commit -m "feat: standalone health-protocol Worker + dashboard Strava panel"
git push origin main
echo "Pushed: $?"
# GitHub Pages redeploys automatically via pages.yml
```

---

## DONE CONDITIONS

```bash
# 1. Worker responds at root
curl -s "https://health-protocol.jeffunglesbee.workers.dev/" | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print('OK:', d['name'], d['endpoints'])"
# Expected: OK: health-protocol ['/oura', '/strava', '/whoop']

# 2. /oura returns data (or auth error if GITHUB_PAT not set yet)
curl -s -o /dev/null -w "oura: %{http_code}\n" \
  "https://health-protocol.jeffunglesbee.workers.dev/oura"
# Expected: 200 or 401 (not 404)

# 3. /strava returns setup message (not 404)
curl -s "https://health-protocol.jeffunglesbee.workers.dev/strava" | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print('strava:', d.get('error','OK'), d.get('setup',''))"
# Expected: "strava: Strava not configured Visit /strava/auth..." (503 is fine — KV empty until OAuth)
# NOT acceptable: 404 or unhandled exception

# 4. /whoop proxies field relay
curl -s -o /dev/null -w "whoop: %{http_code}\n" \
  "https://health-protocol.jeffunglesbee.workers.dev/whoop"
# Expected: 200

# 5. /strava/callback exists (returns HTML, not 404)
curl -s -o /dev/null -w "callback: %{http_code}\n" \
  "https://health-protocol.jeffunglesbee.workers.dev/strava/callback"
# Expected: 400 (no code param) — correct, endpoint exists

# 6. FIELD relay untouched
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/health" | head -1
# Expected: "RELAY OK — nba + ..." (unchanged)

# 7. index.html uses new Worker URLs
grep "health-protocol.jeffunglesbee.workers.dev" /home/claude/health-protocol/index.html | wc -l
# Expected: 3+ (WHOOP_URL, OURA_URL, STRAVA_URL)

# 8. wrangler.toml has real KV ID (not placeholder)
grep "REPLACE_WITH" /home/claude/health-protocol/wrangler.toml
# Expected: no output (placeholder was replaced)

# 9. src/index.js committed
git -C /home/claude/health-protocol log --oneline -3
```

---

## MANUAL STEPS AFTER CC-CMD (browser)

### A — Strava OAuth (complete the form first)
1. Complete Strava API form at strava.com/settings/api (form filled above)
2. Note Client ID and Client Secret
3. Set Worker secrets via CF dashboard or:
   ```bash
   echo "YOUR_CLIENT_ID"     | npx wrangler secret put STRAVA_CLIENT_ID
   echo "YOUR_CLIENT_SECRET" | npx wrangler secret put STRAVA_CLIENT_SECRET
   ```
4. Visit OAuth URL in browser (replace CLIENT_ID):
   ```
   https://www.strava.com/oauth/authorize?client_id=CLIENT_ID
     &redirect_uri=https://health-protocol.jeffunglesbee.workers.dev/strava/callback
     &response_type=code
     &scope=activity:read_all
   ```
5. Authorize → Worker callback stores tokens automatically → dashboard live

### B — GITHUB_PAT for Oura
Set via CF dashboard Workers → health-protocol → Settings → Variables and Secrets:
- `GITHUB_PAT` = `GHP_FIELD_PAT_SEE_SECRETS`

### C — CLOUDFLARE_API_TOKEN for auto-deploy
If wrangler didn't deploy directly in Task 4:
- health-protocol/settings/secrets/actions → add `CLOUDFLARE_API_TOKEN`
- Push a trivial change to trigger worker-deploy.yml

---

## OUT OF SCOPE

- field-relay-nba: zero changes
- jubilant-bassoon: zero changes
- FIELD smoke tests: not applicable (different repo)
- GitHub Actions Strava workflow: not needed (Worker handles token refresh live)
- PyNaCl secret rotation: not needed (Worker KV stores tokens)
