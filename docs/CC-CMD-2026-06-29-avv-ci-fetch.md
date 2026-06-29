# CC-CMD — AVV Results via CI Log Fetch

**Date:** 2026-06-29
**Scope:** Get actual MLB adapter proof results from GitHub Actions CI logs
**Why:** *.workers.dev:443 blocked by CC egress proxy. Playwright cannot run
         against live URL from CC. GitHub Actions runners are not behind this
         proxy. CI is the only valid execution path.
**Target time:** 20 min
**Rule 87:** Self-completing. No manual steps required.

---

## ENVIRONMENT CONSTRAINT (do not retry or route around)

The remote execution environment's egress proxy blocks
`jubilant-bassoon.jeffunglesbee.workers.dev:443`.
Playwright via Chromium respects HTTPS_PROXY and hits the same block.
Do not attempt localhost workarounds. Do not attempt proxy bypass.
GitHub API (api.github.com) is reachable. That is the only path needed.

---

## DONE CONDITION

A file `outbox/avv-ci-results-2026-06-29.md` exists on main containing:
- Pass/fail per AVV-PW-001 through 005
- All console.log output showing actual card text, chip names, normalizedObjects
- CI run URL for reference

---

## STEP 1: Check if adapter-visible-value.yml already ran (it was triggered at 1b83a8f)

```python
import requests, json

REPO = "jeffunglesbee-create/jubilant-bassoon"
PAT  = "FIELD_PAT_FROM_MEMORY"
H    = {"Authorization": f"token {PAT}"}

runs = requests.get(
    f"https://api.github.com/repos/{REPO}/actions/workflows/adapter-visible-value.yml/runs",
    headers=H, params={"per_page": 3}
).json()

for r in runs.get("workflow_runs", []):
    print(r["id"], r["status"], r["conclusion"], r["head_sha"][:8], r["created_at"])
```

**If most recent run is `completed`:** skip to Step 3.
**If `in_progress` or `queued`:** go to Step 2 (poll).
**If no recent run:** trigger one (see Step 2b), then poll.

---

## STEP 2: Poll until complete (max 15 min, 20s interval)

```python
import requests, time

REPO = "jeffunglesbee-create/jubilant-bassoon"
PAT  = "FIELD_PAT_FROM_MEMORY"
H    = {"Authorization": f"token {PAT}"}

# Get most recent run ID
runs = requests.get(
    f"https://api.github.com/repos/{REPO}/actions/workflows/adapter-visible-value.yml/runs",
    headers=H, params={"per_page": 1}
).json()
run_id = runs["workflow_runs"][0]["id"]
print(f"Watching run {run_id}")

for i in range(45):  # 45 * 20s = 15 min max
    r = requests.get(
        f"https://api.github.com/repos/{REPO}/actions/runs/{run_id}",
        headers=H
    ).json()
    status = r["status"]
    concl  = r.get("conclusion", "—")
    print(f"  [{i*20}s] {status} / {concl}")
    if status == "completed":
        print(f"Done: {concl}")
        break
    time.sleep(20)
```

## STEP 2b: Trigger if no recent run

```python
resp = requests.post(
    f"https://api.github.com/repos/{REPO}/actions/workflows/adapter-visible-value.yml/dispatches",
    headers=H,
    json={"ref": "main"}
)
print(resp.status_code)  # 204 = queued
time.sleep(10)
# Then run Step 2 poll loop
```

---

## STEP 3: Fetch and parse CI run logs

```python
import requests, zipfile, io, re

REPO = "jeffunglesbee-create/jubilant-bassoon"
PAT  = "FIELD_PAT_FROM_MEMORY"
H    = {"Authorization": f"token {PAT}"}

# Get run ID
runs = requests.get(
    f"https://api.github.com/repos/{REPO}/actions/workflows/adapter-visible-value.yml/runs",
    headers=H, params={"per_page": 1}
).json()
run = runs["workflow_runs"][0]
run_id  = run["id"]
run_url = run["html_url"]
concl   = run["conclusion"]
print(f"Run {run_id}: {concl}")
print(f"URL: {run_url}")

# Download log zip (GitHub redirects — follow)
log_resp = requests.get(
    f"https://api.github.com/repos/{REPO}/actions/runs/{run_id}/logs",
    headers=H, allow_redirects=True
)
print(f"Log download: {log_resp.status_code}, {len(log_resp.content)} bytes")

# Parse zip
results = []
with zipfile.ZipFile(io.BytesIO(log_resp.content)) as zf:
    for name in zf.namelist():
        if "playwright" in name.lower() or "adapter" in name.lower() or "avv" in name.lower():
            content = zf.read(name).decode("utf-8", errors="replace")
            results.append(f"\n=== {name} ===\n{content}")
    
    # Also grab any job log that mentions AVV
    for name in zf.namelist():
        content = zf.read(name).decode("utf-8", errors="replace")
        if "AVV-PW" in content or "console.log" in content or "passed" in content or "failed" in content:
            if name not in [r.split("\n")[1].replace("=== ","").replace(" ===","") for r in results]:
                results.append(f"\n=== {name} ===\n{content}")

output = "\n".join(results)
print(output[:8000])  # Print first 8000 chars

# Save full output
with open("/tmp/avv-ci-log.txt", "w") as f:
    f.write(output)
print(f"\nFull log saved to /tmp/avv-ci-log.txt ({len(output)} chars)")
```

---

## STEP 4: Extract the key lines

```python
with open("/tmp/avv-ci-log.txt") as f:
    log = f.read()

# Find all AVV result lines
print("=== PASS/FAIL ===")
for line in log.split("\n"):
    if any(x in line for x in ["✓", "✗", "passed", "failed", "AVV-PW-00", "Error:"]):
        print(line)

print("\n=== CONSOLE.LOG OUTPUT ===")
for line in log.split("\n"):
    if "[AVV-PW" in line:
        print(line)
```

---

## STEP 5: Write results to outbox

```python
import subprocess
from datetime import datetime

with open("/tmp/avv-ci-log.txt") as f:
    raw = f.read()

# Extract key sections
passfail = [l for l in raw.split("\n")
            if any(x in l for x in ["✓","✗","passed","failed","AVV-PW-00","Error:"])]
consolelog = [l for l in raw.split("\n") if "[AVV-PW" in l]

doc = f"""# AVV CI Results — 2026-06-29

**Run:** {run_url}
**Conclusion:** {concl}

## Pass/Fail

{chr(10).join(passfail[:50])}

## Console.log Output (actual MLB values)

{chr(10).join(consolelog)}

## Full Log

Saved to CI artifacts. Run URL above.
"""

# Write to outbox
with open("outbox/avv-ci-results-2026-06-29.md", "w") as f:
    f.write(doc)

print(doc)
```

Then commit:
```bash
git add outbox/avv-ci-results-2026-06-29.md
git commit -m "docs(outbox): AVV CI results 2026-06-29 — actual MLB adapter proof output [skip ci]"
git push origin main
# If push fails after 2 attempts: stop, report current state, do not retry
```

---

## OUTBOX MANIFEST

| Item | Owner |
|------|-------|
| Check/trigger CI run | CC Step 1–2b |
| Poll to completion | CC Step 2 |
| Download + parse log zip | CC Step 3 |
| Extract AVV pass/fail + console.log | CC Step 4 |
| Write outbox/avv-ci-results-2026-06-29.md | CC Step 5 |
| Commit [skip ci] + push (2 attempts max) | CC Step 5 |

---

## WHAT SUCCESS LOOKS LIKE

outbox/avv-ci-results-2026-06-29.md contains lines like:
```
✓ AVV-PW-001 — ok fixture: score line renders on MLB game card
[AVV-PW-001] First card text: NYY 3 · BAL 2 · Top 5 · 1 out
[AVV-PW-002] Broadcast chips found: [ 'ESPN' ]
[AVV-PW-003] normalizedObjects: [{"home":"NYY","away":"BAL","homeScore":3,...}]
5 passed
```

If CI run failed or console.log lines are missing: report that verbatim. Do not invent results.

---

**Session: 2026-06-29 · AVV CI Fetch · 20 min target**
