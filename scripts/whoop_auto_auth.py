"""
Whoop Auto Auth — Raw HTTP approach (no browser)

The Whoop login page at id.whoop.com is a Next.js app that crashes in
headless browsers (Patchright/Playwright). This script bypasses the browser
entirely and uses raw HTTP requests against the ORY Hydra OAuth endpoints.

Flow:
1. GET auth URL → 302 to id.whoop.com/sign-in?login_challenge=XXX
2. POST credentials to id.whoop.com API (no JS rendering needed)
3. Follow redirects through consent → callback URL
4. Capture code from callback redirect
5. Exchange code for tokens
6. Store tokens in GitHub secrets + D1
"""

import os, json, base64, sys, time, requests
from urllib.parse import urlencode, urlparse, parse_qs, quote
from datetime import datetime, timedelta
from nacl import encoding, public

client_id     = os.environ["WHOOP_CLIENT_ID"]
client_secret = os.environ["WHOOP_CLIENT_SECRET"]
email         = os.environ["WHOOP_EMAIL"]
password      = os.environ["WHOOP_PASSWORD"]
pat           = os.environ["GH_TOKEN"]
repo          = os.environ["GH_REPO"]
cf_token      = os.environ.get("CLOUDFLARE_API_TOKEN", "")
redirect_uri  = os.environ.get("WHOOP_REDIRECT_URI", "https://www.whoop.com")

CF_ACCOUNT_ID = "b57e9af57ab46c52ca9215804e689c29"
CF_DB_ID      = "f26669de-e772-4b56-a6d1-f8fdea08a4d4"

os.makedirs("outbox", exist_ok=True)

# Tee stdout to log file
class TeeWriter:
    def __init__(self, original, logfile):
        self.original = original
        self.logfile = logfile
    def write(self, data):
        self.original.write(data)
        self.logfile.write(data)
    def flush(self):
        self.original.flush()
        self.logfile.flush()

_logfile = open("outbox/whoop-auth-log.txt", "w")
sys.stdout = TeeWriter(sys.__stdout__, _logfile)

print(f"Client ID: {client_id[:8]}...{client_id[-4:]}")
print(f"Email: {email}")
print(f"Redirect URI: {redirect_uri}")
print(f"Approach: Raw HTTP (no browser)")

result = {}


def store_tokens(tokens):
    """Store tokens in GitHub Secrets + D1."""
    headers_gh = {"Authorization": f"token {pat}", "Accept": "application/vnd.github+json"}
    pk_r = requests.get(f"https://api.github.com/repos/{repo}/actions/secrets/public-key", headers=headers_gh)
    pk_data = pk_r.json()
    pk = public.PublicKey(pk_data["key"].encode(), encoding.Base64Encoder)
    sealed = public.SealedBox(pk)

    for name, val in [("WHOOP_REFRESH_TOKEN", tokens.get("refresh_token","")),
                       ("WHOOP_ACCESS_TOKEN",  tokens.get("access_token",""))]:
        if val:
            enc = base64.b64encode(sealed.encrypt(val.encode())).decode()
            resp = requests.put(f"https://api.github.com/repos/{repo}/actions/secrets/{name}",
                headers=headers_gh, json={"encrypted_value": enc, "key_id": pk_data["key_id"]})
            print(f"  GitHub {name}: {resp.status_code}")

    if cf_token:
        expires_at = (datetime.utcnow() + timedelta(seconds=int(tokens.get("expires_in",3600)))).isoformat() + "Z"
        d1 = requests.post(
            f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/d1/database/{CF_DB_ID}/query",
            headers={"Authorization": f"Bearer {cf_token}", "Content-Type": "application/json"},
            json={"sql": "INSERT OR REPLACE INTO whoop_tokens (id, access_token, refresh_token, expires_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'))",
                  "params": ["primary", tokens["access_token"], tokens.get("refresh_token",""), expires_at]}
        )
        print(f"  D1 update: {d1.status_code}")


# Step 1: Initiate OAuth — get login_challenge
auth_url = (
    "https://api.prod.whoop.com/oauth/oauth2/auth"
    f"?response_type=code"
    f"&client_id={client_id}"
    f"&redirect_uri={quote(redirect_uri, safe='')}"
    f"&scope={quote('read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline', safe='')}"
    f"&state=auto_auth"
)

print(f"\n1. Initiating OAuth flow...")
print(f"   Auth URL: {auth_url[:200]}")

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
})

# Follow redirects manually to capture login_challenge
r = session.get(auth_url, allow_redirects=True)
print(f"   Final URL: {r.url[:200]}")
print(f"   Status: {r.status_code}")

# Extract login_challenge from URL
parsed_url = urlparse(r.url)
login_challenge = parse_qs(parsed_url.query).get("login_challenge", [None])[0]
print(f"   Login challenge: {login_challenge}")

if not login_challenge:
    print("   FAIL: no login_challenge in redirect URL")
    print(f"   Response body[:300]: {r.text[:300]}")
    result = {"error": "no_login_challenge", "final_url": r.url[:200], "body": r.text[:500]}
else:
    # Step 2: Try multiple login approaches
    print(f"\n2. Attempting login...")
    
    login_success = False
    code = None
    
    # Approach A: POST to id.whoop.com login API
    login_apis = [
        # ORY Hydra self-service login
        f"https://id.whoop.com/api/auth/login",
        f"https://id.whoop.com/api/auth/signin",
        # Next.js API routes
        f"https://id.whoop.com/api/login",
        # Direct Hydra admin
        f"https://api.prod.whoop.com/oauth/oauth2/auth/requests/login/accept",
    ]
    
    for api_url in login_apis:
        print(f"\n   Trying: {api_url}")
        for payload in [
            # JSON body variants
            {"email": email, "password": password, "login_challenge": login_challenge},
            {"email": email, "password": password, "challenge": login_challenge},
            {"username": email, "password": password, "login_challenge": login_challenge},
            {"identifier": email, "password": password, "login_challenge": login_challenge},
        ]:
            try:
                r2 = session.post(api_url, json=payload, allow_redirects=False, timeout=15)
                print(f"     Payload keys={list(payload.keys())[:3]} → HTTP {r2.status_code}")
                
                # Check for redirect with code
                if r2.status_code in (301, 302, 303, 307, 308):
                    loc = r2.headers.get("Location", "")
                    print(f"     Redirect: {loc[:150]}")
                    if "code=" in loc:
                        code = parse_qs(urlparse(loc).query).get("code", [None])[0]
                        if code:
                            print(f"     CODE CAPTURED: {code[:20]}...")
                            login_success = True
                            break
                    # Follow redirect chain
                    r3 = session.get(loc, allow_redirects=False, timeout=15)
                    if r3.status_code in (301, 302, 303, 307, 308):
                        loc2 = r3.headers.get("Location", "")
                        print(f"     Redirect 2: {loc2[:150]}")
                        if "code=" in loc2:
                            code = parse_qs(urlparse(loc2).query).get("code", [None])[0]
                            if code:
                                print(f"     CODE CAPTURED: {code[:20]}...")
                                login_success = True
                                break
                
                elif r2.status_code == 200:
                    body = r2.text[:300]
                    print(f"     Body[:100]: {body[:100]}")
                    # Check if response contains a redirect URL or code
                    try:
                        rj = r2.json()
                        redirect_to = rj.get("redirect_to", rj.get("redirect", rj.get("redirectTo", "")))
                        if redirect_to:
                            print(f"     JSON redirect: {redirect_to[:150]}")
                            if "code=" in redirect_to:
                                code = parse_qs(urlparse(redirect_to).query).get("code", [None])[0]
                                if code:
                                    print(f"     CODE CAPTURED: {code[:20]}...")
                                    login_success = True
                                    break
                            # Follow the redirect
                            r4 = session.get(redirect_to, allow_redirects=False, timeout=15)
                            print(f"     Following → HTTP {r4.status_code}")
                            if r4.status_code in (301, 302, 303, 307, 308):
                                loc3 = r4.headers.get("Location", "")
                                print(f"     Redirect 3: {loc3[:150]}")
                                if "code=" in loc3:
                                    code = parse_qs(urlparse(loc3).query).get("code", [None])[0]
                                    if code:
                                        print(f"     CODE CAPTURED: {code[:20]}...")
                                        login_success = True
                                        break
                    except:
                        pass
                elif r2.status_code in (401, 403, 404):
                    print(f"     Not found / unauthorized")
                else:
                    print(f"     Body[:100]: {r2.text[:100]}")
                    
            except Exception as e:
                print(f"     Error: {e}")
            
            if login_success:
                break
        if login_success:
            break
    
    # Approach B: Try form POST to the login page URL itself
    if not login_success:
        print(f"\n   Approach B: Form POST to {r.url[:100]}")
        for payload in [
            {"email": email, "password": password, "login_challenge": login_challenge},
            {"email": email, "password": password},
        ]:
            try:
                r5 = session.post(r.url, data=payload, allow_redirects=False, timeout=15)
                print(f"     Form POST → HTTP {r5.status_code}")
                if r5.status_code in (301, 302, 303, 307, 308):
                    loc = r5.headers.get("Location", "")
                    print(f"     Redirect: {loc[:150]}")
                    # Follow full redirect chain
                    while "code=" not in loc and r5.status_code in (301, 302, 303, 307, 308):
                        r5 = session.get(loc, allow_redirects=False, timeout=15)
                        loc = r5.headers.get("Location", "") if r5.status_code in (301, 302, 303, 307, 308) else ""
                        if loc:
                            print(f"     → {loc[:150]}")
                    if "code=" in loc:
                        code = parse_qs(urlparse(loc).query).get("code", [None])[0]
                        if code:
                            print(f"     CODE CAPTURED: {code[:20]}...")
                            login_success = True
                            break
            except Exception as e:
                print(f"     Error: {e}")

    if not login_success:
        print(f"\n   FAIL: Could not authenticate via any API endpoint")
        result = {"error": "login_api_not_found", "login_challenge": login_challenge}
    
    # Step 3: Exchange code for tokens
    if code:
        print(f"\n3. Exchanging code for tokens...")
        r_token = requests.post("https://api.prod.whoop.com/oauth/oauth2/token", data={
            "grant_type": "authorization_code",
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri
        })
        
        if r_token.status_code == 200:
            tokens = r_token.json()
            print(f"   SUCCESS! has_refresh={bool(tokens.get('refresh_token'))} expires_in={tokens.get('expires_in')}")
            
            print(f"\n4. Storing tokens...")
            store_tokens(tokens)
            
            result = {
                "status": "success",
                "redirect_uri": redirect_uri,
                "has_refresh": bool(tokens.get("refresh_token")),
                "expires_in": tokens.get("expires_in")
            }
        else:
            print(f"   Exchange FAILED: {r_token.status_code} {r_token.text[:200]}")
            result = {"error": "token_exchange_failed", "status": r_token.status_code, "body": r_token.text[:500]}

with open("outbox/whoop-auth-result.json", "w") as f:
    json.dump(result, f, indent=2)
print(f"\nFinal: {result.get('status') or result.get('error')}")
_logfile.close()
