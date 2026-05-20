#!/bin/sh
# FIELD repo setup — run once after cloning, or use: npm install
#
# Sets core.hooksPath to scripts/ so git reads the pre-commit hook
# directly from the committed scripts/pre-commit file.
#
# Benefit over copying: future updates to scripts/pre-commit are
# automatically active — no need to re-run this script.

git config core.hooksPath scripts
echo "✅ FIELD hooks configured (core.hooksPath = scripts)"
echo "   Every commit will run field_smoke.js automatically."
echo "   To bypass in emergencies only: git commit --no-verify"
