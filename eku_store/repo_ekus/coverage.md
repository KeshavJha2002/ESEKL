# ESEKL RepoEKU-to-Domain Layering and Falsification Coverage Report

**Generated Date**: 2026-08-23
**Domain EKUs Audited**: 20
**RepoEKUs Active**: 15 across 7 repositories

---

## 1. Domain EKU Layering and Falsification Matrix

| EKU ID | Title | Layering Status | Supported RepoEKUs | Alt Mechanisms | Counterexamples | Not Applicable | Falsification Audit |
|---|---|---|---|---|---|---|---|
| `EKU-QUEUE-001` | Atomic Dequeue and Distributed Lease Allocation | `PARTIALLY_LAYERED` | 1 (REKU-BULLMQ-001) | 2 (REKU-RIVER-002, REKU-RIVER-001) | 0 | 1 (REKU-NATS-001) | AUDITED |
| `EKU-QUEUE-002` | Token-Fenced Ownership Validation on State Finalization | `PARTIALLY_LAYERED` | 2 (REKU-RIVER-004, REKU-BULLMQ-001) | 1 (REKU-PGMQ-002) | 0 | 1 (REKU-NATS-001) | AUDITED |
| `EKU-QUEUE-003` | Clock-Skew Defended Sweep and Multi-Phase Crash Recovery | `PARTIALLY_LAYERED` | 3 (REKU-RIVER-001, REKU-PGMQ-001, REKU-BULLMQ-002) | 1 (REKU-ASYNQ-001) | 0 | 1 (REKU-NATS-001) | AUDITED |
| `EKU-QUEUE-004` | Atomic Delivery Thresholding and Poison-Pill Dead-Letter Quarantine | `PARTIALLY_LAYERED` | 1 (REKU-BULLMQ-004) | 1 (REKU-RIVER-004) | 0 | 1 (REKU-LITEQUEUE-001) | AUDITED |
| `EKU-QUEUE-005` | Credit-Based Flow Control and Producer Ingestion Backpressure | `PARTIALLY_LAYERED` | 1 (REKU-REDPANDA-001) | 1 (REKU-NATS-001) | 0 | 2 (REKU-PGMQ-001, REKU-LITEQUEUE-001) | AUDITED |
| `EKU-QUEUE-006` | Fast-Shedding Latency Gating and Storage Saturation Protection | `PARTIALLY_LAYERED` | 1 (REKU-REDPANDA-001) | 0 | 0 | 2 (REKU-LITEQUEUE-001, REKU-PGMQ-001) | AUDITED |
| `EKU-QUEUE-007` | Relational Lock-Free Task Dequeue via MVCC Row-Level Skipping | `PARTIALLY_LAYERED` | 1 (REKU-RIVER-001) | 2 (REKU-LITEQUEUE-001, REKU-BULLMQ-001) | 0 | 2 (REKU-REDPANDA-001, REKU-NATS-001) | AUDITED |
| `EKU-QUEUE-008` | Sector-Aligned Append-Only Direct I/O Journal Ingestion | `PARTIALLY_LAYERED` | 1 (REKU-REDPANDA-001) | 1 (REKU-LITEQUEUE-001) | 0 | 2 (REKU-RIVER-001, REKU-BULLMQ-001) | AUDITED |
| `EKU-QUEUE-009` | Decoupled Physical Storage CommitLog and Lightweight Logical Queue Offsets | `PARTIALLY_LAYERED` | 1 (REKU-LITEQUEUE-001) | 1 (REKU-RIVER-001) | 0 | 1 (REKU-NATS-001) | AUDITED |
| `EKU-QUEUE-010` | Epoch-Scoped Consensus State Machine Fencing | `PARTIALLY_LAYERED` | 1 (REKU-RIVER-002) | 1 (REKU-BULLMQ-001) | 0 | 1 (REKU-LITEQUEUE-001) | AUDITED |
| `EKU-QUEUE-011` | Monotonic Time-Ordered Identity Generation with Skew Defense | `PARTIALLY_LAYERED` | 1 (REKU-PGMQ-001) | 1 (REKU-BULLMQ-002) | 0 | 1 (REKU-NATS-001) | AUDITED |
| `EKU-QUEUE-012` | Graceful Shutdown In-Flight Drain with Non-Faulting Task Re-enqueue | `PARTIALLY_LAYERED` | 2 (REKU-RIVER-003, REKU-NATS-001) | 1 (REKU-BULLMQ-001) | 0 | 1 (REKU-LITEQUEUE-001) | AUDITED |
| `EKU-QUEUE-013` | Sliding-Window Task Deduplication and Uniqueness Reservation | `PARTIALLY_LAYERED` | 1 (REKU-RIVER-004) | 1 (REKU-BULLMQ-001) | 0 | 1 (REKU-LITEQUEUE-001) | AUDITED |
| `EKU-QUEUE-014` | Out-of-Band Real-Time Control Plane and Cancellation Propagation | `PARTIALLY_LAYERED` | 1 (REKU-RIVER-003) | 1 (REKU-NATS-001) | 0 | 1 (REKU-LITEQUEUE-001) | AUDITED |
| `EKU-QUEUE-015` | Fenced Domain Result Promotion and Outbox Emission | `LAYERED` | 3 (REKU-BULLMQ-001, REKU-PGMQ-002, REKU-RIVER-004) | 1 (REKU-LITEQUEUE-001) | 0 | 1 (REKU-NATS-001) | AUDITED |
| `EKU-QUEUE-016` | Authoritative Storage-Time Lease Recovery | `LAYERED` | 4 (REKU-ASYNQ-001, REKU-PGMQ-001, REKU-BULLMQ-002, REKU-RIVER-001) | 1 (REKU-LITEQUEUE-001) | 0 | 1 (REKU-NATS-001) | AUDITED |
| `EKU-QUEUE-017` | Separate Attempt, Failure, and Worker-Loss Counters | `LAYERED` | 2 (REKU-BULLMQ-003, REKU-RIVER-004) | 1 (REKU-PGMQ-001) | 0 | 1 (REKU-NATS-001) | AUDITED |
| `EKU-QUEUE-018` | Poison Payload Isolation from Repeatable Stall Exemptions | `PARTIALLY_LAYERED` | 1 (REKU-BULLMQ-004) | 0 | 0 | 1 (REKU-LITEQUEUE-001) | AUDITED |
| `EKU-QUEUE-019` | Bounded Admission Waiters in Publish Overload | `PARTIALLY_LAYERED` | 1 (REKU-REDPANDA-001) | 0 | 0 | 1 (REKU-PGMQ-001) | AUDITED |
| `EKU-QUEUE-020` | Decoupled Worker-Drain and Broker-Socket Shutdown Contracts | `LAYERED` | 2 (REKU-RIVER-003, REKU-NATS-001) | 0 | 0 | 0 | AUDITED |

---

## 2. Summary and Layering Progress

| Status | Count | Percentage |
|---|---|---|
| Fully layered (multi-repo grounded) | 4 / 20 | 20.0% |
| Partially layered (pilot grounded) | 16 / 20 | 80.0% |
| Raw evidence only (pending RepoEKU authoring) | 0 / 20 | 0.0% |
| Falsification and exemption audited | 20 / 20 | 100.0% |

---

## 3. Falsification Audit Note Quality

| EKU ID | Quality Status | Diagnostic |
|---|---|---|
| `EKU-QUEUE-001` | REVIEW | missing_alternative_language |
| `EKU-QUEUE-002` | REVIEW | missing_not_applicable_language |
| `EKU-QUEUE-003` | REVIEW | missing_alternative_language, missing_not_applicable_language |
| `EKU-QUEUE-004` | REVIEW | missing_alternative_language |
| `EKU-QUEUE-005` | REVIEW | missing_alternative_language, missing_not_applicable_language |
| `EKU-QUEUE-006` | REVIEW | missing_not_applicable_language |
| `EKU-QUEUE-007` | REVIEW | missing_alternative_language, missing_not_applicable_language |
| `EKU-QUEUE-008` | REVIEW | missing_alternative_language, missing_not_applicable_language |
| `EKU-QUEUE-009` | REVIEW | missing_alternative_language, missing_not_applicable_language |
| `EKU-QUEUE-010` | REVIEW | missing_alternative_language, missing_not_applicable_language |
| `EKU-QUEUE-011` | REVIEW | missing_alternative_language, missing_not_applicable_language |
| `EKU-QUEUE-012` | REVIEW | missing_alternative_language, missing_not_applicable_language |
| `EKU-QUEUE-013` | REVIEW | missing_alternative_language, missing_not_applicable_language |
| `EKU-QUEUE-014` | REVIEW | missing_alternative_language |
| `EKU-QUEUE-015` | REVIEW | missing_alternative_language, missing_not_applicable_language |
| `EKU-QUEUE-016` | REVIEW | missing_alternative_language, missing_not_applicable_language |
| `EKU-QUEUE-017` | REVIEW | missing_alternative_language, missing_not_applicable_language |
| `EKU-QUEUE-018` | PASS | specific_repo_classification_language_present |
| `EKU-QUEUE-019` | REVIEW | missing_not_applicable_language |
| `EKU-QUEUE-020` | PASS | specific_repo_classification_language_present |

---

## 4. High-Priority Domain EKUs for Next Ingestion Batch

1. `EKU-QUEUE-003` / `EKU-QUEUE-016` — Storage-Time Lease Recovery and Multi-Phase Safety Margin
2. `EKU-QUEUE-006` / `EKU-QUEUE-018` — Poison Payload Isolation from Recurring Cron Schedules
3. `EKU-QUEUE-019` — Bounded Admission Control and Storage Stall Fast-Failure
4. `EKU-QUEUE-020` — Decoupled Worker-Drain and Broker-Socket Shutdown Contracts
