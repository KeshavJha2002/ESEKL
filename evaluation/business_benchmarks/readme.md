# Business-Abstraction Benchmark Suite

This directory defines canonical non-technical business prompts that evaluate whether the Empirical Software Engineering Knowledge Layer (ESEKL) empowers AI coding agents when the user does not know which low-level mechanisms to ask for.

---

## Why This Benchmark Matters

Most technical evaluations present explicit requirements (e.g. "implement token-fenced leases using PostgreSQL SKIP LOCKED with exponential backoff"). In real-world software engineering, business stakeholders communicate high-level guarantees and product needs:

> "We need to process payments, document signings, and partner webhooks reliably. It must never charge a customer twice, must not drop jobs when we deploy, and support must be able to audit any transaction."

This benchmark evaluates an agent's ability to:

1. **Bridge business demands to architectural contracts**: Infer required state machines, ownership tokens, and storage boundaries without prompting.
2. **Surface "What Not To Promise"**: Proactively warn product managers about false guarantees (e.g. true "exactly-once" over external networks, constant latency during unmetered spikes).
3. **Isolate second-order failure domains**: Separate transient application errors from unhandled process crashes and poison payloads.
4. **Avoid mechanism dumping**: Apply empirical evidence with precision rather than listing unrelated broker features.

---

## Prompt Variants

| Variant | File | Description |
|---|---|---|
| Variant 1 (Technical-Business Bridge) | [`critical_async_operations_prompt.md`](./critical_async_operations_prompt.md) | Evaluates translation of business scenarios with named technical problem areas |
| Variant 2 (Clean Blind Business Outcomes) | [`blind_business_outcomes_prompt.md`](./blind_business_outcomes_prompt.md) | Pure stakeholder requirements (financial integrity, support auditability, enterprise surge isolation, zero-downtime deploy safety) with zero queue, lease, worker, clock drift, or backpressure mechanism cues |

---

## Negative Control Fixtures

To prove that the rubric and scorer cannot be passed by verbosity, mechanism name-dropping, or generic executive summaries, automated negative controls in `negative_controls/` can be evaluated against [`business_abstraction.json`](../scorers/rubrics/business_abstraction.json):

| Negative Control Archetype | File | Expected Behavior |
|---|---|---|
| Polished generic executive summary | [`polished_generic_negative_control.md`](./negative_controls/polished_generic_negative_control.md) | Penalized for missing concrete failure triggers and fenced domain contracts |
| Superficial mechanism dumping | [`mechanism_dumping_negative_control.md`](./negative_controls/mechanism_dumping_negative_control.md) | Penalized for listing broker features without business translation |
| Synthesized architecture without evidence | [`synthesized_no_evidence_negative_control.md`](./negative_controls/synthesized_no_evidence_negative_control.md) | Penalized for over-promising impossible guarantees with no empirical constraints |

---

## Benchmark Files

| File | Description |
|---|---|
| [`critical_async_operations_prompt.md`](./critical_async_operations_prompt.md) | Variant 1 Prompt (Technical-Business Bridge) |
| [`blind_business_outcomes_prompt.md`](./blind_business_outcomes_prompt.md) | Variant 2 Prompt (Clean Blind Business Outcomes) |
| [`business_abstraction.json`](../scorers/rubrics/business_abstraction.json) | Quantitative evaluation rubric and hidden keys |
| [`blind_rerun_protocol.md`](../../benchmark/blind_rerun_protocol.md) | Step-by-step blind rerun instructions for future sessions |
| [`negative_controls/`](./negative_controls) | Verified negative control fixtures |
| [`message_queue_evaluation_summary.md`](../../benchmark/message_queue_evaluation_summary.md) | Historical evaluation summary |
