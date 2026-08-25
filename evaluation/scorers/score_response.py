#!/usr/bin/env python3
"""
Hardened Automated Hidden-Key and Architecture Contract Scorer for ESEKL Evaluations.
Evaluates multi-facet semantic compliance, contract terms, failure triggers, and validation shapes.
"""

import argparse
from datetime import datetime, timezone
import json
import os
import re
import sys

SCORER_VERSION = "v2.1.0-hardened"


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def score_response(hidden_key_data, response_text, response_path="", prompt_variant=None, run_id=None):
    dim_weights = hidden_key_data.get("dimensions", {
        "evidence_recall_weight": 0.35,
        "contract_coverage_weight": 0.25,
        "failure_scenario_weight": 0.20,
        "validation_test_weight": 0.10,
        "counterexample_weight": 0.10
    })

    keys = hidden_key_data.get("hiddenKeys", [])
    total_key_weight = sum(k.get("weight", 1.0) for k in keys) if keys else 1.0

    key_results = []
    total_recalled_score = 0.0

    lower_response = response_text.lower()
    found_evidence_ids = set(re.findall(r"\b(CLM-\d+|OBS-[A-Z]+-\d+|HIST-[A-Z]+-\d+|EKU-[A-Z]+-\d+)\b", response_text))

    for k in keys:
        kid = k["id"]
        kdesc = k["description"]
        kweight = k.get("weight", 1.0)
        phrasings = k.get("acceptable_phrasings", [])
        req_evidence = k.get("required_evidence_ids", [])
        must_contract = k.get("must_include_contract_terms", [])
        must_trigger = k.get("must_include_failure_trigger", [])
        must_val = k.get("must_include_validation_shape", [])
        disallowed = k.get("disallowed_generic_matches", [])

        # 1. Check phrase matches
        matched_phrases = [p for p in phrasings if p.lower() in lower_response]

        # 2. Check evidence ID matches
        matched_evidence = [eid for eid in req_evidence if eid in found_evidence_ids]

        # 3. Check semantic facets
        matched_contract_terms = [t for t in must_contract if t.lower() in lower_response]
        matched_triggers = [t for t in must_trigger if t.lower() in lower_response]
        matched_vals = [v for v in must_val if v.lower() in lower_response]

        missing_facets = []
        if must_contract and not matched_contract_terms:
            missing_facets.append("CONTRACT_TERMS_MISSING")
        if must_trigger and not matched_triggers:
            missing_facets.append("FAILURE_TRIGGER_MISSING")
        if must_val and not matched_vals:
            missing_facets.append("VALIDATION_SHAPE_MISSING")

        # 4. Check generic boilerplate penalty
        found_disallowed = [d for d in disallowed if d.lower() in lower_response]

        # Base recall requires either phrase or evidence ID
        base_match = len(matched_phrases) > 0 or len(matched_evidence) > 0

        if not base_match:
            facet_score = 0.0
        else:
            total_facets = (1 if must_contract else 0) + (1 if must_trigger else 0) + (1 if must_val else 0)
            passed_facets = ((1 if matched_contract_terms else 0) +
                             (1 if matched_triggers else 0) +
                             (1 if matched_vals else 0))
            facet_multiplier = (passed_facets / total_facets) if total_facets > 0 else 1.0

            evidence_bonus = 0.15 if matched_evidence else 0.0
            penalty = 0.20 if found_disallowed else 0.0

            facet_score = min(1.0, max(0.0, (facet_multiplier * 0.85) + evidence_bonus - penalty))

        is_recalled = facet_score >= 0.50
        total_recalled_score += (facet_score * kweight)

        key_results.append({
            "keyId": kid,
            "description": kdesc,
            "weight": kweight,
            "facetScore": round(facet_score, 2),
            "isRecalled": is_recalled,
            "matchedPhrases": matched_phrases,
            "matchedEvidenceIds": matched_evidence,
            "matchedContractTerms": matched_contract_terms,
            "matchedFailureTriggers": matched_triggers,
            "matchedValidationShapes": matched_vals,
            "missingFacets": missing_facets,
            "expectedBusinessContract": k.get("business_contract_expected", ""),
            "expectedFailureScenario": k.get("failure_scenario_expected", ""),
            "expectedValidationTest": k.get("validation_test_expected", "")
        })

    # Dimension 1: Hardened Evidence / Hidden-Key Recall (0-10)
    recall_score = (total_recalled_score / total_key_weight) * 10.0 if total_key_weight > 0 else 0.0

    # Dimension 2: Contract Coverage (0-10)
    contract_markers = [
        r"\b(invariant|contract|precondition|postcondition|state transition|guarantee)\b",
        r"\b(ownership|token|generation|fence|atomic|isolation)\b",
        r"\b(storage[- ]side time|server time|clock_timestamp)\b",
        r"\b(retry limit|max attempts|quarantine|dead[- ]letter|dlq)\b"
    ]
    contract_hits = sum(1 for m in contract_markers if re.search(m, lower_response))
    contract_score = min(10.0, (contract_hits / len(contract_markers)) * 10.0)

    # Dimension 3: Failure Scenario Granularity (0-10)
    failure_markers = [
        r"\b(zombie|pause|gc pause|clock skew|drift|ntp|crash|sigterm|sigkill|oom|stall|poison)\b",
        r"\b(scenario|step 1|step 2|trigger|failure condition|unhandled)\b"
    ]
    failure_hits = sum(1 for m in failure_markers if re.search(m, lower_response))
    failure_score = min(10.0, (failure_hits / len(failure_markers)) * 10.0)

    # Dimension 4: Validation Test Specificity (0-10)
    test_markers = [
        r"\b(test|assert|verify|simulation|mock|step|inject|reproduce)\b",
        r"\b(assert_eq|expect|should|0 rows|rejected|exception)\b"
    ]
    test_hits = sum(1 for m in test_markers if re.search(m, lower_response))
    test_score = min(10.0, (test_hits / len(test_markers)) * 10.0)

    # Dimension 5: Counterexamples & Caveats (0-10)
    counter_markers = [
        r"\b(counterexample|alternative|limitation|caveat|what not to promise|unfenced|risk)\b",
        r"\b(asynq|river|pgmq|bullmq|nats|nsq|redpanda|rocketmq|artemis|rabbitmq)\b"
    ]
    counter_hits = sum(1 for m in counter_markers if re.search(m, lower_response))
    counter_score = min(10.0, (counter_hits / len(counter_markers)) * 10.0)

    # Compute overall composite score (0-10)
    w_recall = dim_weights.get("evidence_recall_weight", 0.35)
    w_contract = dim_weights.get("contract_coverage_weight", 0.25)
    w_failure = dim_weights.get("failure_scenario_weight", 0.20)
    w_test = dim_weights.get("validation_test_weight", 0.10)
    w_counter = dim_weights.get("counterexample_weight", 0.10)

    composite_score = (
        (recall_score * w_recall) +
        (contract_score * w_contract) +
        (failure_score * w_failure) +
        (test_score * w_test) +
        (counter_score * w_counter)
    )

    # Auto-detect runId if not supplied
    if not run_id and response_path:
        match = re.search(r"evaluation/runs/([^/]+)/", response_path)
        if match:
            run_id = match.group(1)

    return {
        "suiteId": hidden_key_data.get("suiteId"),
        "suiteTitle": hidden_key_data.get("suiteTitle"),
        "scorerVersion": SCORER_VERSION,
        "runId": run_id or "N/A",
        "promptVariant": prompt_variant or "N/A",
        "responsePath": response_path,
        "scoredAt": datetime.now(timezone.utc).isoformat(),
        "overallScore": round(composite_score, 2),
        "dimensionScores": {
            "evidenceRecall": round(recall_score, 2),
            "contractCoverage": round(contract_score, 2),
            "failureScenarioGranularity": round(failure_score, 2),
            "validationTestSpecificity": round(test_score, 2),
            "counterexampleQuality": round(counter_score, 2)
        },
        "dimensionWeights": {
            "evidenceRecall": w_recall,
            "contractCoverage": w_contract,
            "failureScenarioGranularity": w_failure,
            "validationTestSpecificity": w_test,
            "counterexampleQuality": w_counter
        },
        "totalKeys": len(keys),
        "recalledKeys": sum(1 for kr in key_results if kr["isRecalled"]),
        "foundEvidenceIds": sorted(list(found_evidence_ids)),
        "keyDetails": key_results
    }


def generate_markdown_report(result, response_path):
    dims = result["dimensionScores"]
    md = [
        f"# 📊 Hardened Automated Scorecard: {result['suiteTitle']}",
        f"**Target Response**: `{response_path}`  ",
        f"**Run ID**: `{result.get('runId', 'N/A')}`  ",
        f"**Prompt Variant**: `{result.get('promptVariant', 'N/A')}`  ",
        f"**Scorer Version**: `{result.get('scorerVersion', SCORER_VERSION)}`  ",
        f"**Scored At**: `{result.get('scoredAt', 'N/A')}`  ",
        f"**Composite Score**: **`{result['overallScore']} / 10.0`**  ",
        f"**Key Recall**: `{result['recalledKeys']} / {result['totalKeys']}` keys verified",
        "",
        "---",
        "",
        "## 📈 Dimension Breakdown",
        "",
        "| Dimension | Score (0-10) | Weight | Contribution |",
        "|---|---|---|---|",
        f"| **Evidence / Semantic Recall** | {dims['evidenceRecall']} | {result['dimensionWeights']['evidenceRecall']} | {round(dims['evidenceRecall'] * result['dimensionWeights']['evidenceRecall'], 2)} |",
        f"| **Architecture Contract Coverage** | {dims['contractCoverage']} | {result['dimensionWeights']['contractCoverage']} | {round(dims['contractCoverage'] * result['dimensionWeights']['contractCoverage'], 2)} |",
        f"| **Failure Scenario Granularity** | {dims['failureScenarioGranularity']} | {result['dimensionWeights']['failureScenarioGranularity']} | {round(dims['failureScenarioGranularity'] * result['dimensionWeights']['failureScenarioGranularity'], 2)} |",
        f"| **Validation Test Specificity** | {dims['validationTestSpecificity']} | {result['dimensionWeights']['validationTestSpecificity']} | {round(dims['validationTestSpecificity'] * result['dimensionWeights']['validationTestSpecificity'], 2)} |",
        f"| **Counterexamples & Caveats** | {dims['counterexampleQuality']} | {result['dimensionWeights']['counterexampleQuality']} | {round(dims['counterexampleQuality'] * result['dimensionWeights']['counterexampleQuality'], 2)} |",
        "",
        "---",
        "",
        "## 🔑 Hardened Semantic Key Audit",
        ""
    ]

    for k in result["keyDetails"]:
        status_icon = "✅" if k["isRecalled"] else "❌"
        md.append(f"### {status_icon} `{k['keyId']}` (Score: {k['facetScore']}/1.0): {k['description']}")
        if k["matchedPhrases"]:
            md.append(f"- **Matched Phrases**: {', '.join(k['matchedPhrases'])}")
        if k["matchedEvidenceIds"]:
            md.append(f"- **Matched Evidence IDs**: {', '.join(k['matchedEvidenceIds'])}")
        if k["missingFacets"]:
            md.append(f"- **Missing Semantic Facets**: {', '.join(k['missingFacets'])}")
        md.append(f"- **Expected Contract**: {k['expectedBusinessContract']}")
        md.append("")

    return "\n".join(md)


def main():
    parser = argparse.ArgumentParser(description="Score agent response against hardened empirical keys.")
    parser.add_argument("--hidden-key", required=True, help="Path to hidden key rubric JSON")
    parser.add_argument("--response", required=True, help="Path to agent response markdown file")
    parser.add_argument("--prompt-variant", help="Prompt variant used (e.g. V1_TECHNICAL_BRIDGE, V2_BLIND_OUTCOMES)")
    parser.add_argument("--run-id", help="Evaluation Run ID")
    parser.add_argument("--output-json", help="Path to write scorecard JSON")
    parser.add_argument("--output-md", help="Path to write scorecard Markdown report")

    args = parser.parse_args()

    if not os.path.exists(args.hidden_key):
        print(f"Error: Hidden key file not found: {args.hidden_key}")
        sys.exit(1)

    if not os.path.exists(args.response):
        print(f"Error: Response file not found: {args.response}")
        sys.exit(1)

    hidden_key_data = load_json(args.hidden_key)
    with open(args.response, "r", encoding="utf-8", errors="ignore") as f:
        response_text = f.read()

    result = score_response(
        hidden_key_data,
        response_text,
        response_path=args.response,
        prompt_variant=args.prompt_variant,
        run_id=args.run_id
    )

    print("=" * 60)
    print(f"🎯 HARDENED SCORING RESULT: {result['overallScore']} / 10.0")
    print(f"   Suite: {result['suiteTitle']}")
    print(f"   Run ID: {result['runId']}")
    print(f"   Prompt Variant: {result['promptVariant']}")
    print(f"   Scorer Version: {result['scorerVersion']}")
    print(f"   Recalled Keys: {result['recalledKeys']} / {result['totalKeys']}")
    print("=" * 60)

    if args.output_json:
        os.makedirs(os.path.dirname(os.path.abspath(args.output_json)), exist_ok=True)
        with open(args.output_json, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
        print(f"Saved scorecard JSON to: {args.output_json}")

    if args.output_md:
        os.makedirs(os.path.dirname(os.path.abspath(args.output_md)), exist_ok=True)
        md_text = generate_markdown_report(result, args.response)
        with open(args.output_md, "w", encoding="utf-8") as f:
            f.write(md_text)
        print(f"Saved scorecard Markdown to: {args.output_md}")


if __name__ == "__main__":
    main()
