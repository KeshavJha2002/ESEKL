# ESEKL Model Context Protocol (MCP) Demo and Benchmark Scope

**Version**: `1.0.0`
**Status**: APPROVED EXPERIMENTAL PROTOCOL
**Governing Standard**: Epistemic Isolation and Tool-Mediated Retrieval

---

## Purpose and Scope

This document governs how the Empirical Software Engineering Knowledge Layer (ESEKL) is demonstrated and evaluated on realistic startup assignments, coding tasks, and external engineering evaluations.

---

## Agent Access and Boundary Policy

When evaluating AI coding or planning agents under the **ESEKL-MCP** condition:

```text
               +-------------------------------+
               |    AI Coding / Planning Agent |
               +---------------+---------------+
                               | Standard JSON-RPC / stdio
                               v
               +-------------------------------+
               |     esekl-mcp Server Tools    |
               +---------------+---------------+
                               | Progressive Disclosure & Epistemic Filter
                               v
+-------------------------------------------------------------+
| ESEKL Ground Truth Store (Internal / No Direct File Access) |
|  +-- eku_store/synthesized_queue_ekus.json                  |
|  +-- eku_store/claim_matrix.json                            |
|  +-- eku_store/evidence/observations.json                   |
|  +-- eku_store/evidence/historical_failures.json            |
|  +-- eku_store/<repo>/dossier_*.json                        |
+-------------------------------------------------------------+
```

### Allowed Access

1. **Registered MCP tools only**: `get_capabilities`, `list_dossiers`, `get_dossier_summary`, `list_research_threads`, `get_dossier_slice`, `compare_engines`, `search_evidence`, `get_eku`, `get_failure_patterns`, `explain_provenance`, `compare_design_against_evidence`, `generate_verification_plan`.
2. **Standard stdio interface**: Interaction occurs via JSON-RPC 2.0.

### Strictly Disallowed Access in ESEKL Condition

| Disallowed Action | Reason |
|---|---|
| Direct filesystem browsing of `eku_store/` | Agents must not use `view_file` or `list_dir` on `eku_store/` or internal summary files |
| Direct inspection of `evaluation/` | Hidden benchmark rubrics and evaluation rubrics must never be exposed in prompts or tool responses |
| Direct browsing of `factory/` | In the pure ESEKL-MCP condition, raw code search in `factory/` is prohibited (direct repo access is reserved exclusively for Condition B baselines) |

---

## Required Artifacts and Run Logging

Every benchmark or demo execution must persist:

| # | Artifact | Description |
|---|---|---|
| 1 | `prompts/` | Exact prompt markdown delivered to the agent |
| 2 | `raw_responses/` | Complete untruncated model responses with YAML frontmatter headers (`agent`, `condition`, `started_at`, `completed_at`, `mcp_tool_calls`) |
| 3 | `tool_logs/` | Full raw transcript of JSON-RPC MCP requests and responses (`tool_logs/*.jsonl`) captured via `--log-jsonrpc`. For historical runs where raw JSON-RPC frames were not captured live, a `tool_logs/readme.md` must clearly disclose the reconstructed status. |
| 4 | `scorecards/` | Automated and human scorecards generated with `evaluation/scorers/score_response.py` |
| 5 | `artifacts_manifest.json` | Manifest tracking all run artifacts with SHA-256 checksums |

---

## Running the Local Demo

```bash
# Run the interactive 5-step terminal demo
npm run demo --prefix eku_middleware

# Run protocol smoke tests and semantic quality fixtures
npm test --prefix eku_middleware
```
