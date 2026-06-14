import os, json, base64, time, requests, sys
from urllib.parse import urlencode, urlparse, parse_qs
from patchright.sync_api import sync_playwright
from nacl import encoding, public

client_id = os.environ["WHOOP_CLIENT_ID"]
client_secret = os.environ["WHOOP_CLIENT_SECRET"]
redirect_uri = os.environ["WHOOP_REDIRECT_URI"]
email = os.environ["WHOOP_EMAIL"]
password = os.environ["WHOOP_PASSWORD"]
pat = os.environ["GH_TOKEN"]
repo = os.environ["GH_REPO"]

os.makedirs("outbox", exist_ok=True)
result = {}

auth_url = "https://api.prod.whoop.com/oauth/oauth2/auth?" + urlencode({
    "response_type": "code",
    "client_id": client_id,
    "redirect_uri": redirect_uri,
    "scope": "read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline",
    "state": "auto_auth"
})

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=[])
    context = browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        viewport={"width": 1280, "height": 720}
    )
    page = context.new_page()

    try:
        print("1. Loading OAuth auth page...")
        page.goto(auth_url, wait_until="domcontentloaded", timeout=60000)
        time.sleep(5)  # Wait for SPA/redirect
        
        print(f"   URL: {page.url[:150]}")
        page.screenshot(path="outbox/whoop-auth-1.png")

        # Wait for any input field to appear (SPA rendering)
        print("2. Waiting for login form...")
        try:
            page.wait_for_selector("input", timeout=15000)
        except:
            print("   No input found after 15s, checking page...")
        
        time.sleep(2)
        page.screenshot(path="outbox/whoop-auth-2.png")
        
        # Debug: dump all elements
        html_snippet = page.content()
        # Find input fields
        inputs = page.query_selector_all("input")
        print(f"   Found {len(inputs)} input elements")
        for i, inp in enumerate(inputs):
            attrs = {}
            for attr in ["type", "name", "id", "placeholder", "autocomplete", "aria-label"]:
                val = inp.get_attribute(attr)
                if val:
                    attrs[attr] = val
            print(f"   input[{i}]: {attrs}")

        # Find buttons
        buttons = page.query_selector_all("button")
        print(f"   Found {len(buttons)} buttons")
        for i, btn in enumerate(buttons):
            print(f"   button[{i}]: text='{btn.inner_text()[:50]}' type={btn.get_attribute('type')}")

        # Try to fill email - try many selectors
        filled = False
        email_selectors = [
            'input[name="email"]', 'input[type="email"]', 'input[id="email"]',
            'input[name="username"]', 'input[id="username"]',
            'input[autocomplete="email"]', 'input[autocomplete="username"]',
            'input[placeholder*="email" i]', 'input[placeholder*="Email" i]',
            'input[aria-label*="email" i]', 'input[aria-label*="Email" i]',
        ]
        for sel in email_selectors:
            el = page.query_selector(sel)
            if el:
                el.click()
                el.fill(email)
                print(f"3. Filled email via: {sel}")
                filled = True
                break
        
        if not filled:
            # Fallback: first visible text/email input
            for inp in inputs:
                itype = inp.get_attribute("type") or ""
                if itype in ("text", "email", ""):
                    if inp.is_visible():
                        inp.click()
                        inp.fill(email)
                        print(f"3. Filled email via fallback (type={itype})")
                        filled = True
                        break
        
        if not filled:
            print("3. FAILED to find email field")
            result["error"] = "no_email_field"
            result["html_snippet"] = html_snippet[:3000]

        # Fill password
        pass_el = page.query_selector('input[type="password"]')
        if pass_el:
            pass_el.click()
            pass_el.fill(password)
            print("4. Filled password")
        else:
            print("4. No password field visible (might be multi-step)")

        page.screenshot(path="outbox/whoop-auth-3.png")
        time.sleep(1)

        # Submit
        print("5. Submitting...")
        submitted = False
        for sel in ['button[type="submit"]', 'button:has-text("Log in")', 'button:has-text("Log In")', 
                     'button:has-text("Sign in")', 'button:has-text("Sign In")',
                     'button:has-text("Continue")', 'button:has-text("Next")',
                     'input[type="submit"]']:
            btn = page.query_selector(sel)
            if btn and btn.is_visible():
                btn.click()
                print(f"   Clicked: {sel}")
                submitted = True
                break
        
        if not submitted:
            page.keyboard.press("Enter")
            print("   Pressed Enter")

        # Wait for navigation
        print("6. Waiting for response...")
        time.sleep(8)
        page.screenshot(path="outbox/whoop-auth-4.png")
        print(f"   URL: {page.url[:200]}")

        # Check if we need to fill password on a second screen
        pass_el2 = page.query_selector('input[type="password"]')
        if pass_el2 and pass_el2.is_visible():
            print("   Multi-step: password screen detected")
            pass_el2.click()
            pass_el2.fill(password)
            time.sleep(1)
            for sel in ['button[type="submit"]', 'button:has-text("Log in")', 'button:has-text("Continue")']:
                btn = page.query_selector(sel)
                if btn and btn.is_visible():
                    btn.click()
                    break
            time.sleep(8)
            page.screenshot(path="outbox/whoop-auth-5.png")
            print(f"   URL after password: {page.url[:200]}")

        # Check for authorize/consent
        for sel in ['button:has-text("Authorize")', 'button:has-text("Allow")', 'button:has-text("Accept")', 'button:has-text("Grant")']:
            btn = page.query_selector(sel)
            if btn and btn.is_visible():
                print("7. Clicking authorize button")
                btn.click()
                time.sleep(5)
                page.screenshot(path="outbox/whoop-auth-6.png")
                break

        final_url = page.url
        print(f"8. Final URL: {final_url[:250]}")

        # Extract code
        parsed = urlparse(final_url)
        params = parse_qs(parsed.query)
        code = params.get("code", [None])[0]

        if code:
            print(f"CODE: {code[:20]}...")
            r = requests.post("https://api.prod.whoop.com/oauth/token", data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri
            })
            if r.status_code == 200:
                tokens = r.json()
                headers_gh = {"Authorization": f"token {pat}", "Accept": "application/vnd.github+json"}
                pk_r = requests.get(f"https://api.github.com/repos/{repo}/actions/secrets/public-key", headers=headers_gh)
                pk_data = pk_r.json()
                pub_key = public.PublicKey(pk_data["key"].encode("utf-8"), encoding.Base64Encoder)
                sealed = public.SealedBox(pub_key)
                for name, val in [("WHOOP_REFRESH_TOKEN", tokens.get("refresh_token","")), ("WHOOP_ACCESS_TOKEN", tokens.get("access_token",""))]:
                    if val:
                        enc = base64.b64encode(sealed.encrypt(val.encode())).decode()
                        requests.put(f"https://api.github.com/repos/{repo}/actions/secrets/{name}", headers=headers_gh, json={"encrypted_value": enc, "key_id": pk_data["key_id"]})
                result = {"status": "success", "has_refresh": bool(tokens.get("refresh_token")), "expires_in": tokens.get("expires_in")}
                print("SUCCESS — tokens stored")
            else:
                result = {"token_error": r.status_code, "body": r.text[:500]}
        else:
            result["status"] = "no_code"
            result["final_url"] = final_url[:300]
            result["page_text"] = page.inner_text("body")[:2000]

    except Exception as e:
        result["error"] = str(e)[:500]
        print(f"Error: {e}")
        try: page.screenshot(path="outbox/whoop-auth-error.png")
        except: pass

    browser.close()

with open("outbox/whoop-auth-result.json", "w") as f:
    json.dump(result, f, indent=2)
