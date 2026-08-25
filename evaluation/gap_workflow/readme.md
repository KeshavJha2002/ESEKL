# Evidence-Gap Analysis, Patching, and Regression Workflow

This directory defines the structured, data-driven research workflow for identifying gaps between raw codebase discoveries and the ESEKL knowledge layer, and running automated regression benchmarks.

---

## The Feynman-to-Galileo Gap Loop

```text
Raw repository discovery
  |
  v
Compare against ESEKL-backed response
  |
  v
Classify root cause of gap (controlled vocabulary)
  |
  v
Patch evidence ledger (observations / claims / historical failures)
  |
  v
Update evidence packet / promoted candidate EKUs
  |
  v
Execute blind rerun on same benchmark (run_gap_regression.py)
  |
  v
Promote to patch release if retrieval and decision quality improves
```

---

## Executing the Feynman Gap Regression Benchmark

To verify that an ESEKL-backed agent response has not regressed on any of the 7 second-order failure modes surfaced in the initial Feynman audit, run:

```bash
python3 evaluation/gap_workflow/run_gap_regression.py \
  --response /path/to/current-response.md \
  --output-json /tmp/feynman_regression_result.json
```

**Pass criteria**:

| Criterion | Threshold |
|---|---|
| Composite score | >= 6.5 / 10.0 |
| Recalled keys | >= 5 / 7 |
| Required content | Concrete failure trigger and validation assertions present |

---

## Controlled Vocabulary for `gap_type`

When analyzing why an ESEKL-backed agent missed a discovery surfaced by raw repository inspection, researchers must classify the gap into one of the following standard categories:

| `gap_type` | Description |
|---|---|
| `MISSING_OBSERVATION` | Mechanism exists in `factory/<repo>` but was missing in `observations.json` |
| `OVERLY_COMPRESSED_OBSERVATION` | Nuances were stripped during abstraction summarization |
| `MISSING_FAILURE_CHAIN` | Real production failure or bug fix exists in git history but was missing in `historical_failures.json` |
| `RETRIEVAL_FAILED` | Knowledge was present in the ledger, but agent failed to retrieve it |
| `ABSTRACTION_HID_CONDITION` | Claim was framed so broadly that boundary constraints were obscured |
| `EVIDENCE_PACKET_OMITTED_REGRESSION_TEST` | Specific reproduction scenario was dropped from packet |
| `NOT_A_REAL_GAP` | Discovery was inaccurate, ecosystem-biased, or inapplicable |

---

## Directory Contents

| File | Description |
|---|---|
| `gap_audit.schema.json` | Strict JSON schema for structured gap audits |
| `gap_audit_template.json` | Clean template for auditing new evaluation runs |
| `feynman_regression_benchmark.json` | Machine-readable hidden keys and thresholds |
| `run_gap_regression.py` | Automated CLI regression test runner |
