#!/usr/bin/env python3
# FIELD — inject NFL drama profiles into src/legacy/field.js (NOT index.html).
# Adapted from Drive doc 1aPuvlvLNmv1libMqkUIRrQWXBpUSzLRC's Step 3: that spec
# targets index.html directly, written before this repo's field.js/
# sync-source.mjs pipeline existed (CLAUDE.md: field.js is the only correct
# edit target for JS; sync-source.mjs's divergence guard blocks direct
# index.html script-block edits). Injects into field.js, then invokes
# scripts/sync-source.mjs so index.html regenerates through the real pipeline.

import json, sys, re, subprocess
from pathlib import Path
from datetime import date

FIELD_JS = Path('src/legacy/field.js')
PROFILES_JSON = Path('team_drama_profiles_nfl.json')
START_MARKER = '//DRAMA_PROFILES_START'
END_MARKER = '//DRAMA_PROFILES_END'
OUTPUT_MIN = 32
OUTPUT_MAX = 78

if not FIELD_JS.exists():
    print("ERROR: src/legacy/field.js not found. Run from repo root.")
    sys.exit(1)
if not PROFILES_JSON.exists():
    print("ERROR: team_drama_profiles_nfl.json not found.")
    sys.exit(1)

with open(PROFILES_JSON) as f:
    drama_dict = json.load(f)

seasons_comment = f"// Generated {date.today().isoformat()} | Scale {OUTPUT_MIN}-{OUTPUT_MAX}"
js_block = f"""{START_MARKER}
{seasons_comment}
const NFL_DRAMA_PROFILES = {json.dumps(drama_dict, sort_keys=True, indent=2)};

function getMatchupDramaBaseline(home, away, sport) {{
  const profiles = sport === 'NFL' || sport === 'American Football' ? NFL_DRAMA_PROFILES : null;
  if (!profiles) return null;
  const h = profiles[home] ?? 50;
  const a = profiles[away] ?? 50;
  return Math.round((h + a) / 2 + Math.abs(h - a) * 0.10);
}}
{END_MARKER}"""

js = FIELD_JS.read_text(encoding='utf-8')
if START_MARKER not in js or END_MARKER not in js:
    print("ERROR: Markers not found in src/legacy/field.js. Add them first.")
    sys.exit(1)

pattern = re.escape(START_MARKER) + r'.*?' + re.escape(END_MARKER)
new_js, count = re.subn(pattern, js_block, js, flags=re.DOTALL)
if count == 0:
    print("ERROR: Substitution failed.")
    sys.exit(1)

FIELD_JS.write_text(new_js, encoding='utf-8')
print(f"✓ Injected {len(drama_dict)} team profiles into src/legacy/field.js")

result = subprocess.run(['node', '--check', str(FIELD_JS)], capture_output=True, text=True)
if result.returncode != 0:
    print("✗ Node syntax check FAILED. Reverting.")
    print(result.stderr[:500])
    FIELD_JS.write_text(js, encoding='utf-8')
    sys.exit(1)
print("✓ Node syntax check passed")

sync = subprocess.run(['node', 'scripts/sync-source.mjs'], capture_output=True, text=True)
print(sync.stdout)
if sync.returncode != 0:
    print("✗ sync-source.mjs FAILED. Reverting field.js.")
    print(sync.stderr[:1000])
    FIELD_JS.write_text(js, encoding='utf-8')
    sys.exit(1)
print("✓ index.html regenerated via sync-source.mjs")
