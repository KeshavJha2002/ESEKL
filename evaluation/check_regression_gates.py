#!/usr/bin/env python3
"""
ESEKL Benchmark Regression Gate Checker
Enforces declarative gating contracts and schema conformance from evaluation/regression_gates.json.

How to add a future gate:
1. Open evaluation/regression_gates.json.
2. Add a new object containing:
   - "gateId": e.g. "GATE-<NAME>-001"
   - "title": Descriptive title
   - "runId": Run ID folder in evaluation/runs/
   - "eseklMinScore": Minimum ESEKL condition overall score (float)
   - "requiredRecalledKeys": Minimum number of recalled hidden keys (int)
   - "totalKeys": Total number of hidden keys in the rubric (int)
   - "minScoreDelta": Minimum advantage over baselines (float, optional)
   - "requiredTools": List of tool names that must appear in esekl_mcp.jsonl
   - "requiredArtifacts": List of relative paths (e.g. "preregistration.md", "scorecards/esekl_mcp_scorecard.json")
"""

import json
import os
import sys

GATES_FILE = "evaluation/regression_gates.json"

REQUIRED_GATE_FIELDS = [
    "gateId", "title", "runId", "eseklMinScore",
    "requiredRecalledKeys", "totalKeys", "requiredTools", "requiredArtifacts"
]

def validate_gate_schema(gate):
    """Validates structural types and presence of required fields on a gate object."""
    errors = []
    gid = gate.get("gateId", "UNKNOWN_GATE")
    for req_f in REQUIRED_GATE_FIELDS:
        if req_f not in gate:
            errors.append(f"Gate {gid}: missing required field '{req_f}'")
    if "eseklMinScore" in gate and not isinstance(gate["eseklMinScore"], (int, float)):
        errors.append(f"Gate {gid}: 'eseklMinScore' must be numeric")
    if "requiredRecalledKeys" in gate and not isinstance(gate["requiredRecalledKeys"], int):
        errors.append(f"Gate {gid}: 'requiredRecalledKeys' must be an integer")
    if "totalKeys" in gate and not isinstance(gate["totalKeys"], int):
        errors.append(f"Gate {gid}: 'totalKeys' must be an integer")
    if "requiredTools" in gate and not isinstance(gate["requiredTools"], list):
        errors.append(f"Gate {gid}: 'requiredTools' must be a list of strings")
    if "requiredArtifacts" in gate and not isinstance(gate["requiredArtifacts"], list):
        errors.append(f"Gate {gid}: 'requiredArtifacts' must be a list of strings")
    return errors

def load_gates(path=GATES_FILE):
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def check_gate(gate):
    schema_errs = validate_gate_schema(gate)
    if schema_errs:
        return schema_errs

    errors = []
    gid = gate["gateId"]
    run_id = gate["runId"]

    r_dir = os.path.join("evaluation", "runs", run_id)
    if not os.path.exists(r_dir):
        return [f"Gate {gid}: run directory '{r_dir}' not found"]

    # 1. Check scorecard
    sc_path = os.path.join(r_dir, "scorecards", "esekl_mcp_scorecard.json")
    if not os.path.exists(sc_path):
        return [f"Gate {gid}: ESEKL scorecard '{sc_path}' not found"]

    with open(sc_path, "r", encoding="utf-8") as f:
        sc = json.load(f)

    score = sc.get("overallScore", 0.0)
    min_score = gate["eseklMinScore"]
    if score < min_score:
        errors.append(f"Gate {gid}: ESEKL score {score:.2f} < threshold {min_score:.2f}")

    recalled = sc.get("recalledKeys")
    recalled_count = len(recalled) if isinstance(recalled, list) else int(recalled or 0)
    req_keys = gate["requiredRecalledKeys"]
    total_keys = gate["totalKeys"]
    if recalled_count < req_keys:
        errors.append(f"Gate {gid}: ESEKL recalled keys {recalled_count}/{total_keys} < required {req_keys}/{total_keys}")

    # 2. Check Tool Logs
    log_path = os.path.join(r_dir, "tool_logs", "esekl_mcp.jsonl")
    if os.path.exists(log_path):
        called_tools = set()
        with open(log_path, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    entry = json.loads(line)
                    tname = entry.get("toolName")
                    if not tname:
                        req = entry.get("request", {})
                        params = req.get("params", {})
                        tname = params.get("name")
                    if tname:
                        called_tools.add(tname)
                except Exception:
                    pass
        for req_tool in gate.get("requiredTools", []):
            if req_tool not in called_tools:
                errors.append(f"Gate {gid}: Tool log '{log_path}' did not record required layered retrieval call '{req_tool}'")

    # 3. Check Required Artifacts
    for req_art in gate.get("requiredArtifacts", []):
        art_full_path = os.path.join(r_dir, req_art)
        if not os.path.exists(art_full_path):
            errors.append(f"Gate {gid}: Missing required artifact '{req_art}' ({art_full_path})")

    return errors

def test_negative_gate_fixtures():
    """Validates that malformed, failing, and unachievable gate definitions are caught deterministically."""
    print("▶ Running Negative Gate Fixtures Suite...")
    neg_cases = [
        # Case 1: Missing runId
        ({"gateId": "NEG-GATE-001", "title": "Missing RunId", "eseklMinScore": 8.0, "requiredRecalledKeys": 4, "totalKeys": 4, "requiredTools": [], "requiredArtifacts": []}, "missing required field 'runId'"),
        # Case 2: Nonexistent run directory
        ({"gateId": "NEG-GATE-002", "title": "Nonexistent Run", "runId": "nonexistent-run-xyz", "eseklMinScore": 8.0, "requiredRecalledKeys": 4, "totalKeys": 4, "requiredTools": [], "requiredArtifacts": []}, "not found"),
    ]

    for gate_obj, expected_substr in neg_cases:
        errs = check_gate(gate_obj)
        assert len(errs) > 0, f"Expected errors for negative gate fixture {gate_obj['gateId']}, but got none"
        assert any(expected_substr in e for e in errs), f"Expected substring '{expected_substr}' in errors for {gate_obj['gateId']}, got: {errs}"

    print("  ✅ All negative gate fixtures rejected as expected.")

def run_all_gates(gates_path=GATES_FILE):
    print("=" * 60)
    print("🛡️ ESEKL BENCHMARK REGRESSION GATES AUDITOR")
    print("=" * 60)
    gates = load_gates(gates_path)
    if not gates:
        print(f"ℹ️ No artifact-backed regression gates configured in {gates_path}.")
        print("   Historical run artifacts were compacted into benchmark/message_queue_evaluation_summary.md.")
        return True

    # Check duplicate gate IDs
    seen_ids = set()
    for g in gates:
        gid = g.get("gateId")
        if gid in seen_ids:
            print(f"❌ Duplicate gate ID '{gid}' detected in {gates_path}")
            return False
        seen_ids.add(gid)

    all_errors = []
    for g in gates:
        gid = g.get("gateId", "UNKNOWN")
        title = g.get("title", "Untitled Gate")
        rid = g.get("runId", "unknown-run")
        print(f"▶ Auditing {gid}: {title} ({rid})...")
        errs = check_gate(g)
        if errs:
            for e in errs:
                print(f"  ❌ {e}")
            all_errors.extend(errs)
        else:
            print(f"  ✅ Gate {gid} PASSED (Score, keys & required artifacts satisfied)")

    test_negative_gate_fixtures()

    if all_errors:
        print(f"\n❌ REGRESSION GATE FAILURE: {len(all_errors)} issues detected.")
        return False
    else:
        print(f"\n🎉 ALL {len(gates)} BENCHMARK REGRESSION GATES PASSED PERFECTLY!\n")
        return True

if __name__ == "__main__":
    success = run_all_gates()
    sys.exit(0 if success else 1)
