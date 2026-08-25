# Message Queue Evaluation Summary

This is the only retained summary of the earlier message_queue evaluation runs. The raw per-condition responses, scorecards, dashboards, run indexes, and temporary evidence packets were intentionally removed from the release tree.

The summary is useful as product/research context, not as a mechanical release gate. Current gates are the evidence validator, MCP contract tests, scorer fixtures, and future preregistered benchmark runs.

## Compared Conditions

The historical runs compared three access patterns:

- `baseline_general`: model relied on general knowledge only.
- `baseline_repo_access`: model could inspect the underlying source repositories directly.
- `esekl_mcp`: model used structured ESEKL evidence through EKUs, claims, failure chains, and retrieval tools.

## Retained Result Table

| Scenario | Baseline General | Baseline Repo Access | ESEKL MCP | ESEKL vs Repo | Main Driver |
|---|---:|---:|---:|---:|---|
| Multi-region maintenance sweeper | 2.50 | 8.35 | 8.97 | +0.62 | Storage-time recovery and poison crash isolation. |
| Multi-tenant IoT telemetry quotas | 2.62 | 5.47 | 6.60 | +1.13 | Credit-based ingestion backpressure and fast rejection. |
| Collaborative canvas rendering | 1.50 | 7.60 | 7.22 | -0.38 | Atomic lease transitions and speculative rollback; direct repo access retained a small substrate-detail advantage. |
| Global settlement and payout engine | 1.89 | 6.21 | 8.82 | +2.61 | Fenced outbox commits and storage-time lease recovery. |
| Multi-tenant operations platform | 1.89 | 6.21 | 8.82 | +2.61 | Fenced outbox commits and storage-time lease recovery. |
| Customer operations startup assignment | 3.78 | 6.49 | 8.82 | +2.33 | Fenced outbox commits and storage-time lease recovery. |
| Blind business outcomes, de-leaked v4 | 2.64 | 8.38 | 8.82 | +0.44 | Fenced outbox commits and storage-time lease recovery. |

Aggregate across the seven retained scenarios:

- `baseline_general` average: 2.40 / 10.0.
- `baseline_repo_access` average: 6.96 / 10.0.
- `esekl_mcp` average: 8.30 / 10.0.
- Average ESEKL advantage over direct repo access: +1.34.
- ESEKL outscored direct repo access in 6 of 7 scenarios.
- Direct repo access won one scenario where concrete substrate details mattered more than already-promoted abstractions.

## Interpretation

The useful signal was not longer answers or more citations. Structured empirical knowledge improved early recall of operational constraints that changed design decisions:

- stale ownership must not authorize finalization, domain result promotion, or outbox emission;
- lease recovery should rely on authoritative storage time rather than worker-local clocks;
- attempts-started, handled failures, and worker-loss/stall counters encode different guarantees;
- scheduler-specific retry exemptions can turn poison payloads into unbounded loops;
- storage stalls need bounded admission waiters and explicit fast rejection;
- shutdown must separate worker drain, lease-renewal lifecycle, and broker socket deadlines.

## Gap Loop Outcome

Direct repository inspection exposed several details missing from earlier ESEKL packets. Those gaps were classified as missing observations, overly compressed observations, missing failure chains, retrieval failures, and abstractions that hid applicability conditions.

The gap loop led to promotion of:

- `EKU-QUEUE-015`: fenced domain result promotion and outbox emission;
- `EKU-QUEUE-016`: authoritative storage-time lease recovery;
- `EKU-QUEUE-017`: separate attempt, failure, and worker-loss counters;
- `EKU-QUEUE-018`: poison payload isolation from repeatable stall exemptions;
- `EKU-QUEUE-019`: bounded admission waiters and explicit storage stall rejection;
- `EKU-QUEUE-020`: decoupled worker-drain and broker-socket shutdown contracts.

## Removed Artifacts

The following were historical evaluation artifacts and should not be restored as product files:

- per-run `evaluation/runs/*` directories;
- raw condition responses;
- generated scorecards and dashboards;
- duplicated `evaluation/results/*` reports;
- old run index files;
- historical tool logs;
- compact static evidence packets used before MCP tooling existed.

Reusable evaluation machinery remains in `evaluation/scorers/`, `evaluation/business_benchmarks/`, `evaluation/gap_workflow/`, and `evaluation/templates/`.
