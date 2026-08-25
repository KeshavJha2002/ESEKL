#!/usr/bin/env python3
"""
CLI runner for the Feynman-to-Galileo Gap Regression Benchmark.
Scores agent responses against the seven critical gap discoveries and checks pass/fail thresholds.
Emits full provenance metadata (responsePath, scoredAt, runId, promptVariant, scorerVersion).
"""

import argparse
import json
import os
import re
import sys

# Add scorers directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "scorers")))
from score_response import load_json, score_response, SCORER_VERSION


def main():
    parser = argparse.ArgumentParser(description="Run Feynman Gap Regression Benchmark on an agent response.")
    parser.add_argument("--response", required=True, help="Path to agent response markdown file")
    parser.add_argument("--prompt-variant", help="Prompt variant used")
    parser.add_argument("--run-id", help="Evaluation Run ID")
    parser.add_argument("--output-json", help="Optional path to save scorecard JSON")

    args = parser.parse_args()

    benchmark_path = os.path.join(os.path.dirname(__file__), "feynman_regression_benchmark.json")
    if not os.path.exists(benchmark_path):
        print(f"Error: Benchmark definition not found: {benchmark_path}")
        sys.exit(1)

    if not os.path.exists(args.response):
        print(f"Error: Response file not found: {args.response}")
        sys.exit(1)

    benchmark_data = load_json(benchmark_path)
    with open(args.response, "r", encoding="utf-8", errors="ignore") as f:
        response_text = f.read()

    # Infer runId from path if not provided
    run_id = args.run_id
    if not run_id:
        match = re.search(r"evaluation/runs/([^/]+)/", args.response)
        if match:
            run_id = match.group(1)

    result = score_response(
        benchmark_data,
        response_text,
        response_path=args.response,
        prompt_variant=args.prompt_variant,
        run_id=run_id
    )

    thresholds = benchmark_data.get("passThresholds", {
        "minCompositeScore": 6.5,
        "minRecalledKeys": 5
    })

    score = result["overallScore"]
    recalled = result["recalledKeys"]
    min_score = thresholds.get("minCompositeScore", 6.5)
    min_keys = thresholds.get("minRecalledKeys", 5)

    passed = (score >= min_score) and (recalled >= min_keys)

    print("=" * 60)
    print(f"🔍 FEYNMAN GAP REGRESSION BENCHMARK: {'PASSED ✅' if passed else 'FAILED ❌'}")
    print(f"   Target: {args.response}")
    print(f"   Run ID: {result['runId']}")
    print(f"   Prompt Variant: {result['promptVariant']}")
    print(f"   Score: {score} / 10.0 (Threshold: >= {min_score})")
    print(f"   Recalled Keys: {recalled} / {result['totalKeys']} (Threshold: >= {min_keys})")
    print("=" * 60)

    for k in result["keyDetails"]:
        icon = "✅" if k["isRecalled"] else "❌"
        print(f"  {icon} {k['keyId']}: {k['description'][:70]}...")
        if not k["isRecalled"] and k["missingFacets"]:
            print(f"     Missing: {', '.join(k['missingFacets'])}")

    print("=" * 60)

    if args.output_json:
        os.makedirs(os.path.dirname(os.path.abspath(args.output_json)), exist_ok=True)
        with open(args.output_json, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
        print(f"Saved scorecard JSON to {args.output_json}")

    if passed:
        print("🎉 REGRESSION PASSED: Knowledge layer successfully recalled critical failure modes!")
        sys.exit(0)
    else:
        print("❌ REGRESSION FAILED: Knowledge layer missed critical failure modes!")
        sys.exit(1)


if __name__ == "__main__":
    main()
