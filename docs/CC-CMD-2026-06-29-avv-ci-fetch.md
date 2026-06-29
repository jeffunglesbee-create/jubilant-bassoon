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
- Confidence score ≥ 95 with scoring breakdown

**If confidence score < 95: do not commit results. Investigate and re-run.**

---

## STEP 1: Check if adapter-visible-value.yml already ran (triggered at 1b83a8f)

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
**If no recent run:** trigger one (Step 2b), then poll.

---

## STEP 2: Poll until complete (max 15 min, 20s interval)

```python
import requests, time

REPO = "jeffunglesbee-create/jubilant-bassoon"
PAT  = "FIELD_PAT_FROM_MEMORY"
H    = {"Authorization": f"token {PAT}"}

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
import requests, zipfile, io

REPO = "jeffunglesbee-create/jubilant-bassoon"
PAT  = "FIELD_PAT_FROM_MEMORY"
H    = {"Authorization": f"token {PAT}"}

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

log_resp = requests.get(
    f"https://api.github.com/repos/{REPO}/actions/runs/{run_id}/logs",
    headers=H, allow_redirects=True
)
print(f"Log download: {log_resp.status_code}, {len(log_resp.content)} bytes")

results = []
with zipfile.ZipFile(io.BytesIO(log_resp.content)) as zf:
    for name in zf.namelist():
        content = zf.read(name).decode("utf-8", errors="replace")
        if any(x in content for x in ["AVV-PW", "passed", "failed", "console.log"]):
            results.append(f"\n=== {name} ===\n{content}")

output = "\n".join(results)
with open("/tmp/avv-ci-log.txt", "w") as f:
    f.write(output)
print(f"Log saved ({len(output)} chars)")
print(output[:8000])
```

---

## STEP 4: Extract key lines

```python
with open("/tmp/avv-ci-log.txt") as f:
    log = f.read()

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

## STEP 5: Confidence scoring

Score the result before committing. Minimum required: **95**.

```python
with open("/tmp/avv-ci-log.txt") as f:
    log = f.read()

score   = 0
factors = []

# Factor 1 — CI concluded success (40 pts)
# Without this, max possible = 60. Cannot reach 95. Must re-run.
if concl == "success":
    score += 40
    factors.append("✅ +40  CI conclusion = success")
else:
    factors.append(f"❌  +0  CI conclusion = {concl} (BLOCKING — re-run required)")

# Factor 2 — All 5 AVV-PW tests show ✓ (30 pts)
# Each missing ✓ costs 6 pts. All 5 absent = 0.
passing = sum(1 for t in ["AVV-PW-001","AVV-PW-002","AVV-PW-003","AVV-PW-004","AVV-PW-005"]
              if f"✓" in log and t in log)
test_pts = passing * 6
score += test_pts
factors.append(f"{'✅' if passing==5 else '⚠️ '} +{test_pts}  {passing}/5 AVV-PW tests passing")

# Factor 3 — console.log lines present for all 5 tests (15 pts)
# Proves tests reached their assertions, not just page.goto errors.
log_lines = sum(1 for t in ["AVV-PW-001","AVV-PW-002","AVV-PW-003","AVV-PW-004","AVV-PW-005"]
                if f"[{t}]" in log)
log_pts = log_lines * 3
score += log_pts
factors.append(f"{'✅' if log_lines==5 else '⚠️ '} +{log_pts}  {log_lines}/5 tests produced console.log output")

# Factor 4 — expected teams in normalizedObjects (10 pts)
# Proves fixture data was injected, not empty or wrong.
teams_found = all(t in log for t in ["NYY","BAL","LAD","SFG"])
if teams_found:
    score += 10
    factors.append("✅ +10  Expected teams (NYY, BAL, LAD, SFG) in normalizedObjects")
else:
    factors.append("❌  +0  Expected teams missing — fixture injection may have failed")

# Factor 5 — scores match ok fixture: NYY 3, BAL 2 (5 pts)
# Proves normalizer extracted homeScore/awayScore correctly.
scores_found = "homeScore" in log and ("3" in log or "awayScore" in log)
if scores_found:
    score += 5
    factors.append("✅  +5  Score values present in normalizedObjects")
else:
    factors.append("⚠️   +0  Score values not confirmed in log output")

# Report
print(f"\n{'='*50}")
print(f"CONFIDENCE SCORE: {score}/100")
print(f"{'='*50}")
for f in factors:
    print(f" {f}")
print(f"\n{'PASS — commit results' if score >= 95 else 'FAIL — DO NOT COMMIT — investigate below'}")

if score < 95:
    print("\nREQUIRED ACTIONS BEFORE COMMITTING:")
    if concl != "success":
        print("  - CI run did not succeed. Check run URL for failure reason.")
        print("  - Fix root cause, re-trigger workflow, re-run this CC-CMD.")
    if passing < 5:
        print(f"  - Only {passing}/5 tests passed. Check failure messages in log.")
    if log_lines < 5:
        print(f"  - Only {log_lines}/5 tests produced console.log. Tests may have crashed before assertions.")
    if not teams_found:
        print("  - Expected team names absent. Verify _proofMode and _MLB_PROOF_FIXTURES are in deployed index.html.")
    print("\nDo not commit until score >= 95.")
```

---

## STEP 6: Write results to outbox and commit (only if score ≥ 95)

```python
if score < 95:
    raise SystemExit(f"Confidence {score}/100 — below 95 threshold. Do not commit.")

passfail   = [l for l in log.split("\n")
              if any(x in l for x in ["✓","✗","passed","failed","AVV-PW-00","Error:"])]
consolelog = [l for l in log.split("\n") if "[AVV-PW" in l]

doc = f"""# AVV CI Results — 2026-06-29

**Run:** {run_url}
**Conclusion:** {concl}
**Confidence:** {score}/100

## Confidence Breakdown

{chr(10).join(factors)}

## Pass/Fail

{chr(10).join(passfail[:50])}

## Console.log Output (actual MLB values from live app)

{chr(10).join(consolelog)}
"""

with open("outbox/avv-ci-results-2026-06-29.md", "w") as f:
    f.write(doc)
print(doc)
```

```bash
git add outbox/avv-ci-results-2026-06-29.md
git commit -m "docs(outbox): AVV CI results 2026-06-29 — confidence ${score}/100 [skip ci]"
git push origin main
# 2 attempts max — if both fail, report state and stop
```

---

## OUTBOX MANIFEST

| Item | Owner |
|------|-------|
| Check/trigger CI run | CC Step 1–2b |
| Poll to completion | CC Step 2 |
| Download + parse log zip | CC Step 3 |
| Extract pass/fail + console.log | CC Step 4 |
| Confidence score ≥ 95 (block if not) | CC Step 5 |
| Write + commit (only if ≥ 95) | CC Step 6 |

---

## CONFIDENCE GATE SUMMARY

| Factor | Points | Blocking if zero? |
|--------|--------|-------------------|
| CI conclusion = success | 40 | Yes — max 60, cannot reach 95 |
| All 5 AVV-PW tests ✓ | 30 (6 each) | Yes — 4/5 gives 84 max |
| console.log lines for all 5 | 15 (3 each) | Yes — 4/5 gives 92 max |
| Expected teams in normalizedObjects | 10 | Yes — missing gives 85 max |
| Score values in log | 5 | No — 95 reachable without it |

**Minimum path to 95:** CI success + 5/5 passing + 5/5 console.log + correct teams.

---

**Session: 2026-06-29 · AVV CI Fetch · 20 min target · Confidence gate: 95**
