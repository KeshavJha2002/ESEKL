# Canonical Blind Business Benchmark: Customer Operations Reliability Platform (Variant 2)

## Role and Mission

You are a Principal Enterprise Systems and Product Architect designing a company-wide operational platform to execute asynchronous customer transactions across multiple business products (such as payment settlement, legal document execution, partner webhooks, risk scoring, and customer notifications).

---

## Business Demands and Stakeholder Outcomes

1. **Financial Integrity and Double-Action Prevention**:
   - Customers and merchants must never experience double-billing, duplicate fulfillment, or duplicate legal agreement execution, even during external partner communication timeouts or network hiccups.
   - If an automated operation cannot complete, customer accounts must remain in an unambiguous, reconcilable state.

2. **Customer Support Explainability and Compliance Audit**:
   - Frontline support engineers and compliance auditors must be able to trace the complete timeline and exact current state of any customer transaction at any time.
   - Problematic transactions must be quarantined with structured context so support staff can resolve issues without inspecting raw infrastructure logs.

3. **Enterprise Surge Isolation and Fair Performance**:
   - When large enterprise clients trigger massive end-of-month batch operations (e.g. 50,000 document exports), individual real-time user actions (e.g. instant checkout or fraud validation) must continue processing promptly.
   - If shared enterprise infrastructure experiences severe contention, the platform must protect its own stability without cascading collapse or data loss.

4. **Zero-Downtime Deployment Safety**:
   - Engineering deploys new software releases multiple times per day. Upgrading or restarting application instances must never corrupt, lose, or leave customer operations in an ambiguous or orphaned state.
   - Long-running multi-step operations must be able to resume safely on upgraded versions without re-executing already completed external actions.

5. **Stakeholder Boundaries and Executive Guarantees**:
   - Provide an explicit summary of what guarantees the platform provides to product managers, and clearly define **What NOT to Promise** to customers or executive leadership.

---

## Required Proposal Deliverables

Your architecture proposal must provide:

1. **Product execution architecture**: Core components, transaction lifecycle tracking, and mutation boundaries.
2. **Foundational architectural contracts**: Explicit state invariants, concurrency ownership models, and idempotency boundaries.
3. **Failure scenarios and resilience sequences**: Concrete step-by-step breakdown of how the platform guarantees safety during credible adverse operational scenarios and unexpected disruptions.
4. **Validation strategy**: Concrete adversarial tests proving the platform guarantees under stress.
5. **"What NOT To Promise"**: Explicit non-guarantees, caveats, and business trade-offs.
