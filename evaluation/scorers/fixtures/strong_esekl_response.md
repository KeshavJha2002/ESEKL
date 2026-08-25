# Architecture Contract: Enterprise Critical Asynchronous Operations Foundation

## 1. Core Architectural Contracts & Invariants
- **Atomic Dequeue & Claim Contract** (`CLM-001` / `EKU-QUEUE-001`): Workers claim tasks using `SELECT ... FOR UPDATE SKIP LOCKED` inside a transaction that atomically increments `attempts_started` and establishes an authoritative lease.
- **Fenced Domain Result Promotion** (`CLM-015` / `EKU-QUEUE-015`): Authoritative domain ledger mutations and outbox emissions are guarded by execution generation tokens. When a paused worker resumes after GC pause, its write affects 0 rows and is rejected.
- **Authoritative Storage-Time Recovery** (`CLM-016` / `EKU-QUEUE-016`): Stalled task rescuer queries evaluate lease expiry using database server time (`clock_timestamp()`), rejecting caller-supplied timestamps to prevent VM clock skew anomalies.
- **Multi-Counter Failure Isolation** (`CLM-017` / `EKU-QUEUE-017`): System tracks `attempts_started`, `handled_application_failures`, and `worker_loss_stalls` independently. Hard crashes (SIGKILL/OOM) route to DLQ without waiting for application catch blocks.
- **Poison Payload DLQ Isolation** (`CLM-018` / `EKU-QUEUE-018`): Repeatable scheduler stall exemptions are explicitly bypassed for unrecoverable payload parsing crashes.
- **Bounded Admission Waiters** (`CLM-019` / `EKU-QUEUE-019`): Ingestion gateway enforces hard capacity limits on concurrency semaphores, failing fast with HTTP 429/503 (`SYSTEM_BUSY`) during database I/O stalls.
- **Decoupled Shutdown Lifecycle** (`CLM-020` / `EKU-QUEUE-020`): In-flight job drain deadlines (30s) are strictly decoupled from client socket termination timeouts (2s), with background renewers terminating on task interrupt.

## 2. Failure Scenarios & Edge Cases
- Worker GC pause triggers lease expiry; replacement worker finishes; original worker write rejected with 0 rows mutated.
- Worker VM clock drifts by 60 seconds; database server time ensures recovery schedule is unchanged.
- Hard worker crash (SIGKILL/OOM) before handler runs; attempt incremented at claim time routes to DLQ.
- Storage disk stall causes waiter queue overflow; admission semaphore fails fast within 200ms returning SYSTEM_BUSY.
- Rolling SIGTERM disconnects TCP socket in 2s while in-flight task drains in 30s.

## 3. Validation Tests
- Step VM clock +/- 60s while keeping DB clock fixed; assert recovery unchanged.
- Inject split-brain worker delay; assert duplicate domain write rejected with 0 rows.
- Send SIGKILL during processing; assert attempt counted toward DLQ.
- Saturate queue during disk stall; assert server rejects with HTTP 503 rather than memory leak.

## 4. What Not To Promise
- Never promise true exactly-once over external networks without partner idempotency keys.
- Never promise infinite retries for unparseable poison payloads.
- Never promise constant latency during unmetered load spikes.
