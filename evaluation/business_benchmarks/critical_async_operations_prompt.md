# Canonical Business Benchmark: Critical Asynchronous Operations Foundation

## Role

You are a Principal Systems and Product Architect designing a reusable, company-wide foundation for asynchronous critical customer operations across multiple business products (e.g. payment settlement, legal document PDF generation and signing, partner webhook sync, fraud risk triggers, customer notifications).

---

## Business Requirements

1. **Trustworthy Completion and Deduplication**:
   - Customer transactions must never be executed twice or lost silently.
   - External partner API timeouts or retries must not result in duplicate customer charges or double fulfillment.

2. **Operational Explainability and Auditability**:
   - Customer support engineers and compliance auditors must be able to trace exactly what happened to any customer operation at any timestamp.
   - Dead-letter and error workflows must record the exact reason for failure without requiring raw server log inspection.

3. **Spike Resistance and Fair Capacity**:
   - Bulk spikes from large enterprise customers (e.g. 50,000 document batch generation at 9am) must not starve real-time interactive tasks (e.g. instant single-item fraud checks).
   - If the backend storage or database experiences stalls, the platform must protect itself without crashing or running out of memory.

4. **Deploy-Safe Rolling Upgrades**:
   - Deploying new application versions must never leave in-flight tasks in an ambiguous, locked, or orphaned state.
   - Long-running operations (e.g. 2-minute large document rendering) must either complete cleanly during shutdown or safely resume on the new version without double-executing completed sub-steps.

5. **Clear Stakeholder Contracts and Boundaries**:
   - Define explicitly what the platform guarantees to product teams and **What Not To Promise** to executive leadership or customers.

---

## Expected Deliverables

Your architecture proposal must provide:

1. **Product architecture and execution model**: Core components, state machines, and data stores.
2. **Core architectural contracts and invariants**: Explicit pre-conditions, post-conditions, and ownership fences.
3. **Failure scenarios and edge cases**: Detailed step-by-step failure sequences (worker crashes, network timeouts, clock drift, poison data).
4. **Verification and testing strategy**: Concrete adversarial test recipes to validate the contracts.
5. **"What Not To Promise" stakeholder boundaries**: Explicit caveats and anti-patterns that product managers must not promise to customers.
