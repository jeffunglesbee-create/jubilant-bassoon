#!/usr/bin/env python3
"""
Patent claim comparison engine.

Reads an outbox/patents/US{number}.json produced by patent_fetch.py,
splits independent claims into elements, applies FIELD architectural
heuristics from .github/field-features.yml, and writes:

  outbox/patents/US{number}-compare.md  -- attorney-ready markdown table

Output is heuristic and intended as a STARTING POINT for the attorney
conversation, NOT a substitute for legal analysis. Every cell is flagged
with confidence level and the feature that triggered it.

Strongest non-infringement arguments are auto-detected and surfaced
at the top of the document.
"""

import json
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("Missing PyYAML. Install: pip install pyyaml")
    sys.exit(1)

OUTBOX = Path("outbox/patents")
FEATURES_PATH = Path(".github/field-features.yml")


def load_features():
    if not FEATURES_PATH.exists():
        print(f"No features at {FEATURES_PATH}; using empty rule set")
        return []
    return yaml.safe_load(FEATURES_PATH.read_text()).get("features", [])


def split_claim_into_elements(claim_text: str):
    """Split a claim into preamble + elements.

    Claims have a canonical structure:
      "<preamble>, comprising: <element1>; <element2>; ... <element_n>."
    or:
      "<preamble>, comprising the steps of: ..."

    We split on semicolons that aren't inside parens/quotes. The first
    chunk before "comprising" (or "comprising the steps of") is the preamble.
    """
    text = re.sub(r"\s+", " ", claim_text).strip()

    # Find the colon after "comprising" (or its variants)
    m = re.search(
        r"comprising(?:\s+the\s+steps\s+of)?(?:\s+the\s+method\s+of)?\s*:",
        text, re.IGNORECASE
    )
    if m:
        preamble = text[:m.end()].rstrip(":; ").strip()
        body = text[m.end():].strip()
    else:
        preamble = text
        body = ""

    # Split body on semicolons at paren-depth zero
    elements = []
    current = []
    depth = 0
    for ch in body:
        if ch == "(":
            depth += 1
            current.append(ch)
        elif ch == ")":
            depth -= 1
            current.append(ch)
        elif ch == ";" and depth == 0:
            chunk = "".join(current).strip()
            if chunk:
                elements.append(chunk)
            current = []
        else:
            current.append(ch)
    if current:
        chunk = "".join(current).strip().rstrip(".").strip()
        if chunk:
            elements.append(chunk)

    # Strip leading "and" from final elements
    elements = [re.sub(r"^and\s+", "", e, flags=re.IGNORECASE) for e in elements]
    return preamble, elements


def match_element(element_text: str, features: list):
    """Returns list of (feature, score) for matching features."""
    matches = []
    for feat in features:
        for pat in feat.get("claim_keyword_patterns", []):
            if re.search(pat, element_text, flags=re.IGNORECASE):
                matches.append(feat)
                break  # one match per feature is enough
    return matches


def assess_element(element_text: str, features: list):
    """Returns dict with assessment for one element."""
    matches = match_element(element_text, features)
    if not matches:
        return {
            "verdict": "REVIEW",
            "confidence": "LOW",
            "rationale": "No FIELD-feature rule matched; needs human review.",
            "features": [],
        }

    # Aggregate verdicts. If any HIGH-confidence NON_INFRINGEMENT or
    # ELEMENT_ABSENT exists, that wins (strongest non-infringement signal).
    priority = {
        "NON_INFRINGEMENT": 4,
        "ELEMENT_ABSENT": 3,
        "ELEMENT_DIFFERS": 2,
        "DIFFERENT_METRIC": 1,
        "MATCH": 0,
    }
    conf_score = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}

    sorted_matches = sorted(
        matches,
        key=lambda f: (priority.get(f.get("likely_argument", ""), -1),
                       conf_score.get(f.get("confidence", "LOW"), 0)),
        reverse=True,
    )
    best = sorted_matches[0]
    return {
        "verdict": best.get("likely_argument", "REVIEW"),
        "confidence": best.get("confidence", "LOW"),
        "rationale": best.get("description", "").strip(),
        "features": [f["id"] for f in sorted_matches],
    }


def is_independent_claim(claim: dict) -> bool:
    dep = claim.get("claim_dependent")
    if dep in (None, "", "null", "None"):
        return True
    return False


def render_markdown(patent: dict, features: list) -> str:
    pid = patent.get("patent_id", "?")
    title = patent.get("patent_title", "(no title)")
    date = patent.get("patent_date", "?")
    assignees = patent.get("assignees", [])
    assignee_orgs = ", ".join(
        a.get("assignee_organization", "") for a in assignees
    ).strip(" ,") or "(unknown)"

    claims = patent.get("claims", [])
    if not claims:
        return f"# US{pid}: no claims available\n\nRe-run patent_fetch.py.\n"

    # Sort by sequence numerically when possible
    def seq_key(c):
        try:
            return int(c.get("claim_sequence", "0"))
        except (TypeError, ValueError):
            return 0
    claims_sorted = sorted(claims, key=seq_key)

    independents = [c for c in claims_sorted if is_independent_claim(c)]

    lines = [
        f"# US{pid} -- FIELD comparison",
        "",
        f"**Title:** {title}",
        f"**Grant date:** {date}",
        f"**Assignee:** {assignee_orgs}",
        f"**Total claims:** {len(claims_sorted)}  ",
        f"**Independent claims:** {len(independents)} "
        f"({', '.join(c.get('claim_sequence', '?') for c in independents)})",
        "",
        "> **Auto-generated heuristic analysis. ATTORNEY REVIEW REQUIRED.**  ",
        "> Each row matches the claim element text against FIELD architectural  ",
        "> features in `.github/field-features.yml`. Verdicts are starting  ",
        "> points for the attorney conversation, not legal conclusions.",
        "",
    ]

    # Collect all element assessments for the top-of-doc summary
    all_assessments = []

    for ic in independents:
        seq = ic.get("claim_sequence", "?")
        text = ic.get("claim_text", "")
        preamble, elements = split_claim_into_elements(text)

        lines.append(f"## Claim {seq} (independent)")
        lines.append("")
        lines.append("| # | Claim element | FIELD verdict | Confidence | Rationale |")
        lines.append("|---|---|---|---|---|")

        preamble_assess = assess_element(preamble, features)
        lines.append(
            f"| {seq}.preamble | {_truncate(preamble, 200)} | "
            f"{preamble_assess['verdict']} | {preamble_assess['confidence']} | "
            f"{_truncate(preamble_assess['rationale'], 150)} |"
        )
        all_assessments.append({
            "claim": seq, "element": "preamble",
            "text": preamble, **preamble_assess,
        })

        for i, el in enumerate(elements, 1):
            assess = assess_element(el, features)
            label = f"{seq}.{chr(ord('a') + i - 1)}"  # 1.a, 1.b, ...
            lines.append(
                f"| {label} | {_truncate(el, 200)} | "
                f"{assess['verdict']} | {assess['confidence']} | "
                f"{_truncate(assess['rationale'], 150)} |"
            )
            all_assessments.append({
                "claim": seq, "element": label, "text": el, **assess,
            })

        lines.append("")

    # Strongest non-infringement arguments
    strong_args = [
        a for a in all_assessments
        if a["verdict"] in ("NON_INFRINGEMENT", "ELEMENT_ABSENT")
        and a["confidence"] == "HIGH"
    ]
    medium_args = [
        a for a in all_assessments
        if a["verdict"] in ("ELEMENT_DIFFERS", "DIFFERENT_METRIC")
        and a["confidence"] in ("HIGH", "MEDIUM")
    ]
    needs_review = [a for a in all_assessments if a["verdict"] == "REVIEW"]

    # Insert summary at the right place (after metadata block, before claim tables)
    summary_lines = []
    summary_lines.append("## Strongest non-infringement arguments (auto-detected)")
    summary_lines.append("")
    if strong_args:
        for a in strong_args:
            summary_lines.append(
                f"- **{a['element']}**: {_truncate(a['text'], 150)}  "
            )
            summary_lines.append(
                f"  -> {a['rationale']}"
            )
        summary_lines.append("")
    else:
        summary_lines.append("None auto-detected. Manual review required.")
        summary_lines.append("")

    if medium_args:
        summary_lines.append("## Likely differentiators (medium confidence)")
        summary_lines.append("")
        for a in medium_args:
            summary_lines.append(
                f"- **{a['element']}** ({a['verdict']}): {_truncate(a['text'], 150)}  "
            )
            summary_lines.append(f"  -> {a['rationale']}")
        summary_lines.append("")

    if needs_review:
        summary_lines.append(f"## Elements needing human review ({len(needs_review)})")
        summary_lines.append("")
        summary_lines.append(
            "Elements where no FIELD-feature rule matched. Add new rules to "
            "`.github/field-features.yml` if patterns emerge:"
        )
        summary_lines.append("")
        for a in needs_review[:10]:  # cap to 10 in summary
            summary_lines.append(f"- **{a['element']}**: {_truncate(a['text'], 150)}")
        if len(needs_review) > 10:
            summary_lines.append(f"- ... and {len(needs_review) - 10} more (see table below)")
        summary_lines.append("")

    summary_lines.append("## Attorney conversation prompts")
    summary_lines.append("")
    summary_lines.append(
        "1. Are the auto-detected NON_INFRINGEMENT elements present in EVERY "
        "independent claim, or only some? (Critical for full-claim avoidance.)"
    )
    summary_lines.append(
        "2. Could the patent holder argue claim construction broadening to "
        "capture FIELD's architecture? (e.g., 'monitoring node' read broadly.)"
    )
    summary_lines.append(
        "3. What dependent claims would survive even if the independent claims "
        "are avoided? (Independent != only relevant.)"
    )
    summary_lines.append(
        "4. Does the patent file history (prosecution) show the applicant "
        "explicitly disclaiming what FIELD does?"
    )
    summary_lines.append("")

    # Splice summary into the lines list (after the "ATTORNEY REVIEW" blockquote
    # but before the first "## Claim N (independent)" header).
    splice_idx = next(
        i for i, l in enumerate(lines) if l.startswith("## Claim ")
    )
    return "\n".join(lines[:splice_idx] + summary_lines + lines[splice_idx:]) + "\n"


def _truncate(s: str, n: int) -> str:
    s = s.replace("|", "\\|").replace("\n", " ")
    if len(s) <= n:
        return s
    return s[: n - 3] + "..."


def process_one(patent_id: str, features: list) -> bool:
    json_path = OUTBOX / f"US{patent_id}.json"
    md_path = OUTBOX / f"US{patent_id}-compare.md"
    if not json_path.exists():
        print(f"  {json_path}: not found, skipping")
        return False
    patent = json.loads(json_path.read_text())
    md = render_markdown(patent, features)
    if md_path.exists() and md_path.read_text() == md:
        print(f"  US{patent_id}: comparison unchanged")
        return False
    md_path.write_text(md)
    print(f"  US{patent_id}: wrote {md_path.name}")
    return True


def main():
    features = load_features()
    print(f"Loaded {len(features)} FIELD-feature rules")

    if len(sys.argv) >= 2:
        ids = [p.strip() for p in sys.argv[1].split(",") if p.strip()]
        ids = [re.sub(r"^US|B\d?$", "", p, flags=re.IGNORECASE).strip() for p in ids]
    else:
        # Process every US*.json in outbox
        ids = [
            re.match(r"US(\d+)\.json", p.name).group(1)
            for p in OUTBOX.glob("US*.json")
            if re.match(r"US\d+\.json", p.name)
        ]

    for pid in ids:
        print(f"\nProcessing US{pid}...")
        process_one(pid, features)


if __name__ == "__main__":
    main()
