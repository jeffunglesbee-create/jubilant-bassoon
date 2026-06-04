# Drive auto-upload setup

One-time configuration to wire `patent-fulltext.yml` directly into the FIELD
Drive parent. Estimated time: **5-10 minutes**, all free tier.

After this is done, every patent fetched lands in Drive automatically with the
correct title convention. No manual copy-paste, no Drive MCP roundtrips.

## What you're building

```
GitHub Actions runner --> Google service account --> Drive API --> FIELD Drive parent
       (free)                  (free, no billing)         (free)         (existing)
```

A service account is a non-human Google identity that authenticates with a
JSON key file instead of a password. It's the standard pattern for letting
CI write to Google APIs.

## Prerequisites

- Google account with access to the FIELD Drive parent (`0ABxH84VndHL7Uk9PVA`)
- Admin access to the jubilant-bassoon repo (to set secrets)
- **2-Step Verification enabled on your Google account** (required as of May 12,
  2025 for personal accounts and Q2 2026 for enterprise accounts -- see
  https://docs.cloud.google.com/docs/authentication/mfa-requirement)
- ~10-15 minutes (add ~5 min if 2SV isn't yet set up)

**Important clarification on 2FA:** The 2FA requirement applies only to YOU
(the human logging into Google Cloud Console). It does NOT apply to the service
account itself. Per Google's official doc: "Google Cloud MFA enforcement
doesn't affect service accounts. Only user accounts are affected." Service
accounts authenticate via a signed JWT using the JSON key, not via 2FA. So the
`GDRIVE_SA_KEY` mechanism in this pipeline is unaffected -- the service
account in CI will keep working without any second factor.

No billing setup needed. Drive API free tier covers ~1 billion requests/day
project-wide. We'll use approximately 18 per patent run.

---

## Part 1: Create the service account (5 minutes)

### 1.1 Open Google Cloud Console

Go to https://console.cloud.google.com

If prompted, sign in with the Google account that has access to the FIELD
Drive parent.

**If 2-Step Verification is not yet enabled on your account**, Google will
require enrollment before you reach the console. Options:
- **Google Prompts** (easiest if your phone is signed into the same Google
  account; tap "Yes" on the prompt that appears)
- **Authenticator app** (Google Authenticator, Authy, 1Password, etc.)
- **SMS code** (less secure; only if no authenticator app available)
- **Physical security key** (most secure)

Once enrolled, you won't need to do this again for future logins from the
same device.

### 1.2 Create or select a project

Top-left, click the project dropdown. Either:
- **Create new**: name it `field-patent-uploader` or similar
- **Use existing**: any project works; the service account is project-scoped

Note the **Project ID** (shown under the project name, e.g. `field-patent-uploader-471823`).

### 1.3 Enable the Drive API

Left nav: **APIs & Services** > **Library**

Search for `Google Drive API`, click it, click **ENABLE**.

Takes about 10 seconds. You'll see "API enabled" confirmation.

### 1.4 Create the service account

Left nav: **IAM & Admin** > **Service Accounts** > **+ CREATE SERVICE ACCOUNT**

Fields:
- **Service account name**: `patent-uploader`
- **Service account ID**: (auto-filled, e.g. `patent-uploader`)
- **Description**: `Uploads patent research artifacts from jubilant-bassoon CI`

Click **CREATE AND CONTINUE**.

Skip the "Grant this service account access to project" step (click **CONTINUE**
without selecting any roles -- the service account doesn't need any GCP IAM
roles for this use case).

Skip the "Grant users access to this service account" step (click **DONE**).

### 1.5 Generate the JSON key

You'll now be on the Service Accounts list. Click the row for `patent-uploader`.

Click the **KEYS** tab at the top.

Click **ADD KEY** > **Create new key** > **JSON** > **CREATE**.

A file like `field-patent-uploader-471823-abc123def456.json` downloads. **Keep
this file private** -- it's the equivalent of a password. Don't commit it to
git, don't email it, don't paste it anywhere except GitHub Secrets.

### 1.6 Note the service account email

On the same Service Accounts page, copy the **Email** for `patent-uploader`.
Format: `patent-uploader@field-patent-uploader-471823.iam.gserviceaccount.com`

You'll paste this in Part 2.

---

## Part 2: Create a destination folder + share with the service account (2 minutes)

A service account cannot upload to your "My Drive" root directly — only to
folders explicitly shared with it. Create a dedicated folder for patent
artifacts; share that folder; use ITS ID as `GDRIVE_PARENT_ID`.

### 2.1 Create a folder in Drive

1. Open Drive (drive.google.com)
2. Click **+ New** > **New folder**
3. Name it something findable like `FIELD-patents` or `Patent research`
4. Open the folder (double-click it)
5. Copy the folder ID from the URL bar. The URL looks like:
   `https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz`
   The folder ID is the part after `/folders/` (the `1AbCdEf...` string).

Save this folder ID — you'll paste it into a GitHub secret in Part 3.

### 2.2 Share the folder with the service account

1. Right-click the folder in Drive > **Share**
2. Paste the service account email from step 1.6
3. Set permission to **Editor** (allows create + update)
4. **Uncheck "Notify people"** — the service account has no inbox
5. Click **Send** / **Share**

The service account can now write to that folder. Files it creates will be
owned by the service account but visible inside this folder to you.

---

## Part 3: Add secrets to GitHub (2 minutes)

### 3.1 Open the repo secrets page

https://github.com/jeffunglesbee-create/jubilant-bassoon/settings/secrets/actions

(Or: repo > Settings > Secrets and variables > Actions)

### 3.2 Add GDRIVE_SA_KEY

Click **New repository secret**.

- **Name**: `GDRIVE_SA_KEY`
- **Secret**: open the JSON file you downloaded in step 1.5 in any text
  editor, copy the ENTIRE contents (including `{` and `}`), paste here.

Click **Add secret**.

### 3.3 Add GDRIVE_PARENT_ID (required)

Click **New repository secret**.

- **Name**: `GDRIVE_PARENT_ID`
- **Secret**: the folder ID you copied in step 2.1 (the part of the Drive URL
  after `/folders/`).

The pipeline will skip Drive upload entirely if this secret is unset, since
there's no safe default to fall back to.

---

## Part 4: Test it (1 minute)

Trigger the workflow with one patent to verify everything works:

```
gh workflow run patent-fulltext.yml -f patents=10846193
```

Watch the run:
```
gh run watch
```

Or open Actions in the browser:
https://github.com/jeffunglesbee-create/jubilant-bassoon/actions

In the run output, the "3/3 Upload to Drive" step should show:
```
Uploading 2 files to Drive parent 1AbCdEf... (your folder ID)...
  created: Patent -- US10846193 -- Dynatrace -- 2020-11-24.txt
  created: Patent -- US10846193 -- Dynatrace -- 2020-11-24 (claim comparison).md
```

Open the `FIELD-patents` (or whatever you named it) folder in Drive and
confirm the files are there.

---

## Troubleshooting

### "Upload failed: HttpError 403: File not found" or HttpError 404

The service account doesn't have access to the folder ID in `GDRIVE_PARENT_ID`.
Common causes:

- You shared a folder with the SA email but pasted a DIFFERENT folder's ID
  into the secret. Re-copy the ID from the URL of the folder you actually
  shared.
- You tried to use the My Drive root ID (e.g. `0A...` starting with 0A, length
  ~28). The My Drive root can't be shared with a service account; you need
  a specific folder inside it.
- You shared the folder but the SA email had a typo. Verify the SA email in
  GCP Console matches what's listed in the folder's share settings.

The "File not found" message is misleading -- it actually means
"not visible to this identity."

### "google-api-python-client not installed; skipping Drive upload"

The workflow's conditional `pip install` didn't fire. Check that
`GDRIVE_SA_KEY` is set at repo-level (not environment-level) and is non-empty.
The workflow's install step only runs google-api-python-client when this
secret exists.

### "GDRIVE_SA_KEY is not valid JSON"

The secret value got mangled when pasting. Re-open the JSON file, select
all (Ctrl+A / Cmd+A), copy, paste fresh. No extra whitespace, no backslash
escaping needed.

### Files uploaded but I can't see them

If they're in your dedicated patents folder: open Drive, navigate to the
folder you created in Part 2.1. They should be there.

If you don't see them in that folder: the SA may have written them but
they're owned by the SA, which is fine — they still appear inside the
shared folder for you. If they're missing from the folder entirely, check
the run logs for "created" vs "updated" entries to confirm uploads
actually fired.

Note: service-account-owned files DO appear in folders you've shared with
the SA, but they will NOT appear in your global "Recent" or search results
the same way as files you own. Always navigate to the patents folder
directly.

### Service account email doesn't show up in Drive sharing search

That's normal. Service account emails aren't in any contacts directory.
Just paste the full email; Drive will accept it.

### "Service account key creation is disabled for this organization"

Some enterprise Workspace admins (likely including Hopkins IT) enable the
GCP organization policy constraint `iam.disableServiceAccountKeyCreation`,
which blocks downloading JSON keys for service accounts. If you hit this:

**Option A**: Use a personal Google account for the GCP project instead of
your Hopkins/work account. Create the project under your personal Gmail,
create the service account there, and share the FIELD Drive folder with
that service account. This sidesteps the Hopkins org policy entirely.

**Option B**: Switch to Workload Identity Federation (WIF). GitHub Actions
authenticates to GCP via OIDC tokens, no JSON key required. More complex
setup (creating a Workload Identity Pool + Provider, mapping the GitHub
repository attribute), but it's the security-recommended pattern and
bypasses the key-creation block. The `google-github-actions/auth@v2`
action handles the OIDC exchange. Not built into this pipeline yet; ask
for a follow-up doc if you need to go this route.

### "Access blocked: This app's request is invalid"

You hit Google's OAuth screen, which doesn't apply to service accounts.
Double-check you're using a service account JSON key, not OAuth client
credentials. Service account JSON has a `"type": "service_account"` field
at the top.

### I want to revoke access later

Two options:
1. **Remove from Drive**: Drive > Shared drives > Manage members > remove
   the SA email
2. **Delete the SA**: GCP Console > IAM & Admin > Service Accounts > delete
   `patent-uploader`. All keys are invalidated immediately.

Files already uploaded persist either way (owned by Shared Drive, not SA).

---

## What this setup does NOT do

- **No Drive read access from CI for unrelated files.** The SA can only access
  what you explicitly share with it. It cannot see your other Drive content.
- **No OAuth user impersonation.** Service accounts authenticate as themselves,
  not as you. Audit logs will show `patent-uploader@...` as the author.
- **No automatic key rotation.** The JSON key in `GDRIVE_SA_KEY` doesn't expire.
  Consider rotating manually every 12-24 months by repeating step 1.5 and
  updating the secret.

---

## Cost

$0. GCP service accounts and Drive API are free at this scale. Drive API
free tier is ~1B requests/day project-wide; one patent upload uses ~5
requests, one workflow run uses ~15-30 requests across all uploaded files.
You'd need to upload 30M+ patents/day to approach any limit.

---

## What's next after this is set up

Trigger the full June 25 prep run:

```
gh workflow run patent-fulltext.yml \
  -f patents=10846193,11182537,8335848,8533532,9571591,9509714
```

Six patents, 18 artifacts in Drive about 2 minutes later, attorney has
everything they need in plain text + JSON + comparison markdown.

The weekly `patent-watch.yml` cron also benefits from this setup -- when
it finds an assignee match in the previous week's grants/PGPub, it can
auto-trigger `patent-fulltext.yml` for those hits (future enhancement,
not built yet).
