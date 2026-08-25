# Hardened ESEKL Automated Hidden-Key and Benchmark Scorer

This directory contains deterministic mechanical scoring tools to evaluate AI agent responses against ground-truth empirical discoveries, architectural contracts, and failure boundary constraints.

---

## Why Hardened Multi-Facet Scoring Matters

Simple keyword or regex matching is vulnerable to:

1. **ID-dumping**: An agent name-drops `CLM-015` or `OBS-BULLMQ-002` without stating or enforcing the contract.
2. **Generic boilerplate**: An agent repeats words like "locks", "timestamps", or "graceful shutdown" without specifying failure triggers or step-by-step verification shapes.
3. **Unlisted phrasing**: An agent articulates the exact correct engineering design using synonyms not present in a naive keyword list.

The hardened scorer evaluates each hidden key across three required semantic facets:

| Facet | Description |
|---|---|
| `must_include_contract_terms` | Core invariant and state machine terms (e.g. `generation`, `token`, `fence`, `outbox`, `storage-side`) |
| `must_include_failure_trigger` | Concrete failure conditions (e.g. `gc pause`, `sigkill`, `clock drift`, `disk freeze`) |
| `must_include_validation_shape` | Actionable test assertions (e.g. `0 rows mutated`, `recovery schedule unchanged`, `reject overflow`) |

---

## Scorer Fixtures and Regression Tests

Automated fixtures in `fixtures/` test the scorer against known archetypes:

```bash
python3 evaluation/scorers/test_scorer.py
```

| Fixture | Description | Target Score Band | Verified Outcome |
|---|---|---|---|
| [`strong_esekl_response.md`](./fixtures/strong_esekl_response.md) | Full contracts, triggers, validation, and evidence IDs | `[7.0, 10.0]` | **7.72 / 10.0** (6/7 keys) |
| [`generic_boilerplate_response.md`](./fixtures/generic_boilerplate_response.md) | Vague high-level advice ("be careful with workers") | `[0.0, 4.0]` | **1.00 / 10.0** (0/7 keys) |
| [`id_dump_wrong_contract_response.md`](./fixtures/id_dump_wrong_contract_response.md) | Cites `CLM-*` IDs but omits contracts/triggers | `[0.0, 4.5]` | **1.88 / 10.0** (0/7 keys) |
| [`right_contract_no_ids_response.md`](./fixtures/right_contract_no_ids_response.md) | Exact contracts and triggers without citing IDs | `[6.0, 10.0]` | **6.22 / 10.0** (5/7 keys) |

---

## Known Limitations

1. **Semantic facet thresholds**: While multi-facet scoring drastically reduces false positives, highly novel phrasing that diverges from all listed synonyms may require updating `acceptable_phrasings` or `must_include_*` facets.
2. **Reviewer override**: Automated scores should serve as primary objective metrics, with qualitative reviewer notes recorded in the scorecard's markdown commentary.
