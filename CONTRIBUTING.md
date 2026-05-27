# FIELD — PR Workflow

## When to use a PR (not direct push to main)

Direct push to `main` is fine for:
- Daily score/game updates
- Small copy fixes
- `[skip ci]` housekeeping commits

Open a PR for:
- Any new feature (new analytics, new section, new sport)  
- Any architectural change (touch events, CSS structure, relay routes)
- Any change to smoke.js assertions
- Anything that took more than 30 minutes to build

## Opening a PR

```bash
# 1. Create a branch named after the feature
git checkout -b feature/nhl-wave2-pdo

# 2. Make changes, commit normally
git commit -m "NHL-C1: PDO luck indicator — W2 item 1"

# 3. Push the branch (not main)
git push https://ghp_...@github.com/jeffunglesbee-create/jubilant-bassoon.git feature/nhl-wave2-pdo

# 4. GitHub shows "Compare & pull request" banner → click it → Open pull request
# CodeRabbit reviews within ~1 minute, flags any silent failures or CSS issues
# Merge when CodeRabbit is happy (or consciously override specific findings)
```

## CodeRabbit setup

Install the GitHub App once at:
https://github.com/apps/coderabbit-ai

Then it auto-reviews every PR. No terminal, no extra config.
The `.coderabbit.yaml` in this repo tells it to focus on FIELD-specific failure modes:
- Silent analytics failures (_homeAbbr not set, wrong key format)
- Samsung touch event correctness  
- CSS duplicates and missing variables
- Smoke assertion completeness

## FIELD Health Panel

On the live app, long-press the ⚙ button for 1.5 seconds to open the health dashboard.
Shows real-time status of every major feature. Screenshot and share to Claude for diagnosis.
Also accessible at `?debug=1` URL param.
