#!/usr/bin/env python3
"""
Unit tests for the hardened hidden-key scorer engine.
Verifies that strong responses score high, generic boilerplate scores low,
and ID-dumping without semantic contracts is penalized.
"""

import os
import sys
from score_response import load_json, score_response


def test_scorer():
    rubric_path = "evaluation/scorers/rubrics/queue_failure_recall.json"
    if not os.path.exists(rubric_path):
        print(f"Error: Rubric file not found: {rubric_path}")
        sys.exit(1)

    rubric_data = load_json(rubric_path)

    fixtures = [
        {
            "name": "Strong ESEKL Response",
            "file": "evaluation/scorers/fixtures/strong_esekl_response.md",
            "min_score": 7.0,
            "max_score": 10.0,
            "expected_recalled_keys": 6
        },
        {
            "name": "Generic Boilerplate Response",
            "file": "evaluation/scorers/fixtures/generic_boilerplate_response.md",
            "min_score": 0.0,
            "max_score": 4.0,
            "expected_recalled_keys": 0
        },
        {
            "name": "ID Dump (Wrong / Missing Contract)",
            "file": "evaluation/scorers/fixtures/id_dump_wrong_contract_response.md",
            "min_score": 0.0,
            "max_score": 4.5,
            "expected_recalled_keys": 0
        },
        {
            "name": "Right Contract Without IDs",
            "file": "evaluation/scorers/fixtures/right_contract_no_ids_response.md",
            "min_score": 6.0,
            "max_score": 10.0,
            "expected_recalled_keys": 5
        }
    ]

    all_passed = True
    print("=" * 60)
    print("🧪 RUNNING SCORER HARDENING FIXTURE TESTS")
    print("=" * 60)

    for fix in fixtures:
        with open(fix["file"], "r", encoding="utf-8") as f:
            text = f.read()

        result = score_response(rubric_data, text)
        score = result["overallScore"]
        recalled = result["recalledKeys"]

        score_ok = fix["min_score"] <= score <= fix["max_score"]
        keys_ok = recalled >= fix["expected_recalled_keys"] if fix["expected_recalled_keys"] > 0 else (recalled <= 1)

        status = "✅ PASS" if (score_ok and keys_ok) else "❌ FAIL"
        if not (score_ok and keys_ok):
            all_passed = False

        print(f"\n{status}: {fix['name']}")
        print(f"   Score: {score} (Expected range: [{fix['min_score']}, {fix['max_score']}])")
        print(f"   Recalled Keys: {recalled} / {result['totalKeys']} (Expected: ~{fix['expected_recalled_keys']})")

    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 ALL SCORER FIXTURE TESTS PASSED PERFECTLY!")
        sys.exit(0)
    else:
        print("❌ SOME SCORER FIXTURE TESTS FAILED!")
        sys.exit(1)


if __name__ == "__main__":
    test_scorer()
