# High-Assurance Architecture Design: Asynchronous Task Foundation

## 1. Core Architectural Contracts
- **Fenced Outbox & Domain Result Promotion**: All authoritative business updates, ledger entries, and transactional outbox records must be guarded by an explicit generation token. When a paused worker resumes after a GC pause, its stale write must affect 0 rows and be rejected by the database.
- **Storage-Side Time Boundary**: Production lease expiration and stalled job recovery queries must use database server time (`clock_timestamp()`) and reject caller-supplied VM timestamps to prevent clock drift and NTP skew from triggering premature recovery.
- **Distinct Delivery vs Failure Counters**: The system must track attempts-started separately from application handler failures and worker-loss/stalled events. Hard crashes (SIGKILL/OOM) must be incremented at claim time and route toward dead-letter quarantine.
- **Poison Payload Isolation**: Unrecoverable parsing crashes and corrupt payloads must immediately bypass scheduler stall exemptions and route directly to dead-letter quarantine.
- **Bounded Admission Waiters**: Concurrency semaphores must enforce hard limits on waiting requests, failing fast with HTTP 503 / SYSTEM_BUSY during storage stalls to prevent memory exhaustion.
- **Decoupled Shutdown Deadlines**: In-flight worker jobs drain within a 30s timeout while TCP client sockets close within 2s, and background lease renewers terminate on task interrupt.

## 2. Failure Scenarios & Edge Cases
- Worker GC pause causes lease expiry; replacement worker finishes; original worker's write is rejected with 0 rows mutated.
- VM clock drifts by 60 seconds; storage server time ensures recovery schedule is unchanged.
- Worker process crashes before handler runs; attempt incremented at claim time counts toward DLQ.
- Storage disk stall causes waiter queue overflow; admission semaphore fails fast returning SYSTEM_BUSY.

## 3. Validation Tests
- Step VM clock +/- 60s while keeping DB clock fixed; assert recovery schedule unchanged.
- Inject split-brain worker delay; assert duplicate domain write rejected with 0 rows.
- Send SIGKILL during processing; assert attempt counted toward DLQ.
- Saturate queue during disk stall; assert server rejects with HTTP 503.

## 4. What Not To Promise
- Never promise true exactly-once over external networks without partner idempotency keys.
- Never promise infinite retries for unparseable poison payloads.
- Never promise constant latency during unmetered load spikes.
