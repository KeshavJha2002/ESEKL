#!/usr/bin/env python3
import os
import sys
import json
import hashlib
from datetime import datetime, timezone

def compute_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def classify_artifact_type(rel_path):
    if rel_path.startswith("prompts/"):
        return "PROMPT"
    if rel_path.startswith("raw_responses/"):
        return "RAW_RESPONSE"
    if rel_path.startswith("tool_logs/"):
        return "TOOL_LOG"
    if rel_path.startswith("scorecards/"):
        return "SCORECARD"
    if "telemetry" in rel_path:
        return "TELEMETRY"
    if "preregistration" in rel_path:
        return "PREREGISTRATION"
    if "gap_audit" in rel_path or "VALIDITY" in rel_path:
        return "AUDIT"
    return "DOCUMENTATION"

def build_manifest_for_run(run_dir):
    artifacts = []
    run_id = os.path.basename(os.path.abspath(run_dir))

    for root, _, files in os.walk(run_dir):
        for fname in sorted(files):
            if fname == "artifacts_manifest.json":
                continue
            full_path = os.path.join(root, fname)
            rel_path = os.path.relpath(full_path, run_dir)
            sha = compute_sha256(full_path)
            size = os.path.getsize(full_path)
            mtime = datetime.fromtimestamp(os.path.getmtime(full_path), tz=timezone.utc).isoformat()
            art_type = classify_artifact_type(rel_path)

            artifacts.append({
                "path": rel_path,
                "relativePath": rel_path,
                "type": art_type,
                "sha256": sha,
                "sizeBytes": size,
                "modifiedAt": mtime
            })

    manifest_data = {
        "runId": run_id,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "totalArtifacts": len(artifacts),
        "artifacts": artifacts
    }

    out_file = os.path.join(run_dir, "artifacts_manifest.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)

    print(f"✅ Generated manifest with {len(artifacts)} artifacts for {run_id}")
    return manifest_data

def main():
    if len(sys.argv) > 1:
        target_dir = sys.argv[1]
        build_manifest_for_run(target_dir)
    else:
        runs_root = os.path.join(os.path.dirname(__file__), "runs")
        if not os.path.isdir(runs_root):
            print(f"No evaluation runs directory found at {runs_root}; nothing to manifest.")
            return
        for run_name in sorted(os.listdir(runs_root)):
            run_path = os.path.join(runs_root, run_name)
            if os.path.isdir(run_path):
                build_manifest_for_run(run_path)

if __name__ == "__main__":
    main()
