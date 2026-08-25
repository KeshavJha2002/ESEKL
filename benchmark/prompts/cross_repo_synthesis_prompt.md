# Master Cross-Repository Empirical Synthesis Prompt (ESEKL v2)

You are an Empirical Systems Engineering Researcher specializing in distributed systems, high-throughput message brokers, and transactional queue architectures.

Your task is to ingest and cross-analyze all evidence-backed Repository Dossiers in the `eku_store/` directory:

- [`eku_store/asynq/dossier_asynq.json`](eku_store/asynq/dossier_asynq.json)
- [`eku_store/bullmq/dossier_bullmq.json`](eku_store/bullmq/dossier_bullmq.json)
- [`eku_store/pgmq/dossier_pgmq.json`](eku_store/pgmq/dossier_pgmq.json)
- [`eku_store/river/dossier_river.json`](eku_store/river/dossier_river.json)
- [`eku_store/goqite/dossier_goqite.json`](eku_store/goqite/dossier_goqite.json)
- [`eku_store/litequeue/dossier_litequeue.json`](eku_store/litequeue/dossier_litequeue.json)
- [`eku_store/nats_server/dossier_nats_server.json`](eku_store/nats_server/dossier_nats_server.json)
- [`eku_store/nsq/dossier_nsq.json`](eku_store/nsq/dossier_nsq.json)
- [`eku_store/blazingmq/dossier_blazingmq.json`](eku_store/blazingmq/dossier_blazingmq.json)
- [`eku_store/redpanda/dossier_redpanda.json`](eku_store/redpanda/dossier_redpanda.json)
- [`eku_store/rabbitmq/dossier_rabbitmq.json`](eku_store/rabbitmq/dossier_rabbitmq.json)
- [`eku_store/artemis/dossier_artemis.json`](eku_store/artemis/dossier_artemis.json)
- [`eku_store/rocketmq/dossier_rocketmq.json`](eku_store/rocketmq/dossier_rocketmq.json)

---

## Epistemic Rules (Strict Evidence Standards)

1. **Down-traceability enforced**: Every synthesized invariant, claim, or pattern must explicitly link to exact source locations (`filePath:lineRange`), low-level engine behaviors (e.g. Lua scripts, `FOR UPDATE SKIP LOCKED`, Seastar DMA, mmap CommitLog), and test assertions.
2. **Corpus-bounded language**: Never state "The industry does X" or "Best practice is Y". State: *"Across the N analyzed systems in the corpus (RepoA, RepoB, RepoC)..."*
3. **Preserve counterexamples and tensions**: Do not flatten architectural differences into one "ideal" design. Retain trade-offs:
   - In-memory channel spilling (NSQ) vs Redis Hash envelopes (BullMQ) vs SQLite atomic single-row updates (Goqite/LiteQueue) vs Direct I/O append-only segment files (Redpanda/Artemis) vs CommitLog + ConsumeQueue physical/logical splitting (RocketMQ).
   - Strict token fencing (BullMQ) vs un-fenced timestamp expiration (Asynq/PGMQ/Goqite).
   - Actor-isolated backpressure (RabbitMQ credit flow, NATS write deadline disconnect) vs bounded worker thread pools (River, Artemis, RocketMQ).

---

## Core Synthesis Tasks

Work across the following 7 dimensions:

### 1. Unified Storage Paradigm and Ingestion Taxonomy

Compare how each system persists and indexes task/message records:

| Paradigm | Systems |
|---|---|
| Broker-mediated datastores | Redis Lists/ZSets in Asynq/BullMQ |
| ACID relational engines | `SKIP LOCKED` tables in PGMQ/River |
| Embedded file databases | SQLite STRICT tables and UUIDv7 in Goqite/LiteQueue |
| Direct I/O and mapped append-only logs | Seastar Direct I/O in Redpanda, Linux AIO in Artemis, Mapped `CommitLog` in RocketMQ, HighwayHash-64 block WAL in NATS JetStream, memory-spill `.diskqueue` in NSQ, mmap journal in BlazingMQ |

### 2. Mutual Exclusion, Leasing, and Token Fencing

- Compare lease acquisition, renewal, and ownership verification.
- Contrast token fencing (`removeLock.lua` returning `-6`, integer claim IDs in LiteQueue) against bare expiration timestamps.
- Formulate the exact race conditions that occur when fencing tokens are omitted during long worker pauses (GC pauses, event-loop stalls, network partitions).

### 3. Crash Recovery, Clock-Skew Defense, and Poison-Pill Quarantine

Compare stall detection algorithms:

| Algorithm | Systems |
|---|---|
| Centralized sweeper with clock skew safety margin | Asynq 30s buffer, River JobRescuer |
| Decentralized two-phase mark-and-sweep | BullMQ |
| Probabilistic random sampling min-heap sweeps | NSQ |
| Visibility timeout auto-expiry queries | PGMQ, Goqite, LiteQueue |

Extract how poison pills are quarantined (stall counters `stc`, retry ceilings, dead-letter tables `pgmq.a_<name>`, DLX exchanges with `x-death`).

### 4. Backpressure, Flow Control, and Resource Defense

- Contrast credit-based token flow (`credit_flow.erl` in RabbitMQ), consumer-pushed ready tokens (`RDY` count in NSQ), watermarking (`maxUnconfirmed` in BlazingMQ), socket write-deadline disconnects (`SlowConsumer` in NATS), and OS PageCache latency fast-shedding (`BrokerFastFailure` in RocketMQ).

### 5. High Availability and Distributed Consensus

- Contrast multi-broker Raft consensus (NATS NRG, Redpanda Raft, RabbitMQ Quorum Queues, RocketMQ DLedger) vs Quorum Storage Replication (BlazingMQ) vs Term-scoped unlogged table leader election (River) vs Broker-side failover (Redis Sentinel, PostgreSQL Patroni/Streaming Replication).

### 6. Universal Empirical Knowledge Units (EKUs)

Formulate 12–15 universal, atomic, testable Empirical Knowledge Units (EKUs) with complete schema metadata:
- `id`, `category`, `atomicStatement`, `applicabilityConstraints`, `mechanisms`, `evidenceGrounds`, `failureModes`, `counterexamples`, `corpusStats`

### 7. Evidence-Constrained Architecture Blueprint

Produce a concrete, production-ready implementation blueprint for an autonomous coding agent, specifying:
- Storage schema (database tables or broker keys with cluster hash-tags)
- Exact state machine transitions
- Pseudocode / production-ready SQL/Lua scripts for atomic dequeue, token-fenced completion, and crash recovery

---

## Required Deliverables

1. Machine-readable EKU JSON store: `eku_store/synthesized_queue_ekus.json`
2. Claim falsification matrix: `eku_store/claim_matrix.json`

Narrative synthesis reports, benchmark interpretation, and unresolved-gap summaries should be compacted under `benchmark/` rather than added as canonical files under `eku_store/`.
