#!/bin/sh
# FIELD repo setup — run once after cloning
# Installs git hooks so smoke test gates every commit automatically

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK_SRC="$REPO_ROOT/scripts/pre-commit"
HOOK_DEST="$REPO_ROOT/.git/hooks/pre-commit"

cp "$HOOK_SRC" "$HOOK_DEST"
chmod +x "$HOOK_DEST"
echo "✅ FIELD pre-commit hook installed"
echo "   Every commit will run field_smoke.js automatically."
echo "   Smoke failures block the commit."
echo "   Emergency bypass: git commit --no-verify (use rarely)"
