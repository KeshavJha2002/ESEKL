# Scorer Calibration and Human-Judged Disagreement Analysis

**Date**: 2026-08-23
**Status**: AUDITED AND CALIBRATED

---

## Calibration Objective

This document analyzes comparative score outputs produced by the automated multi-facet scorer [`score_response.py`](../evaluation/scorers/score_response.py) against manual expert human judgments across historical technical, business-abstraction, and gap-regression benchmarks. The raw result files were compacted into [`message_queue_evaluation_summary.md`](./message_queue_evaluation_summary.md).

---

## Comparative Calibration Matrix

| Condition and Benchmark | Human Judgment Score | Automated Scorer Score | Recalled Keys | Key Disagreement / Calibration Finding |
|---|---|---|---|---|
| Generic Baseline - Technical | 13.5 / 20 (6.75/10) | **4.88 / 10.0** | 1 / 7 | **Acceptable Strictness**: Human review gave partial credit for polished prose; automated scorer correctly penalized omission of concrete failure triggers (fenced generation tokens, DB-time recovery). |
| Raw Repository Access - Technical | 17.5 / 20 (8.75/10) | **7.45 / 10.0** | 5 / 7 | **Well Aligned**: Scorer recognized raw codebase citations (BullMQ, LiteQueue, Asynq) and penalized slight lack of formal pre/post contracts. |
| ESEKL MCP - Technical | 18.5 / 20 (9.25/10) | **7.72 / 10.0** | 6 / 7 | **Well Aligned**: Scorer rewarded explicit contracts (`CLM-015` through `CLM-020`) and step-by-step verification shapes. |
| ESEKL MCP - Business | 19.6 / 20 (9.80/10) | **6.75 / 10.0** | 4 / 4 | **Rubric Under-Detection (Calibrated)**: Business prompt response had 100% key recall (4/4 keys) but received lower automated validation scores because it articulated business verification tests rather than low-level unit test syntax. |

---

## Root Cause Categorization of Disagreements

1. **Test specificity detection in business prompts** (*Rubric Ambiguity*):
   - In business prompts, validation is expressed at the workflow/ledger level (e.g. *"Induce split-brain worker execution; verify ledger record is created exactly once"*). The scorer was calibrated by accepting domain assertions alongside unit test markers.

2. **Boilerplate keyword inflation** (*Scorer Hardened*):
   - Early versions of the scorer allowed generic words ("use locks") to match hidden keys. Adding `must_include_contract_terms`, `must_include_failure_trigger`, and `must_include_validation_shape` reduced false-positive boilerplate scores to <= 1.0/10.0.

3. **Evidence ID name-dropping** (*Scorer Hardened*):
   - Fixture `id_dump_wrong_contract_response.md` proved that citing `CLM-*` without explaining contracts scores <= 1.88/10.0.
