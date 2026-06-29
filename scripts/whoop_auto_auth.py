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

# Registered in Whoop developer app (created June 14 2026, per session docs)
# Exchange script (whoop_exchange.sh) confirmed this with https://www.whoop.com/ fallback
redirect_uri = "https://www.whoop.com/"

CF_ACCOUNT_ID = "b57e9af57ab46c52ca9215804e689c29"
CF_DB_ID      = "f26669de-e772-4b56-a6d1-f8fdea08a4d4"  # wc2026 db — whoop_tokens table

os.makedirs("outbox", exist_ok=True)
result = {}

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

    # Intercept redirect to www.whoop.com — capture code, abort before page loads
    def handle_route(route, request):
        url = request.url
        if "whoop.com" in url and "code=" in url and "api.prod.whoop.com" not in url:
            parsed = urlparse(url)
            code = parse_qs(parsed.query).get("code", [None])[0]
            if code:
                captured_code[0] = code
                print(f"CODE INTERCEPTED from {url[:80]}: {code[:20]}...")
            route.abort()
        else:
            route.continue_()

    page.route("**/*", handle_route)

    try:
        print(f"1. Loading OAuth auth page (redirect_uri={redirect_uri})...")
        page.goto(auth_url, wait_until="domcontentloaded", timeout=60000)
        try:
            page.wait_for_load_state("networkidle", timeout=30000)
        except:
            pass
        time.sleep(3)

        print(f"   URL: {page.url[:150]}")
        page.screenshot(path="outbox/whoop-auth-1.png")

        # Check for OAuth error
        body_text = ""
        try:
            body_text = page.inner_text("body") or ""
        except:
            pass
        if "An OAuth 2.0 Error Occurred" in body_text or "redirect_uri" in page.url:
            result["error"] = "oauth_error_page"
            result["body"] = body_text[:500]
            print(f"OAuth error: {body_text[:200]}")
        else:
            print("2. Waiting for login form...")
            try:
                page.wait_for_selector("input", timeout=30000)
            except:
                print("   No input found")

            time.sleep(2)
            page.screenshot(path="outbox/whoop-auth-2.png")

            inputs = page.query_selector_all("input")
            print(f"   Found {len(inputs)} inputs")
            for i, inp in enumerate(inputs):
                attrs = {a: inp.get_attribute(a) for a in ["type","name","id","placeholder","autocomplete"] if inp.get_attribute(a)}
                print(f"   input[{i}]: {attrs}")

            buttons = page.query_selector_all("button")[:5]
            for i, btn in enumerate(buttons):
                print(f"   button[{i}]: '{btn.inner_text()[:40]}' type={btn.get_attribute('type')}")

            # Fill email
            filled = False
            for sel in ['input[name="email"]','input[type="email"]','input[id="email"]',
                         'input[name="username"]','input[autocomplete="email"]','input[autocomplete="username"]',
                         'input[placeholder*="email" i]','input[aria-label*="email" i]']:
                el = page.query_selector(sel)
                if el and el.is_visible():
                    el.click(); el.fill(email)
                    print(f"3. Filled email: {sel}"); filled = True; break

            if not filled:
                for inp in inputs:
                    t = inp.get_attribute("type") or ""
                    if t in ("text","email","") and inp.is_visible():
                        inp.click(); inp.fill(email)
                        print(f"3. Filled email fallback (type={t})"); filled = True; break

            if not filled:
                result["error"] = "no_email_field"
                result["page_content"] = page.content()[:2000]
                print("3. FAIL: no email field")
            else:
                # Password
                p_el = page.query_selector('input[type="password"]')
                if p_el and p_el.is_visible():
                    p_el.click(); p_el.fill(password); print("4. Filled password")
                else:
                    print("4. No password field (multi-step)")

                page.screenshot(path="outbox/whoop-auth-3.png")
                time.sleep(1)

                # Submit
                submitted = False
                for sel in ['button[type="submit"]','button:has-text("Log in")','button:has-text("Log In")',
                              'button:has-text("Sign in")','button:has-text("Sign In")','button:has-text("Continue")',
                              'button:has-text("Next")','input[type="submit"]']:
                    btn = page.query_selector(sel)
                    if btn and btn.is_visible():
                        btn.click(); print(f"5. Clicked: {sel}"); submitted = True; break
                if not submitted:
                    page.keyboard.press("Enter"); print("5. Pressed Enter")

                try:
                    page.wait_for_load_state("networkidle", timeout=30000)
                except:
                    pass
                time.sleep(3)
                page.screenshot(path="outbox/whoop-auth-4.png")
                print(f"   URL: {page.url[:200]}")

                # Multi-step password
                p_el2 = page.query_selector('input[type="password"]')
                if p_el2 and p_el2.is_visible():
                    print("   Multi-step password screen")
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
                    page.screenshot(path="outbox/whoop-auth-5.png")
                    print(f"   URL: {page.url[:200]}")

                # Authorize consent
                for sel in ['button:has-text("Authorize")','button:has-text("Allow")','button:has-text("Accept")']:
                    btn = page.query_selector(sel)
                    if btn and btn.is_visible():
                        print("6. Clicking authorize")
                        btn.click()
                        try:
                            page.wait_for_load_state("networkidle", timeout=15000)
                        except:
                            pass
                        time.sleep(5); page.screenshot(path="outbox/whoop-auth-6.png"); break

                time.sleep(5)
                print(f"7. Code captured: {bool(captured_code[0])}")

    except Exception as e:
        result["error"] = str(e)[:500]
        print(f"Exception: {e}")
        try: page.screenshot(path="outbox/whoop-auth-error.png")
        except: pass

    browser.close()

# Exchange code → store tokens
if captured_code[0]:
    code = captured_code[0]
    print(f"Exchanging code: {code[:20]}...")
    r = requests.post("https://api.prod.whoop.com/oauth/oauth2/token", data={
        "grant_type": "authorization_code",
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri
    })
    if r.status_code == 200:
        tokens = r.json()
        print(f"OK. has_refresh={bool(tokens.get('refresh_token'))} expires_in={tokens.get('expires_in')}")

        # Store in GitHub secrets (for whoop-fetch.yml)
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

        # Update D1 directly (for field-relay-nba /whoop/fetch)
        if cf_token:
            expires_at = (datetime.utcnow() + timedelta(seconds=int(tokens.get("expires_in",3600)))).isoformat() + "Z"
            d1 = requests.post(
                f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/d1/database/{CF_DB_ID}/query",
                headers={"Authorization": f"Bearer {cf_token}", "Content-Type": "application/json"},
                json={"sql": "INSERT OR REPLACE INTO whoop_tokens (id, access_token, refresh_token, expires_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'))",
                      "params": ["primary", tokens["access_token"], tokens.get("refresh_token",""), expires_at]}
            )
            print(f"  D1 update: {d1.status_code} ok={'success' in d1.text}")

        result = {"status": "success", "has_refresh": bool(tokens.get("refresh_token")), "expires_in": tokens.get("expires_in")}
    else:
        result = {"token_error": r.status_code, "body": r.text[:500]}
        print(f"Exchange failed: {r.status_code} {r.text[:300]}")
elif "error" not in result:
    result["status"] = "no_code_intercepted"

with open("outbox/whoop-auth-result.json", "w") as f:
    json.dump(result, f, indent=2)
print(f"Final: {result.get('status') or result.get('error')}")
