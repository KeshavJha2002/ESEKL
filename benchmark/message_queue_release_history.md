# Message Queue Release History

This file preserves the useful release history that used to live in `eku_store/` as patch overlays and promotion records. The active product store is now the consolidated v5 base release:

- `eku_store/synthesized_queue_ekus.json`
- `eku_store/claim_matrix.json`
- `eku_store/evidence/*.json`
- `eku_store/repo_ekus/*.json`

## Current Release

- Version: `5.0.0-consolidated`
- Corpus: 13 mature queue, broker, and streaming repositories
- Domain EKUs: 20
- Status: v4 patch findings merged into the v5 base release

## Consolidated Patch Findings

The earlier v4 patch overlay promoted six gap-loop findings. They are no longer stored as a separate release overlay because all six are now present in the canonical v5 base release.

| EKU | Claim | Type | Summary |
|---|---|---|---|
| `EKU-QUEUE-015` | `CLM-015` | `BEHAVIORAL_INVARIANT` | Fenced domain result promotion and outbox emission. |
| `EKU-QUEUE-016` | `CLM-016` | `BEHAVIORAL_INVARIANT` | Authoritative storage-time lease recovery. |
| `EKU-QUEUE-017` | `CLM-017` | `BEHAVIORAL_INVARIANT` | Separate attempt, handled-failure, and worker-loss counters. |
| `EKU-QUEUE-018` | `CLM-018` | `SOLUTION_FAMILY` | Poison payload isolation from repeatable stall exemptions. |
| `EKU-QUEUE-019` | `CLM-019` | `BEHAVIORAL_INVARIANT` | Bounded admission waiters in publish overload. |
| `EKU-QUEUE-020` | `CLM-020` | `BEHAVIORAL_INVARIANT` | Decoupled worker-drain and broker-socket shutdown contracts. |

## Why Old Files Were Removed

The following files were removed from `eku_store/` because they were historical reports or intermediate release overlays, not active runtime knowledge objects:

- `eku_store/message_queue_complete_corpus_synthesis.md`
- `eku_store/message_queue_cross_repo_synthesis.md`
- `eku_store/message_queue_synthesis_report.md`
- `eku_store/message_queue_release_strategy.md`
- `eku_store/corpus_expansion_playbook.md`
- `eku_store/research_gaps.json`
- `eku_store/synthesized_queue_ekus_v4_patch_release.json`
- `eku_store/promotion/*`

The retained evidence-backed product surface is the v5 consolidated store plus the MCP interface. Future patch candidates should be added to the evidence ledger and promoted into the canonical base only after validator, matrix, benchmark, and counterexample checks pass.
