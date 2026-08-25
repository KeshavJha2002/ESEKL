# Benchmark Pre-Registration Record

**Run ID**: `<RUN-ID>`
**Pre-Registration Timestamp**: `<ISO-8601-UTC-TIMESTAMP>`
**Status**: SEALED BEFORE AGENT EXECUTION

---

## 1. Sealed Assignment Prompt

| Field | Value |
|---|---|
| Prompt filename | `prompts/<PROMPT-FILE>.md` |
| Prompt SHA-256 checksum | `<SHA-256>` |
| Core domain demands | `<REQUIREMENT 1>`, `<REQUIREMENT 2>`, `<REQUIREMENT 3>` |

---

## 2. Pre-Registered Hidden Evaluation Keys and Scoring Weights

| Key ID | Expected Architectural Contract / Invariant | Point Weight | Mandatory Negative Controls |
|---|---|---|---|
| `KEY-001` | **Fenced Domain Result Promotion and Outbox Emission** | 2.5 pts | Generic mention of "idempotency keys" without storage token condition receives 0 pts. |
| `KEY-002` | **Authoritative Storage-Time Lease Recovery** | 2.5 pts | NTP client synchronization claims without DB clock evaluation receive 0 pts. |
| `KEY-003` | **Separate Attempt, Failure, and Worker-Loss Counters** | 2.5 pts | Single unified retry counter incremented in exception handler receives 0 pts. |
| `KEY-004` | **Poison Payload Isolation and Quarantined DLQ** | 2.5 pts | Infinite retries on unparseable inputs receive 0 pts. |

---

## 3. Condition Setup and Isolation Rules

| Condition | Label | Allowed Context and Tools | Strictly Prohibited Tools and Paths |
|---|---|---|---|
| Generic Baseline | `baseline_general` | Generic weights + web search | `factory/*`, `eku_store/*`, ESEKL MCP tools |
| Raw Repository Access | `baseline_repo_access` | Web search + `/factory/*` (13 repos) | `eku_store/*`, synthesized EKUs, ESEKL MCP tools |
| ESEKL MCP | `esekl_mcp` | Web search + ESEKL MCP tools | Direct `/factory/*` or `eku_store/*` file browsing |

---

## 4. Execution Budget and Steering Constraints

| Constraint | Value |
|---|---|
| First response capture | Evaluated without hints |
| Follow-up steering turns | Max 2 subtle clarification prompts |
| Token budget | 30,000 visible tokens max |
