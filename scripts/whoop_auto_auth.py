import os, json, base64, time, requests, sys
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

# FIXED: hardcode correct redirect_uri — must match Whoop developer app registration
# (was reading WHOOP_REDIRECT_URI secret which had wrong value)
redirect_uri = "https://field-relay-nba.jeffunglesbee.workers.dev/whoop/callback"

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

    # Intercept relay callback — capture code before relay consumes it
    def handle_route(route, request):
        url = request.url
        if "/whoop/callback" in url and "code=" in url:
            parsed = urlparse(url)
            code = parse_qs(parsed.query).get("code", [None])[0]
            if code:
                captured_code[0] = code
                print(f"CODE INTERCEPTED: {code[:20]}...")
            route.abort()  # Abort so relay doesn't consume; we exchange below
        else:
            route.continue_()

    page.route("**/*", handle_route)

    try:
        print("1. Loading OAuth auth page...")
        page.goto(auth_url, wait_until="domcontentloaded", timeout=60000)
        try:
            page.wait_for_load_state("networkidle", timeout=30000)
        except:
            pass
        time.sleep(3)

        print(f"   URL: {page.url[:150]}")
        page.screenshot(path="outbox/whoop-auth-1.png")

        # Check if OAuth error page (wrong redirect_uri would show this)
        if "error" in page.url or "An OAuth 2.0 Error" in (page.inner_text("body") or ""):
            result["error"] = "oauth_error_page"
            result["page_text"] = page.inner_text("body")[:1000]
            print("ERROR: OAuth error page — redirect_uri mismatch?")
        else:
            print("2. Waiting for login form...")
            try:
                page.wait_for_selector("input", timeout=30000)
            except:
                print("   No input found after 30s")

            time.sleep(2)
            page.screenshot(path="outbox/whoop-auth-2.png")

            inputs = page.query_selector_all("input")
            print(f"   Found {len(inputs)} input elements")
            for i, inp in enumerate(inputs):
                attrs = {}
                for attr in ["type", "name", "id", "placeholder", "autocomplete", "aria-label"]:
                    val = inp.get_attribute(attr)
                    if val:
                        attrs[attr] = val
                print(f"   input[{i}]: {attrs}")

            buttons = page.query_selector_all("button")
            print(f"   Found {len(buttons)} buttons")
            for i, btn in enumerate(buttons[:5]):
                print(f"   button[{i}]: text='{btn.inner_text()[:50]}' type={btn.get_attribute('type')}")

            # Fill email
            filled = False
            for sel in ['input[name="email"]', 'input[type="email"]', 'input[id="email"]',
                         'input[name="username"]', 'input[id="username"]',
                         'input[autocomplete="email"]', 'input[autocomplete="username"]',
                         'input[placeholder*="email" i]', 'input[aria-label*="email" i]']:
                el = page.query_selector(sel)
                if el and el.is_visible():
                    el.click(); el.fill(email)
                    print(f"3. Filled email via: {sel}")
                    filled = True; break

            if not filled:
                for inp in inputs:
                    itype = inp.get_attribute("type") or ""
                    if itype in ("text", "email", "") and inp.is_visible():
                        inp.click(); inp.fill(email)
                        print(f"3. Filled email via fallback (type={itype})")
                        filled = True; break

            if not filled:
                result["error"] = "no_email_field"
                result["html_snippet"] = page.content()[:3000]
                print("3. FAILED to find email field")
            else:
                pass_el = page.query_selector('input[type="password"]')
                if pass_el and pass_el.is_visible():
                    pass_el.click(); pass_el.fill(password)
                    print("4. Filled password")
                else:
                    print("4. No password field (multi-step)")

                page.screenshot(path="outbox/whoop-auth-3.png")
                time.sleep(1)

                print("5. Submitting...")
                submitted = False
                for sel in ['button[type="submit"]', 'button:has-text("Log in")',
                              'button:has-text("Log In")', 'button:has-text("Sign in")',
                              'button:has-text("Continue")', 'button:has-text("Next")',
                              'input[type="submit"]']:
                    btn = page.query_selector(sel)
                    if btn and btn.is_visible():
                        btn.click(); print(f"   Clicked: {sel}"); submitted = True; break
                if not submitted:
                    page.keyboard.press("Enter"); print("   Pressed Enter")

                print("6. Waiting for response...")
                try:
                    page.wait_for_load_state("networkidle", timeout=30000)
                except:
                    pass
                time.sleep(3)
                page.screenshot(path="outbox/whoop-auth-4.png")
                print(f"   URL: {page.url[:200]}")

                # Multi-step password screen
                pass_el2 = page.query_selector('input[type="password"]')
                if pass_el2 and pass_el2.is_visible():
                    print("   Multi-step: password screen")
                    pass_el2.click(); pass_el2.fill(password); time.sleep(1)
                    for sel in ['button[type="submit"]', 'button:has-text("Log in")', 'button:has-text("Continue")']:
                        btn = page.query_selector(sel)
                        if btn and btn.is_visible():
                            btn.click(); break
                    try:
                        page.wait_for_load_state("networkidle", timeout=15000)
                    except:
                        pass
                    time.sleep(5)
                    page.screenshot(path="outbox/whoop-auth-5.png")
                    print(f"   URL after password: {page.url[:200]}")

                # Authorize consent screen
                for sel in ['button:has-text("Authorize")', 'button:has-text("Allow")',
                              'button:has-text("Accept")', 'button:has-text("Grant")']:
                    btn = page.query_selector(sel)
                    if btn and btn.is_visible():
                        print("7. Clicking authorize button")
                        btn.click()
                        try:
                            page.wait_for_load_state("networkidle", timeout=15000)
                        except:
                            pass
                        time.sleep(5); page.screenshot(path="outbox/whoop-auth-6.png"); break

                time.sleep(5)
                print(f"8. Code intercepted: {bool(captured_code[0])}")

    except Exception as e:
        result["error"] = str(e)[:500]
        print(f"Error: {e}")
        try: page.screenshot(path="outbox/whoop-auth-error.png")
        except: pass

    browser.close()

# Exchange the intercepted code
if captured_code[0]:
    code = captured_code[0]
    print(f"Exchanging code {code[:20]}...")
    r = requests.post("https://api.prod.whoop.com/oauth/oauth2/token", data={
        "grant_type": "authorization_code",
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri
    })
    if r.status_code == 200:
        tokens = r.json()
        print(f"Tokens OK. expires_in={tokens.get('expires_in')} has_refresh={bool(tokens.get('refresh_token'))}")

        # Store in GitHub secrets
        headers_gh = {"Authorization": f"token {pat}", "Accept": "application/vnd.github+json"}
        pk_r = requests.get(f"https://api.github.com/repos/{repo}/actions/secrets/public-key", headers=headers_gh)
        pk_data = pk_r.json()
        pub_key = public.PublicKey(pk_data["key"].encode("utf-8"), encoding.Base64Encoder)
        sealed = public.SealedBox(pub_key)
        for name, val in [("WHOOP_REFRESH_TOKEN", tokens.get("refresh_token","")),
                           ("WHOOP_ACCESS_TOKEN",  tokens.get("access_token",""))]:
            if val:
                enc = base64.b64encode(sealed.encrypt(val.encode())).decode()
                resp = requests.put(f"https://api.github.com/repos/{repo}/actions/secrets/{name}",
                    headers=headers_gh, json={"encrypted_value": enc, "key_id": pk_data["key_id"]})
                print(f"GitHub {name}: HTTP {resp.status_code}")

        # Update D1 directly so field-relay-nba /whoop/fetch works immediately
        if cf_token:
            expires_at = (datetime.utcnow() + timedelta(seconds=int(tokens.get("expires_in", 3600)))).isoformat() + "Z"
            d1_resp = requests.post(
                f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/d1/database/{CF_DB_ID}/query",
                headers={"Authorization": f"Bearer {cf_token}", "Content-Type": "application/json"},
                json={
                    "sql": "INSERT OR REPLACE INTO whoop_tokens (id, access_token, refresh_token, expires_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'))",
                    "params": ["primary", tokens["access_token"], tokens.get("refresh_token",""), expires_at]
                }
            )
            d1_ok = "success" in d1_resp.text
            print(f"D1 update: HTTP {d1_resp.status_code} ok={d1_ok}")
        else:
            print("No CLOUDFLARE_API_TOKEN — D1 not updated (add secret to workflow)")

        result = {"status": "success", "has_refresh": bool(tokens.get("refresh_token")),
                  "expires_in": tokens.get("expires_in"), "d1_updated": bool(cf_token)}
    else:
        result = {"token_error": r.status_code, "body": r.text[:500]}
        print(f"Exchange failed: {r.status_code} {r.text[:200]}")
elif "error" not in result:
    result["status"] = "no_code_intercepted"

with open("outbox/whoop-auth-result.json", "w") as f:
    json.dump(result, f, indent=2)
print(f"Result: {result.get('status') or result.get('error')}")
