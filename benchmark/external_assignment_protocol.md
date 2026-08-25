# External Assignment Benchmark and Evaluation Protocol

**Version**: `1.0.0-beta`
**Governing Standard**: Empirical Isolation, Fair Baseline Comparison, and Epistemic Honesty
**Target Benchmark**: Realistic Product / Startup System Design Assignments

---

## Purpose and Scope

This protocol establishes the scientific evaluation procedure for benchmarking AI agents on realistic software engineering design assignments under three rigorously isolated conditions.

---

## The 3 Benchmark Conditions

| Condition | Allowed | Prohibited |
|---|---|---|
| **1. Generic foundation model baseline** | Model pre-trained weights + general web search | Direct `factory/` codebase access, `eku_store/`, MCP tools |
| **2. Direct raw repository access** | Web search + direct exploration of `factory/*` (13 repos) | `eku_store/`, synthesized EKUs, ESEKL MCP server |
| **3. ESEKL MCP condition** | Web search + ESEKL MCP server tools over stdio / JSON-RPC | Direct `eku_store/` browsing, direct `factory/*` browsing, `evaluation/` scoring rubrics |

---

## Prompt Design and De-Leaking Rules

1. **Neutral business formulation**: The prompt must describe product requirements, user experiences, and operational SLAs using domain terminology (e.g. "financial reconciliation", "multi-tenant batch ingestion", "webhook retries").
2. **Zero mechanism leaks**: Prompts must never mention queues, leases, fencing tokens, SKIP LOCKED, Redis Lua scripts, River, BullMQ, Raft, or ideal architecture solutions.

---

## Required Run Artifacts and Pre-Registration Gate

Before any model receives the assignment prompt, the benchmark must be **pre-registered** by creating `preregistration.md` (or `preregistration.json`) using [`evaluation/templates/benchmark_preregistration.md`](../evaluation/templates/benchmark_preregistration.md).

Every benchmark run directory under `evaluation/runs/<run-id>/` must persist:

| # | Artifact | Description |
|---|---|---|
| 0 | `preregistration.md` | Sealed rubric, prompt hash, and weights pre-registered prior to agent execution |
| 1 | `prompts/` | Exact prompt markdown delivered to the agents |
| 2 | `raw_responses/` | Complete, unedited responses from each access condition with YAML frontmatter headers |
| 3 | `tool_logs/` | Full raw transcript of JSON-RPC MCP requests and responses (`esekl_mcp.jsonl`) captured via `--log-jsonrpc` |
| 4 | `telemetry_notes.md` | Epistemic telemetry classification: tool call count, time to first failure mode, token consumption, filesystem reads |
| 5 | `scorecards/` | Per-run automated scorecards (`score_response.py`) and Feynman gap regression output (`feynman_gap_regression.json`) |
| 6 | `artifacts_manifest.json` | Cryptographic manifest with SHA-256 checksums for every artifact |

---

## Stopping Rules and Iteration Budget

1. **First-response scoring**: Every condition is scored on its initial architectural proposal.
2. **Bounded follow-up steering**: If a condition fails critical invariants, it may receive up to 2 subtle clarification prompts (e.g. *"What happens if a worker pauses for 45s during external payment settlement?"*). Prompts must not suggest the implementation fix.
3. **Budget limit**: Iterations cease after 2 steering turns or when the token budget exceeds 30k tokens.

---

## Evaluation Metrics and Anti-Goodhart Principle

Responses are scored on:

| Dimension | Description |
|---|---|
| Foundational mutation contracts | Fenced promotion, generation checks, atomic state transitions |
| Authoritative lease recovery | Storage-side clock evaluation, clock drift defenses |
| Crash and poison isolation | Separated retry counters, SIGKILL recovery, dead-letter quarantine |
| Storage saturation defense | Bounded semaphores, fast HTTP 503 shedding |
| What NOT to promise | Explicit operational boundaries and non-guarantees |

> [!CAUTION]
> **Anti-Goodhart Rule**: Merely citing more EKU IDs, dropping names of repositories, or writing longer generic prose is awarded **0 points**. Points are awarded strictly for concrete, enforceable architectural contracts and test procedures.
