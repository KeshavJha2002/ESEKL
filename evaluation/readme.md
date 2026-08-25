# ESEKL Empirical Evaluation Framework

This directory contains runnable benchmark prompts, gap workflows, scoring rubrics, automated scorer tests, and schemas. Human-readable benchmark proof lives in [`../benchmark/`](../benchmark/).

---

## Evaluation Objectives

1. **Compare access conditions**:

   | Condition | Description |
   |---|---|
   | `baseline_general` | General pre-trained knowledge without external tools |
   | `baseline_repo_access` | Direct tool access to browse mature codebases in `/factory/*` |
   | `esekl_mcp` | Retrieval of structured behavioral invariants, counterexamples, and contracts through MCP |

2. **Assess business abstraction and contract formulation**:
   - Test whether agents given non-technical business requirements (e.g. payment settlement, document signing, deployment safety) can formulate rigorous architectural contracts and surface "What Not To Promise" without being told which queue mechanisms to ask for.

3. **Prevent discovery regressions**:
   - Use the scorer fixtures and gap-regression tooling when running a new preregistered benchmark. Historical raw run outputs have been compacted into [`../benchmark/message_queue_evaluation_summary.md`](../benchmark/message_queue_evaluation_summary.md).

---

## Mandatory Test and Evaluation Gates

### 1. Evidence Ledger and Release Validator

```bash
python3 analyzer/validate_evidence_ledger.py
```

**Gate rule**: Must report `0 ERRORS, 0 WARNINGS`.

### 2. Scorer Engine and Multi-Facet Fixture Tests

```bash
python3 evaluation/scorers/test_scorer.py
```

**Gate rule**: All fixture tests (`strong_esekl_response`, `generic_boilerplate`, `id_dump`, `right_contract_no_ids`) must pass.

### 3. Optional Feynman Gap Regression Test

```bash
python3 evaluation/gap_workflow/run_gap_regression.py --response <path-to-response.md>
```

**Gate rule**: Must achieve composite score >= 6.5 / 10.0 and recall >= 5 / 7 critical failure keys.

---

## Subdirectory Navigation

| Directory | Contents |
|---|---|
| [`business_benchmarks/`](./business_benchmarks) | Canonical non-technical business prompts and negative controls |
| [`gap_workflow/`](./gap_workflow) | Gap-audit schemas and regression test tooling |
| [`scorers/`](./scorers) | Hardened multi-facet automated scorers, calibration notes, and regression fixtures |
| [`../benchmark/`](../benchmark/) | Human-readable benchmark proof, workflow, and retained message_queue outcomes |
