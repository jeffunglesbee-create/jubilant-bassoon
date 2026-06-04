#!/usr/bin/env python3
"""
Dropbox OAuth bootstrap — exchange auth code for refresh token, then
set DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY, DROPBOX_APP_SECRET as
durable repo secrets. Verifies by minting an access token via the
refresh-flow round-trip.

Pure Python (no bash heredoc dance) for reliability inside CI.

Env vars expected:
  APP_KEY, APP_SECRET, AUTH_CODE  — Dropbox OAuth inputs
  BOOTSTRAP_PAT                   — GitHub PAT with repo+secrets scope
  REPO                            — owner/repo (e.g. 'foo/bar')
"""

import base64
import json
import os
import sys
import time

import requests
from nacl import encoding, public

DROPBOX_TOKEN_URL = "https://api.dropbox.com/oauth2/token"
GITHUB_API = "https://api.github.com"


def err(msg):
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def exchange_code(app_key, app_secret, auth_code):
    """POST /oauth2/token with grant_type=authorization_code."""
    print("Exchanging authorization code for refresh token...")
    basic = base64.b64encode(f"{app_key}:{app_secret}".encode()).decode()
    r = requests.post(
        DROPBOX_TOKEN_URL,
        headers={
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={
            "grant_type": "authorization_code",
            "code": auth_code,
        },
        timeout=30,
    )
    print(f"  HTTP {r.status_code}")
    try:
        body = r.json()
    except ValueError:
        err(f"non-JSON response: {r.text[:300]}")

    if r.status_code != 200:
        # Redact sensitive fields from diagnostic
        safe = {k: v for k, v in body.items() if k not in ("access_token", "refresh_token")}
        print(f"  Response (safe fields only): {json.dumps(safe)}")
        if "error" in safe:
            common = {
                "invalid_grant": "Auth code expired (~10 min) or already used. Generate a new code via OAuth consent URL.",
                "invalid_client": "App key / App secret mismatch. Check Settings tab in Dropbox app console.",
                "invalid_request": "Missing parameters or malformed request.",
            }
            hint = common.get(safe.get("error"), "")
            if hint:
                print(f"  Hint: {hint}")
        err(f"exchange failed with HTTP {r.status_code}")

    refresh = body.get("refresh_token")
    if not refresh:
        safe = {k: v for k, v in body.items() if k not in ("access_token", "refresh_token")}
        print(f"  Response keys: {list(body.keys())}")
        print(f"  Response (safe): {json.dumps(safe)}")
        err("response had no refresh_token (was token_access_type=offline set in authorize URL?)")

    print(f"  refresh_token obtained ({len(refresh)} chars)")
    print(f"  access_token expires in {body.get('expires_in', '?')}s")
    return refresh


def set_repo_secret(pat, repo, name, value, pubkey_info=None):
    """Encrypt and PUT a repository Actions secret."""
    if pubkey_info is None:
        r = requests.get(
            f"{GITHUB_API}/repos/{repo}/actions/secrets/public-key",
            headers={
                "Authorization": f"token {pat}",
                "Accept": "application/vnd.github+json",
            },
            timeout=15,
        )
        r.raise_for_status()
        pubkey_info = r.json()

    pub = public.PublicKey(pubkey_info["key"].encode("utf-8"), encoding.Base64Encoder())
    sealed = public.SealedBox(pub)
    enc = sealed.encrypt(value.encode("utf-8"))
    b64 = base64.b64encode(enc).decode("utf-8")

    r = requests.put(
        f"{GITHUB_API}/repos/{repo}/actions/secrets/{name}",
        headers={
            "Authorization": f"token {pat}",
            "Accept": "application/vnd.github+json",
        },
        json={"encrypted_value": b64, "key_id": pubkey_info["key_id"]},
        timeout=15,
    )
    ok = r.status_code in (201, 204)
    print(f"  PUT {name}: HTTP {r.status_code} {'OK' if ok else r.text[:200]}")
    return ok, pubkey_info


def verify_refresh_flow(app_key, app_secret, refresh_token):
    """Mint an access token via refresh-token grant to prove the flow works."""
    print("Verifying refresh-flow round-trip...")
    basic = base64.b64encode(f"{app_key}:{app_secret}".encode()).decode()
    r = requests.post(
        DROPBOX_TOKEN_URL,
        headers={
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        },
        timeout=30,
    )
    print(f"  HTTP {r.status_code}")
    if r.status_code != 200:
        err(f"refresh-flow round-trip failed: {r.text[:300]}")
    body = r.json()
    if not body.get("access_token"):
        err("refresh-flow response missing access_token")
    print(f"  access_token expires in {body.get('expires_in', '?')}s — flow verified")


def main():
    app_key = os.environ["APP_KEY"]
    app_secret = os.environ["APP_SECRET"]
    auth_code = os.environ["AUTH_CODE"]
    pat = os.environ["BOOTSTRAP_PAT"]
    repo = os.environ["REPO"]

    # Mask any leaked echo to logs
    for v in (app_key, app_secret, auth_code, pat):
        print(f"::add-mask::{v}")

    refresh_token = exchange_code(app_key, app_secret, auth_code)
    # Mask the refresh token too
    print(f"::add-mask::{refresh_token}")

    print("Setting durable GitHub secrets...")
    pubkey = None
    all_ok = True
    for name, val in [
        ("DROPBOX_REFRESH_TOKEN", refresh_token),
        ("DROPBOX_APP_KEY", app_key),
        ("DROPBOX_APP_SECRET", app_secret),
    ]:
        ok, pubkey = set_repo_secret(pat, repo, name, val, pubkey)
        all_ok = all_ok and ok
    if not all_ok:
        err("one or more secret PUTs failed")

    verify_refresh_flow(app_key, app_secret, refresh_token)
    print("\nBootstrap complete. All three Dropbox secrets are set and verified.")


if __name__ == "__main__":
    main()
