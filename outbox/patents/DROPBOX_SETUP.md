# Dropbox setup for patent automation

The patent pipeline uploads research artifacts to Dropbox via the
refresh-token OAuth flow. This is a one-time setup, roughly 5 minutes.

## Why refresh-token flow (not just an access token)

Dropbox short-lived access tokens expire after 4 hours. Legacy long-lived
access tokens haven't been issued since March 2021. The sustainable
approach is to store a refresh token (long-lived) plus app credentials,
and let the workflow mint a fresh access token on each run.

## Setup steps

### 1. Create a Dropbox app

Go to https://www.dropbox.com/developers/apps and click **Create app**.

- **API:** Scoped access
- **Type:** Full Dropbox (preferred — lets us write anywhere) or App folder
  (more restrictive, all uploads land under
  `/Apps/<your-app-name>/` regardless of `path`)
- **Name:** anything unique. Suggestion: `jubilant-bassoon-patents`

### 2. Enable permissions

In your new app's **Permissions** tab, enable at minimum:
- `files.content.write` — required to upload
- `files.metadata.read` — useful for the script to query existing files

Click **Submit** at the bottom of the permissions page. This may take
30 seconds to propagate.

### 3. Note App key and App secret

Back on the **Settings** tab, copy:
- **App key** — short alphanumeric string
- **App secret** — click "Show" then copy

### 4. Generate a refresh token

Visit this URL in a browser (replace `APP_KEY` with your actual app key):

```
https://www.dropbox.com/oauth2/authorize?client_id=APP_KEY&response_type=code&token_access_type=offline
```

The `token_access_type=offline` parameter is what makes Dropbox issue a
refresh token rather than just a short-lived access token.

Authorize the app, then Dropbox shows you an authorization code. Copy it.

Exchange the code for a refresh token by running this curl command in a
terminal (replace `THE_CODE`, `APP_KEY`, `APP_SECRET`):

```bash
curl -X POST https://api.dropbox.com/oauth2/token \
  -d grant_type=authorization_code \
  -d code=THE_CODE \
  -u APP_KEY:APP_SECRET
```

Response will look like:

```json
{
  "access_token": "sl....",
  "token_type": "bearer",
  "expires_in": 14400,
  "refresh_token": "....",
  "scope": "files.content.write files.metadata.read",
  "uid": "...",
  "account_id": "..."
}
```

You want the **`refresh_token`** value (not the access_token — that one
expires in 4 hours; the refresh token is long-lived).

### 5. Add three GitHub secrets

In the jubilant-bassoon repo, go to
**Settings → Secrets and variables → Actions → New repository secret**
and add three secrets:

| Secret name | Value |
|---|---|
| `DROPBOX_REFRESH_TOKEN` | the `refresh_token` from step 4 |
| `DROPBOX_APP_KEY` | the App key from step 3 |
| `DROPBOX_APP_SECRET` | the App secret from step 3 |

The old `DROPBOX_TOKEN` secret can be deleted (or left in place as a
fallback — the script tries refresh-token flow first and only falls back
to `DROPBOX_TOKEN` if the three refresh-flow secrets aren't all present).

### 6. Optional: pick a target folder

By default the script uploads to `/FIELD/patents/` in your Dropbox.
To change this, set a **repository variable** (not secret — variables
are non-sensitive and visible in logs):

- **Settings → Secrets and variables → Actions → Variables tab → New**
- Name: `DROPBOX_PATENT_PATH`
- Value: e.g. `/jubilant-bassoon/patents` or `/work/patents`

If you chose "App folder" type in step 1, the path is relative to
`/Apps/<your-app-name>/` regardless of what you put here.

## Verifying the setup

Trigger the workflow manually:
- GitHub Actions tab → "Patent full-text fetch" → Run workflow → enter
  a patent number like `10846193` → Run.

Check the `_dropbox.log` file in the resulting commit at
`outbox/patents/_dropbox.log`. Success looks like:

```
Exchanging refresh token for access token...
  got access token (expires in 14400s)
Auth source: refresh-token-flow
Uploading 2 files to Dropbox /FIELD/patents/
  ✓ Patent -- US10846193 -- Dynatrace -- 2020-11-24.txt → /FIELD/patents/Patent -- ... (21188 bytes)
  ✓ Patent -- US10846193 -- Dynatrace -- 2020-11-24 (claim comparison).md → /FIELD/patents/Patent -- ... (14981 bytes)

All 2 files uploaded to Dropbox /FIELD/patents/
```

## Troubleshooting

**"no Dropbox credentials present"** — all four env vars are empty.
Either set the three refresh-flow secrets or set `DROPBOX_TOKEN`.

**"token exchange HTTP 400"** — usually means the refresh token was
revoked, the app key/secret pair don't match, or the refresh token
belongs to a different app. Re-run step 4 to mint a fresh refresh token.

**"HTTP 401 expired_access_token"** — only happens in the legacy
`DROPBOX_TOKEN` fallback path (refresh flow handles this automatically).
Switch to refresh-token flow per steps 1-5 above.

**"HTTP 409 path/conflict"** — file exists with the same path and a
different revision. Should not happen since we use `mode=overwrite`,
but if it does, deleting the conflicting file in Dropbox unblocks it.

**Files land in `/Apps/<app-name>/` instead of `/FIELD/patents/`** —
you chose "App folder" type in step 1. Either accept this layout
(uploads will work, just at a different path) or create a new app
with "Full Dropbox" type.
