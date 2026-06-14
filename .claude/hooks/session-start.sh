#!/bin/bash
# FIELD SessionStart hook — installs deps so smoke/lint/tests can run.
# Web-only: skips locally so it doesn't interfere with existing dev setups.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

echo "→ npm install"
npm install --no-audit --no-fund --silent

echo "→ scripts/setup.sh (core.hooksPath = scripts)"
bash scripts/setup.sh

echo "→ HANDOFF.md (current state)"
if [ -f HANDOFF.md ]; then
  sed -n '1,10p' HANDOFF.md
fi

echo "→ smoke.js (Layer 0 structural)"
node smoke.js index.html | tail -3 || true

echo "✅ SessionStart hook complete"
