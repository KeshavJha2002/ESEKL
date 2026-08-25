#!/usr/bin/env python3
"""
Deterministic RepoEKU-To-Domain Coverage Generator
Generates eku_store/repo_ekus/coverage.md reporting layering progress and falsification audits across all 20 Domain EKUs.
"""

import json
import glob
import os

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def audit_note_quality(eku):
    note = (eku.get("counterexampleAuditNote") or "").strip()
    issues = []
    if len(note) < 80:
        issues.append("too_terse")
    if not note.startswith("Audited across"):
        issues.append("missing_standard_prefix")
    if eku.get("alternativeMechanismRepoEkus") and "alternative" not in note.lower():
        issues.append("missing_alternative_language")
    if eku.get("notApplicableRepoEkus") and "not applicable" not in note.lower() and "not_applicable" not in note.lower() and "lacks" not in note.lower():
        issues.append("missing_not_applicable_language")
    if eku.get("counterexampleRepoEkus") and "counterexample" not in note.lower():
        issues.append("missing_counterexample_language")
    return issues

def build_coverage_report_content():
    ekus_data = load_json("eku_middleware/eku_store/synthesized_queue_ekus.json")
    domain_ekus = ekus_data.get("ekus", [])

    repo_ekus = []
    for f in sorted(glob.glob("eku_middleware/eku_store/repo_ekus/*.json")):
        repo_ekus.extend(load_json(f))

    repo_eku_ids = {r["id"]: r for r in repo_ekus}

    lines = [
        "# 📊 ESEKL RepoEKU-to-Domain Layering & Falsification Coverage Report",
        "",
        "**Generated Date**: 2026-08-23  ",
        f"**Domain EKUs Audited**: {len(domain_ekus)}  ",
        f"**RepoEKUs Active**: {len(repo_ekus)} across {len(glob.glob('eku_middleware/eku_store/repo_ekus/*.json'))} repositories  ",
        "",
        "---",
        "",
        "## 1. Domain EKU Layering & Falsification Matrix",
        "",
        "| EKU ID | Title | Layering Status | Supported RepoEKUs | Alt Mechanisms | Counterexamples | Not Applicable | Falsification Audit |",
        "|---|---|---|---|---|---|---|---|"
    ]

    status_counts = {
        "LAYERED": 0,
        "PARTIALLY_LAYERED": 0,
        "RAW_EVIDENCE_ONLY": 0
    }

    falsification_counts = {
        "AUDITED": 0,
        "PENDING_AUDIT": 0
    }
    quality_rows = []

    for eku in domain_ekus:
        eid = eku["id"]
        title = eku["title"]
        sup = eku.get("supportedByRepoEkus", [])
        alt = eku.get("alternativeMechanismRepoEkus", [])
        ce = eku.get("counterexampleRepoEkus", [])
        na = eku.get("notApplicableRepoEkus", [])

        has_keywords = bool(eku.get("commonKeywordGroups") or eku.get("mechanismFamilies"))

        # Classification
        if len(sup) >= 2 and has_keywords:
            status = "LAYERED"
        elif len(sup) >= 1 or len(alt) >= 1 or has_keywords:
            status = "PARTIALLY_LAYERED"
        else:
            status = "RAW_EVIDENCE_ONLY"

        status_counts[status] = status_counts.get(status, 0) + 1

        sup_str = f"`{len(sup)}` ({', '.join(sup)})" if sup else "`0`"
        alt_str = f"`{len(alt)}` ({', '.join(alt)})" if alt else "`0`"
        ce_str = f"`{len(ce)}` ({', '.join(ce)})" if ce else "`0`"
        na_str = f"`{len(na)}` ({', '.join(na)})" if na else "`0`"

        has_audit_note = bool(eku.get("counterexampleAuditNote") or len(ce) > 0 or len(na) > 0)
        falsification_status = "✅ AUDITED" if has_audit_note else "⚠️ NEEDS_AUDIT"

        if has_audit_note:
            falsification_counts["AUDITED"] += 1
        else:
            falsification_counts["PENDING_AUDIT"] += 1

        q_issues = audit_note_quality(eku)
        quality_status = "PASS" if not q_issues else "REVIEW"
        quality_rows.append((eid, quality_status, ", ".join(q_issues) if q_issues else "specific_repo_classification_language_present"))

        lines.append(f"| `{eid}` | {title} | **`{status}`** | {sup_str} | {alt_str} | {ce_str} | {na_str} | **`{falsification_status}`** |")

    lines.extend([
        "",
        "---",
        "",
        "## 2. Summary & Layering Progress",
        "",
        f"- **Fully Layered (Multi-Repo Grounded)**: **{status_counts.get('LAYERED', 0)} / {len(domain_ekus)}** ({(status_counts.get('LAYERED', 0)/len(domain_ekus))*100:.1f}%)",
        f"- **Partially Layered (Pilot Grounded)**: **{status_counts.get('PARTIALLY_LAYERED', 0)} / {len(domain_ekus)}** ({(status_counts.get('PARTIALLY_LAYERED', 0)/len(domain_ekus))*100:.1f}%)",
        f"- **Raw Evidence Only (Pending RepoEKU Authoring)**: **{status_counts.get('RAW_EVIDENCE_ONLY', 0)} / {len(domain_ekus)}** ({(status_counts.get('RAW_EVIDENCE_ONLY', 0)/len(domain_ekus))*100:.1f}%)",
        f"- **Falsification & Exemption Audited**: **{falsification_counts.get('AUDITED', 0)} / {len(domain_ekus)}** ({(falsification_counts.get('AUDITED', 0)/len(domain_ekus))*100:.1f}%)",
        "",
        "---",
        "",
        "## 3. Falsification Audit Note Quality",
        "",
        "| EKU ID | Quality Status | Diagnostic |",
        "|---|---|---|"
    ])

    for eid, quality_status, diagnostic in quality_rows:
        lines.append(f"| `{eid}` | **`{quality_status}`** | {diagnostic} |")

    lines.extend([
        "",
        "---",
        "",
        "## 4. High-Priority Domain EKUs For Next Ingestion Batch",
        "",
        "1. **`EKU-QUEUE-003` / `EKU-QUEUE-016`** (Storage-Time Lease Recovery & Multi-Phase Safety Margin)",
        "2. **`EKU-QUEUE-006` / `EKU-QUEUE-018`** (Poison Payload Isolation from Recurring Cron Schedules)",
        "3. **`EKU-QUEUE-019`** (Bounded Admission Control & Storage Stall Fast-Failure)",
        "4. **`EKU-QUEUE-020`** (Decoupled Worker-Drain and Broker-Socket Shutdown Contracts)"
    ])

    return "\n".join(lines) + "\n"

def generate_coverage_report():
    report_content = build_coverage_report_content()
    out_path = "eku_middleware/eku_store/repo_ekus/coverage.md"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(report_content)
    print(f"✅ Generated {out_path}.")

if __name__ == "__main__":
    generate_coverage_report()
