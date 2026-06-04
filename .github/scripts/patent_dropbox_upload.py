#!/usr/bin/env python3
"""
Dropbox auto-upload for patent research outputs.

Auth resolution (in priority order):
  1. Refresh-token flow (recommended, sustainable):
       DROPBOX_REFRESH_TOKEN + DROPBOX_APP_KEY + DROPBOX_APP_SECRET
     Script exchanges refresh token for a fresh access token at runtime
     via https://api.dropbox.com/oauth2/token. Access token is good for
     ~4 hours and reused for all uploads in a single run.
  2. Legacy access token: DROPBOX_TOKEN
     Used as-is. Short-lived access tokens expire in 4 hours; legacy
     long-lived tokens never expire but Dropbox hasn't issued these
     since March 2021.
  3. If none of the above present, script no-ops gracefully.

Setup for refresh-token flow (one-time, ~5 minutes):
  1. https://www.dropbox.com/developers/apps -> Create app
     - API: Scoped access
     - Type: Full Dropbox (or App folder, your choice)
     - Name: anything (e.g., 'jubilant-bassoon-patents')
  2. Permissions tab -> enable `files.content.write` and `files.metadata.read`
  3. Settings tab -> note the App key and App secret
  4. Generate a refresh token. Easiest method:
       a. Visit:
          https://www.dropbox.com/oauth2/authorize?client_id=APP_KEY&response_type=code&token_access_type=offline
          (replace APP_KEY)
       b. Authorize, copy the code shown.
       c. Exchange the code for a refresh token:
          curl -X POST https://api.dropbox.com/oauth2/token \\
            -d grant_type=authorization_code \\
            -d code=THE_CODE \\
            -u APP_KEY:APP_SECRET
          The 'refresh_token' field in the response is what you want.
  5. Set three GitHub secrets in jubilant-bassoon:
       DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY, DROPBOX_APP_SECRET

Naming convention for uploaded files:
  Patent -- US{number} -- {assignee_short} -- {YYYY-MM-DD}.{ext}

Target folder defaults to /FIELD/patents/ and is configurable via
DROPBOX_PATENT_PATH env. Uploads use mode=overwrite for idempotency.

Why Dropbox instead of Drive: 2026-06-04 we discovered that Google
service accounts cannot consume My Drive quota (policy change April
2024), so SA uploads to a personal-Gmail My Drive folder fail with
HTTP 403 'storageQuotaExceeded' regardless of folder permissions.
The personal Gmail account can't create Shared Drives (Workspace plan
only). Dropbox sidesteps the issue entirely. See ADR-PATENT-001 for
the source-layer story; this script is just the upload destination.
"""

import base64
import json
import os
import sys
from pathlib import Path

import requests

OUTBOX = Path("outbox/patents")
DEFAULT_DROPBOX_PATH = "/FIELD/patents"
UPLOAD_URL = "https://content.dropboxapi.com/2/files/upload"
TOKEN_URL = "https://api.dropbox.com/oauth2/token"


def resolve_access_token():
    """Returns (access_token, source_label) or (None, reason)."""
    refresh_token = os.environ.get("DROPBOX_REFRESH_TOKEN", "").strip()
    app_key = os.environ.get("DROPBOX_APP_KEY", "").strip()
    app_secret = os.environ.get("DROPBOX_APP_SECRET", "").strip()

    if refresh_token and app_key and app_secret:
        print("Exchanging refresh token for access token...")
        basic = base64.b64encode(f"{app_key}:{app_secret}".encode()).decode()
        try:
            r = requests.post(
                TOKEN_URL,
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
        except requests.RequestException as e:
            return None, f"token exchange error: {e}"

        if r.status_code != 200:
            return None, f"token exchange HTTP {r.status_code}: {r.text[:200]}"
        try:
            data = r.json()
        except ValueError:
            return None, "token exchange returned non-JSON"
        access_token = data.get("access_token")
        if not access_token:
            return None, f"token exchange response missing access_token: {data}"
        expires = data.get("expires_in", "unknown")
        print(f"  got access token (expires in {expires}s)")
        return access_token, "refresh-token-flow"

    # Fall back to legacy/static access token
    legacy = os.environ.get("DROPBOX_TOKEN", "").strip()
    if legacy:
        return legacy, "DROPBOX_TOKEN"

    return None, "no Dropbox credentials present"


def compute_title(local_path: Path) -> str:
    """Map local filename to Dropbox title per project convention."""
    name = local_path.name
    if name.startswith("watch-"):
        return f"Patent watch -- {name[len('watch-'):]}"
    if name.startswith("US"):
        stem = name[:name.index(".")] if "." in name else name
        patent_id = stem.split("-")[0][2:]  # "10846193"
        suffix = " (claim comparison)" if "-compare" in name else ""

        meta_path = OUTBOX / f"US{patent_id}.json"
        assignee_short = "unknown"
        date_str = "undated"
        if meta_path.exists():
            try:
                meta = json.loads(meta_path.read_text())
                assignees = meta.get("assignees") or []
                if assignees:
                    full = assignees[0].get("assignee_organization", "")
                    assignee_short = (full.split()[0] if full else "unknown")
                date_str = meta.get("patent_date", "undated")
            except Exception:
                pass

        ext = local_path.suffix
        return f"Patent -- US{patent_id} -- {assignee_short} -- {date_str}{suffix}{ext}"
    return name


def upload_one(token: str, local_path: Path, title: str, folder: str) -> bool:
    target = f"{folder.rstrip('/')}/{title}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Dropbox-API-Arg": json.dumps({
            "path": target,
            "mode": "overwrite",
            "autorename": False,
            "mute": True,
            "strict_conflict": False,
        }),
        "Content-Type": "application/octet-stream",
    }
    try:
        with open(local_path, "rb") as f:
            body = f.read()
        r = requests.post(UPLOAD_URL, headers=headers, data=body, timeout=60)
    except (OSError, requests.RequestException) as e:
        print(f"  ✗ {title}: {e}")
        return False

    if r.status_code == 200:
        meta = r.json()
        print(f"  ✓ {title} → {meta.get('path_display')} ({len(body)} bytes)")
        return True

    # Common failure modes:
    #   401 — token expired/invalid
    #   409 — Dropbox 'path' error (e.g., conflict, malformed)
    #   429 — rate-limited (retry_after header)
    print(f"  ✗ {title}: HTTP {r.status_code} {r.text[:300]}")
    return False


def main():
    token, source = resolve_access_token()
    if not token:
        print(f"No usable Dropbox credentials ({source}); skipping upload (workflow continues)")
        return 0
    print(f"Auth source: {source}")

    folder = os.environ.get("DROPBOX_PATENT_PATH", DEFAULT_DROPBOX_PATH).strip()
    if not folder.startswith("/"):
        folder = "/" + folder

    files_to_upload = (
        sorted(OUTBOX.glob("US*.txt"))
        + sorted(OUTBOX.glob("US*-compare.md"))
        + sorted(OUTBOX.glob("watch-*.json"))
    )

    if not files_to_upload:
        print("No files to upload in outbox/patents/")
        return 0

    print(f"Uploading {len(files_to_upload)} files to Dropbox {folder}/")

    failures = 0
    for f in files_to_upload:
        title = compute_title(f)
        if not upload_one(token, f, title, folder):
            failures += 1

    if failures:
        print(f"\n{failures} of {len(files_to_upload)} uploads failed")
        return 1
    print(f"\nAll {len(files_to_upload)} files uploaded to Dropbox {folder}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
