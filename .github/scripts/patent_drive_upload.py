#!/usr/bin/env python3
"""
[PARKED 2026-06-04] Drive auto-upload for patent research outputs.

This script is structurally correct but not in use. On 2026-06-04 we
discovered that Google service accounts cannot consume My Drive storage
quota (policy change from April 2024), so SA uploads to a personal-Gmail
My Drive folder fail with HTTP 403 'storageQuotaExceeded' regardless of
folder-level permissions. The free Gmail tier can't create Shared Drives
(Workspace plan only). Workflow uses patent_dropbox_upload.py instead.

Re-enable this script if/when:
  - Jeff (or his org) provisions a Google Workspace plan + Shared Drive
  - GDRIVE_PARENT_ID secret is updated to the Shared Drive folder ID
  - Workflow step is swapped back from Dropbox to Drive
  - The service account is added as a member of the Shared Drive
    (Editor role minimum)

Gated on the presence of GDRIVE_SA_KEY (service account JSON) and
GDRIVE_PARENT_ID env vars. If either is missing, the script no-ops
gracefully so the workflow doesn't fail.

Naming convention (per outbox/patents/README.md):
  Patent -- US{number} -- {assignee_short} -- {YYYY-MM-DD}.{ext}

Idempotent: queries Drive for an existing file with the same name in
the same parent; updates if present, creates if not.

One-time setup (do once per repo):
  1. Create a GCP service account, download JSON key.
  2. Share the FIELD Drive parent folder with the service account email
     (grant Editor).
  3. Add secrets to the GitHub repo:
       GDRIVE_SA_KEY        = entire JSON file content (paste as-is)
       GDRIVE_PARENT_ID     = Drive folder ID (default 0ABxH84VndHL7Uk9PVA)
"""

import io
import json
import os
import sys
from pathlib import Path

OUTBOX = Path("outbox/patents")
# No default parent: My Drive roots and Shared Drive roots both use the 0A...
# prefix but only Shared Drive roots and individual folders are valid upload
# targets for a service account. Set GDRIVE_PARENT_ID explicitly to a folder
# you've created and shared with the service account email.

MIME_MAP = {
    ".json": "application/json",
    ".txt":  "text/plain",
    ".md":   "text/markdown",
}


def main():
    sa_key = os.environ.get("GDRIVE_SA_KEY", "").strip()
    parent_id = os.environ.get("GDRIVE_PARENT_ID", "").strip()

    if not sa_key:
        print("GDRIVE_SA_KEY not set; skipping Drive upload (workflow continues)")
        return 0

    if not parent_id:
        print("GDRIVE_PARENT_ID not set; skipping Drive upload.")
        print("See outbox/patents/DRIVE_SETUP.md for how to create the target folder.")
        return 0

    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaIoBaseUpload
    except ImportError:
        print("google-api-python-client not installed; skipping Drive upload")
        print("Install with: pip install google-api-python-client google-auth")
        return 0

    try:
        sa_info = json.loads(sa_key)
    except json.JSONDecodeError as e:
        print(f"GDRIVE_SA_KEY is not valid JSON: {e}")
        return 1

    creds = service_account.Credentials.from_service_account_info(
        sa_info,
        scopes=["https://www.googleapis.com/auth/drive"],
    )
    service = build("drive", "v3", credentials=creds, cache_discovery=False)

    # Get all files in outbox/patents/
    files_to_upload = sorted(OUTBOX.glob("US*.txt")) + \
                      sorted(OUTBOX.glob("US*-compare.md")) + \
                      sorted(OUTBOX.glob("watch-*.json"))

    if not files_to_upload:
        print("No files to upload in outbox/patents/")
        return 0

    print(f"Uploading {len(files_to_upload)} files to Drive parent {parent_id}...")

    for f in files_to_upload:
        title = compute_drive_title(f)
        mime = MIME_MAP.get(f.suffix, "text/plain")
        upload_or_update(service, f, title, mime, parent_id)

    return 0


def compute_drive_title(local_path: Path) -> str:
    """Map local filename to Drive title per convention."""
    name = local_path.name
    if name.startswith("watch-"):
        # watch-2026-06-04.json -> "Patent watch -- 2026-06-04.json"
        return f"Patent watch -- {name[len('watch-'):]}"
    # US10846193.txt / US10846193-compare.md
    if name.startswith("US"):
        # Pull metadata from the corresponding JSON file
        m = name[:name.index(".")] if "." in name else name
        # Strip suffix like -compare
        patent_id = m.split("-")[0][2:]  # "10846193"
        suffix = ""
        if "-compare" in name:
            suffix = " (claim comparison)"

        meta_path = OUTBOX / f"US{patent_id}.json"
        assignee_short = "unknown"
        date_str = "undated"
        if meta_path.exists():
            try:
                meta = json.loads(meta_path.read_text())
                assignees = meta.get("assignees") or []
                if assignees:
                    full = assignees[0].get("assignee_organization", "")
                    # First word is usually enough for the title
                    assignee_short = (full.split()[0] if full else "unknown")
                date_str = meta.get("patent_date", "undated")
            except Exception:
                pass

        ext = local_path.suffix
        return f"Patent -- US{patent_id} -- {assignee_short} -- {date_str}{suffix}{ext}"

    return name


def upload_or_update(service, local_path: Path, title: str, mime: str, parent_id: str):
    from googleapiclient.http import MediaIoBaseUpload
    # Check if a file with this title already exists in the parent
    safe_title = title.replace("'", "\\'")
    query = (
        f"name = '{safe_title}' and '{parent_id}' in parents and trashed = false"
    )
    try:
        results = service.files().list(
            q=query,
            fields="files(id, name)",
            pageSize=1,
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
        ).execute()
    except Exception as e:
        print(f"  query failed for '{title}': {e}")
        return

    existing = results.get("files", [])
    media_body = MediaIoBaseUpload(
        io.BytesIO(local_path.read_bytes()),
        mimetype=mime,
        resumable=False,
    )

    try:
        if existing:
            file_id = existing[0]["id"]
            service.files().update(
                fileId=file_id,
                media_body=media_body,
                supportsAllDrives=True,
            ).execute()
            print(f"  updated: {title}")
        else:
            metadata = {
                "name": title,
                "parents": [parent_id],
                "mimeType": mime,
            }
            service.files().create(
                body=metadata,
                media_body=media_body,
                fields="id, name",
                supportsAllDrives=True,
            ).execute()
            print(f"  created: {title}")
    except Exception as e:
        print(f"  upload failed for '{title}': {e}")


if __name__ == "__main__":
    sys.exit(main())
