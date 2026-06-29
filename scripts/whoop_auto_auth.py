import os, json, base64, time, requests
from urllib.parse import urlencode, urlparse, parse_qs
from datetime import datetime, timedelta
from patchright.sync_api import sync_playwright
from nacl import encoding, public

client_id     = os.environ["WHOOP_CLIENT_ID"]
client_secret = os.environ["WHOOP_CLIENT_SECRET"]
email         = os.environ["WHOOP_EMAIL"]
password      = os.environ["WHOOP_PASSWORD"]
pat           = os.environ["GH_TOKEN"]
repo          = os.environ["GH_REPO"]
cf_token      = os.environ.get("CLOUDFLARE_API_TOKEN", "")
base_redirect = os.environ.get("WHOOP_REDIRECT_URI", "https://www.whoop.com")

CF_ACCOUNT_ID = "b57e9af57ab46c52ca9215804e689c29"
CF_DB_ID      = "f26669de-e772-4b56-a6d1-f8fdea08a4d4"

os.makedirs("outbox", exist_ok=True)

# Build URI variants to try (same pattern as whoop_exchange.sh)
def uri_variants(base):
    seen = []
    for u in [base, base.rstrip("/"), base.rstrip("/") + "/",
              base.replace("www.", ""), base.replace("www.", "").rstrip("/"),
              base.replace("www.", "").rstrip("/") + "/",
              "https://www.whoop.com", "https://www.whoop.com/",
              "https://whoop.com", "https://whoop.com/"]:
        if u not in seen:
            seen.append(u)
    return seen

VARIANTS = uri_variants(base_redirect)
print(f"Will try {len(VARIANTS)} redirect_uri variants: {VARIANTS}")


def attempt_oauth(redirect_uri):
    """Run browser OAuth flow with a specific redirect_uri. Returns auth code or None."""
    auth_url = "https://api.prod.whoop.com/oauth/oauth2/auth?" + urlencode({
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": "read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline",
        "state": "auto_auth"
    })

    captured_code = [None]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=[])
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 720}
        )
        page = context.new_page()

        def handle_route(route, request):
            url = request.url
            if "whoop.com" in url and "code=" in url and "api.prod.whoop.com" not in url:
                parsed = urlparse(url)
                code = parse_qs(parsed.query).get("code", [None])[0]
                if code:
                    captured_code[0] = code
                    print(f"  CODE INTERCEPTED: {code[:20]}...")
                route.abort()
            else:
                route.continue_()

        page.route("**/*", handle_route)

        try:
            print(f"  Loading OAuth page...")
            page.goto(auth_url, wait_until="domcontentloaded", timeout=60000)
            try:
                page.wait_for_load_state("networkidle", timeout=30000)
            except:
                pass
            time.sleep(3)

            # Check for OAuth error page
            body_text = ""
            try:
                body_text = page.inner_text("body") or ""
            except:
                pass

            if "OAuth 2.0 Error" in body_text or "invalid_request" in body_text:
                print(f"  OAuth error page — URI rejected")
                browser.close()
                return None

            # Fill login form
            print("  Waiting for login form...")
            try:
                page.wait_for_selector("input", timeout=30000)
            except:
                pass
            time.sleep(2)

            # Fill email
            filled = False
            for sel in ['input[name="email"]','input[type="email"]','input[id="email"]',
                         'input[name="username"]','input[autocomplete="email"]','input[autocomplete="username"]',
                         'input[placeholder*="email" i]','input[aria-label*="email" i]']:
                el = page.query_selector(sel)
                if el and el.is_visible():
                    el.click(); el.fill(email)
                    print(f"  Filled email: {sel}"); filled = True; break

            if not filled:
                for inp in page.query_selector_all("input"):
                    t = inp.get_attribute("type") or ""
                    if t in ("text","email","") and inp.is_visible():
                        inp.click(); inp.fill(email)
                        print(f"  Filled email fallback"); filled = True; break

            if not filled:
                print("  FAIL: no email field")
                browser.close()
                return None

            # Fill password
            p_el = page.query_selector('input[type="password"]')
            if p_el and p_el.is_visible():
                p_el.click(); p_el.fill(password); print("  Filled password")

            time.sleep(1)

            # Submit
            submitted = False
            for sel in ['button[type="submit"]','button:has-text("Log in")','button:has-text("Log In")',
                          'button:has-text("Sign in")','button:has-text("Sign In")','button:has-text("Continue")',
                          'button:has-text("Next")','input[type="submit"]']:
                btn = page.query_selector(sel)
                if btn and btn.is_visible():
                    btn.click(); print(f"  Clicked: {sel}"); submitted = True; break
            if not submitted:
                page.keyboard.press("Enter"); print("  Pressed Enter")

            try:
                page.wait_for_load_state("networkidle", timeout=30000)
            except:
                pass
            time.sleep(3)

            # Multi-step password
            p_el2 = page.query_selector('input[type="password"]')
            if p_el2 and p_el2.is_visible():
                print("  Multi-step password screen")
                p_el2.click(); p_el2.fill(password); time.sleep(1)
                for sel in ['button[type="submit"]','button:has-text("Log in")','button:has-text("Continue")']:
                    btn = page.query_selector(sel)
                    if btn and btn.is_visible():
                        btn.click(); break
                try:
                    page.wait_for_load_state("networkidle", timeout=15000)
                except:
                    pass
                time.sleep(5)

            # Authorize consent
            for sel in ['button:has-text("Authorize")','button:has-text("Allow")','button:has-text("Accept")']:
                btn = page.query_selector(sel)
                if btn and btn.is_visible():
                    print("  Clicking authorize")
                    btn.click()
                    try:
                        page.wait_for_load_state("networkidle", timeout=15000)
                    except:
                        pass
                    time.sleep(5); break

            time.sleep(5)

        except Exception as e:
            print(f"  Exception: {e}")
            try: page.screenshot(path="outbox/whoop-auth-error.png")
            except: pass

        browser.close()

    return captured_code[0]


def exchange_code(code, redirect_uri):
    """Exchange auth code for tokens. Returns token dict or None."""
    r = requests.post("https://api.prod.whoop.com/oauth/oauth2/token", data={
        "grant_type": "authorization_code",
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri
    })
    if r.status_code == 200:
        return r.json()
    print(f"  Exchange failed ({r.status_code}): {r.text[:200]}")
    return None


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


# Main: try each URI variant until one works
result = {"status": "all_variants_failed", "tried": []}

for i, uri in enumerate(VARIANTS):
    print(f"\n=== Variant {i+1}/{len(VARIANTS)}: {uri} ===")
    code = attempt_oauth(uri)

    if code:
        print(f"  Got code, exchanging with redirect_uri={uri}")
        tokens = exchange_code(code, uri)

        if not tokens:
            # Try exchange with other URI variants (code captured with one, exchange may need another)
            for ex_uri in VARIANTS:
                if ex_uri != uri:
                    print(f"  Retrying exchange with: {ex_uri}")
                    tokens = exchange_code(code, ex_uri)
                    if tokens:
                        break

        if tokens:
            print(f"\nSUCCESS with: {uri}")
            print(f"  has_refresh={bool(tokens.get('refresh_token'))} expires_in={tokens.get('expires_in')}")
            store_tokens(tokens)

            # Update WHOOP_REDIRECT_URI secret to the working value
            headers_gh = {"Authorization": f"token {pat}", "Accept": "application/vnd.github+json"}
            pk_r = requests.get(f"https://api.github.com/repos/{repo}/actions/secrets/public-key", headers=headers_gh)
            pk_data = pk_r.json()
            pk = public.PublicKey(pk_data["key"].encode(), encoding.Base64Encoder)
            sealed = public.SealedBox(pk)
            enc = base64.b64encode(sealed.encrypt(uri.encode())).decode()
            requests.put(f"https://api.github.com/repos/{repo}/actions/secrets/WHOOP_REDIRECT_URI",
                headers=headers_gh, json={"encrypted_value": enc, "key_id": pk_data["key_id"]})
            print(f"  Updated WHOOP_REDIRECT_URI secret to: {uri}")

            result = {"status": "success", "redirect_uri": uri, "has_refresh": bool(tokens.get("refresh_token")), "expires_in": tokens.get("expires_in")}
            break
        else:
            result["tried"].append({"uri": uri, "code_captured": True, "exchange": "failed"})
    else:
        result["tried"].append({"uri": uri, "code_captured": False})

with open("outbox/whoop-auth-result.json", "w") as f:
    json.dump(result, f, indent=2)
print(f"\nFinal: {result.get('status')}")
