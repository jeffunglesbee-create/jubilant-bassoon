#!/bin/bash
# FIELD SessionStart hook — runs automatically at the start of every Claude Code session.
# Installs dependencies, activates pre-commit hook, and prints project state.
# Web-only: skips when not running in Claude Code cloud environment.

if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  echo "⏭ Skipping SessionStart hook (local session)"
  exit 0
fi

echo "🔧 FIELD SessionStart hook running..."

# Install dependencies (eslint, playwright)
echo "📦 npm install..."
npm install --silent 2>&1 | tail -3

# Activate pre-commit hook (smoke + units + lint gate)
if [ -f scripts/setup.sh ]; then
  bash scripts/setup.sh
fi

# Print HANDOFF.md state
echo ""
echo "📋 HANDOFF.md state:"
head -12 HANDOFF.md 2>/dev/null || echo "  (HANDOFF.md not found)"

# Run smoke and print count
echo ""
echo "🔍 Smoke check:"
SMOKE_OUT=$(node smoke.js index.html 2>&1 | tail -1)
echo "  $SMOKE_OUT"

echo ""
echo "✅ SessionStart hook complete"
