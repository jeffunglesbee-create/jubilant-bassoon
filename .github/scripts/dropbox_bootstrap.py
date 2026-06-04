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
DIAG_PATH = "outbox/_dropbox_bootstrap_diag.log"


def _write_diag(text):
    os.makedirs(os.path.dirname(DIAG_PATH), exist_ok=True)
    with open(DIAG_PATH, "a") as f:
        f.write(text + "\n")


def err(msg, *, extra=""):
    full = f"ERROR: {msg}"
    if extra:
        full = f"{full}\n  {extra}"
    print(full, file=sys.stderr)
    _write_diag(full)
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
    _write_diag(f"exchange_code HTTP {r.status_code}")

    try:
        body = r.json()
    except ValueError:
        err("non-JSON response", extra=f"text={r.text[:300]}")

    # Always log safe fields for diagnostic
    safe = {k: v for k, v in body.items() if k not in ("access_token", "refresh_token")}
    _write_diag(f"exchange_code safe body: {json.dumps(safe)}")

    if r.status_code != 200:
        print(f"  Response (safe): {json.dumps(safe)}")
        common = {
            "invalid_grant": "Auth code expired (~10 min) or already used. Generate a NEW code via the OAuth consent URL. (Single-use; a prior workflow attempt may have consumed it.)",
            "invalid_client": "App key / App secret mismatch. Check Settings tab in Dropbox app console.",
            "invalid_request": "Missing parameters or malformed request.",
        }
        hint = common.get(safe.get("error"), "")
        err(f"exchange failed HTTP {r.status_code}", extra=f"safe={json.dumps(safe)}; hint={hint}")

    refresh = body.get("refresh_token")
    if not refresh:
        err(
            "response had no refresh_token",
            extra=f"keys={list(body.keys())}; safe={json.dumps(safe)}; "
                  "was token_access_type=offline set in authorize URL?",
        )

    print(f"  refresh_token obtained ({len(refresh)} chars)")
    print(f"  access_token expires in {body.get('expires_in', '?')}s")
    _write_diag(f"exchange_code: refresh_token len={len(refresh)}, expires_in={body.get('expires_in')}")
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
    # Write a marker so we know main() was reached
    _write_diag("=== bootstrap run start ===")

    try:
        app_key = os.environ["APP_KEY"]
        app_secret = os.environ["APP_SECRET"]
        auth_code = os.environ["AUTH_CODE"]
        pat = os.environ["BOOTSTRAP_PAT"]
        repo = os.environ["REPO"]
    except KeyError as e:
        err(f"missing env var: {e}")

    _write_diag(f"env ok: app_key.len={len(app_key)} app_secret.len={len(app_secret)} auth_code.len={len(auth_code)} pat.len={len(pat)} repo={repo}")

    # Mask any leaked echo to logs
    for v in (app_key, app_secret, auth_code, pat):
        print(f"::add-mask::{v}")

    try:
        refresh_token = exchange_code(app_key, app_secret, auth_code)
    except Exception as e:
        import traceback
        err(f"exchange_code crashed: {type(e).__name__}: {e}", extra=traceback.format_exc())

    # Mask the refresh token too
    print(f"::add-mask::{refresh_token}")

    print("Setting durable GitHub secrets...")
    _write_diag("setting durable github secrets...")
    pubkey = None
    all_ok = True
    try:
        for name, val in [
            ("DROPBOX_REFRESH_TOKEN", refresh_token),
            ("DROPBOX_APP_KEY", app_key),
            ("DROPBOX_APP_SECRET", app_secret),
        ]:
            ok, pubkey = set_repo_secret(pat, repo, name, val, pubkey)
            all_ok = all_ok and ok
            _write_diag(f"  set {name}: ok={ok}")
    except Exception as e:
        import traceback
        err(f"set_repo_secret crashed: {type(e).__name__}: {e}", extra=traceback.format_exc())

    if not all_ok:
        err("one or more secret PUTs failed")

    try:
        verify_refresh_flow(app_key, app_secret, refresh_token)
    except Exception as e:
        import traceback
        err(f"verify_refresh_flow crashed: {type(e).__name__}: {e}", extra=traceback.format_exc())

    print("\nBootstrap complete. All three Dropbox secrets are set and verified.")
    _write_diag("=== bootstrap success ===")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        import traceback
        err(f"unhandled: {type(e).__name__}: {e}", extra=traceback.format_exc())
