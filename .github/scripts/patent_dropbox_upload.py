#!/usr/bin/env python3
"""
Dropbox auto-upload for patent research outputs.

Gated on DROPBOX_TOKEN env var. If missing, the script no-ops gracefully
so the workflow doesn't fail.

Naming convention matches the (parked) Drive uploader:
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

Auth: Bearer token via DROPBOX_TOKEN secret. Works with both legacy
long-lived tokens and short-lived access tokens (no refresh handling
- if the token expires the script returns non-zero and the workflow
step shows red; just refresh the secret and re-run).
"""

import json
import os
import sys
from pathlib import Path

import requests

OUTBOX = Path("outbox/patents")
DEFAULT_DROPBOX_PATH = "/FIELD/patents"
UPLOAD_URL = "https://content.dropboxapi.com/2/files/upload"


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
    token = os.environ.get("DROPBOX_TOKEN", "").strip()
    if not token:
        print("DROPBOX_TOKEN not set; skipping Dropbox upload (workflow continues)")
        return 0

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
