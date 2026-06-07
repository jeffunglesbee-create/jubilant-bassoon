#!/usr/bin/env python3
# apply_skim_fix.py — reads latest skim-probe output and patches .skim-strip CSS
#
# Called by skim-probe.yml after skim_probe.js runs.
# Reads the most recent outbox/skim-probe-*.json, extracts the recommended
# min-height, and patches .skim-strip in index.html.
#
# Outputs to stdout (captured by workflow):
#   MIN_HEIGHT=Xpx   (or MIN_HEIGHT=0 if no content today)
#   PATCHED=true|false

import json, os, re, sys, glob

OUTBOX = os.path.join(os.path.dirname(__file__), 'outbox')
INDEX  = os.path.join(os.path.dirname(__file__), 'index.html')

# Find most recent skim-probe output
files = sorted(glob.glob(os.path.join(OUTBOX, 'skim-probe-*.json')))
if not files:
    print('MIN_HEIGHT=0')
    print('PATCHED=false')
    print('[apply_skim_fix] No skim-probe output found', file=sys.stderr)
    sys.exit(0)

probe_file = files[-1]
print(f'[apply_skim_fix] Reading {probe_file}', file=sys.stderr)

with open(probe_file) as f:
    data = json.load(f)

rec = data.get('recommendation')
if not rec or not rec.get('minHeightPx'):
    print('MIN_HEIGHT=0')
    print('PATCHED=false')
    print('[apply_skim_fix] No recommendation — skim had no content today', file=sys.stderr)
    sys.exit(0)

min_h = rec['minHeightPx']
print(f'[apply_skim_fix] Recommended min-height: {min_h}px', file=sys.stderr)
print(f'[apply_skim_fix] CSS: {rec["cssRule"]}', file=sys.stderr)

# Read index.html
with open(INDEX) as f:
    content = f.read()

# Check if min-height already present on .skim-strip base rule
# Base rule pattern: .skim-strip{...} (no attribute selector, no space before {)
BASE_PATTERN = re.compile(r'(\.skim-strip\{)([^}]+)(\})')

match = BASE_PATTERN.search(content)
if not match:
    print('MIN_HEIGHT=0')
    print('PATCHED=false')
    print('[apply_skim_fix] ERROR: .skim-strip base rule not found in index.html', file=sys.stderr)
    sys.exit(1)

rule_body = match.group(2)

if 'min-height' in rule_body:
    print(f'[apply_skim_fix] min-height already present — no change needed', file=sys.stderr)
    print(f'MIN_HEIGHT={min_h}')
    print('PATCHED=false')
    sys.exit(0)

# Inject min-height + contain:layout into the base rule body
new_body = rule_body.rstrip(';') + f';min-height:{min_h}px;contain:layout'
new_rule = match.group(1) + new_body + match.group(3)
patched = content[:match.start()] + new_rule + content[match.end():]

with open(INDEX, 'w') as f:
    f.write(patched)

print(f'[apply_skim_fix] Patched .skim-strip with min-height:{min_h}px;contain:layout', file=sys.stderr)
print(f'MIN_HEIGHT={min_h}')
print('PATCHED=true')
