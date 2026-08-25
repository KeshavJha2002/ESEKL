# Empirical Corpus Expansion Gate and Readiness Policy

**Date**: 2026-08-23
**Status**: ACTIVE POLICY — RECONCILED AUDIT GATE

---

## Fundamental Expansion Principle

> Adding more repositories is not success by itself.

Simply increasing the number of analyzed repositories from 13 to 20, or expanding into a new domain before proving that ESEKL fundamentally improves engineering decisions, produces vanity volume — not empirical knowledge.

Corpus expansion into a new systems domain (e.g. distributed consensus engines, LSM-tree storage engines, or distributed lock managers) is strictly prohibited until the current distributed queue / message broker corpus satisfies all 5 prerequisite gates defined below.

---

## Gate Status and Epistemic Verification

```text
[Gate 1: Mechanical Ledger Health]       -->  PASSED (0 Errors, 0 Warnings on validate_evidence_ledger.py)
[Gate 2: Automated Scorer Calibration]   -->  PASSED (Deterministic fixtures & negative controls verified)
[Gate 3: Feynman Gap Regression Gate]    -->  PASSED (Score: 8.53 / 10.0, 5/7 keys on blind business run)
[Gate 4: Blind Business Benchmark]       -->  PASSED ON V4 CLEAN PROMPT (Score: 8.82 / 10.0, 4/4 keys)
[Gate 5: Base Release Consolidation]     -->  CONSOLIDATED (v5.0.0-consolidated with 20 base EKUs)
```

---

### Gate 1: Evidence Provenance and Ledger Health

| Field | Detail |
|---|---|
| Command | `python3 analyzer/validate_evidence_ledger.py` |
| Criterion | Must report `0 ERRORS, 0 WARNINGS` across all observations, git commit hashes, claims, EKUs, run manifests, and rubrics |
| Status | **PASSED** |

### Gate 2: Automated Scorer Calibration and Negative Controls

| Field | Detail |
|---|---|
| Command | `python3 evaluation/scorers/test_scorer.py` |
| Criterion | All 4 scorer fixtures pass within score bands; negative controls in `evaluation/business_benchmarks/negative_controls/` score <= 3.5 / 10.0 |
| Status | **PASSED** |

### Gate 3: Gap Regression Gate

| Field | Detail |
|---|---|
| Command | `python3 evaluation/gap_workflow/run_gap_regression.py --response <response.md>` |
| Criterion | Composite score >= 6.5 / 10.0 and recall >= 5 / 7 second-order failure keys |
| Status | Compacted into [`message_queue_evaluation_summary.md`](./message_queue_evaluation_summary.md). Future runs must produce fresh preregistered artifacts then compact outcomes after analysis. |

### Gate 4: Blind Business-Abstraction Benchmark

| Field | Detail |
|---|---|
| Criterion | ESEKL MCP condition on the de-leaked business prompt ([`blind_business_outcomes_prompt.md`](../evaluation/business_benchmarks/blind_business_outcomes_prompt.md)) must score >= 8.5 / 10.0 formulating enforceable contracts and identifying "What Not To Promise" |
| Benchmark evolution | Historical scores compacted into [`message_queue_evaluation_summary.md`](./message_queue_evaluation_summary.md); raw per-condition artifacts removed from release tree |
| Status | **PASSED ON FINAL CLEANED V4 PROMPT** |

### Gate 5: Base Release Consolidation Readiness

| Field | Detail |
|---|---|
| Criterion | Full 13-repository matrix evaluations populated in `claim_matrix.json` for all promoted claims (`CLM-015` through `CLM-020`) and consolidated into `synthesized_queue_ekus.json` |
| Status | **CONSOLIDATED (v5.0.0-consolidated with 20 base EKUs)** |

---

## Future Domain Placeholders (Non-Active)

When the queue corpus is formally closed, candidate future domains for empirical analysis include:

1. **Distributed Consensus and Replication Engines** — `etcd/raft`, `hashicorp/raft`, `sofastack/sofa-jraft`
2. **Embedded LSM-Tree and B-Tree Storage Engines** — `cockroachdb/pebble`, `facebook/rocksdb`, `dgraph-io/badger`

These domains are listed strictly as research placeholders. No work shall commence on them until all 5 expansion gates are fully closed.
