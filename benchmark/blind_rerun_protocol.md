# Protocol: Blind Business-Abstraction Benchmark Execution

This document specifies the exact protocol to run a fair, isolated, three-condition empirical evaluation on the canonical **Blind Business Benchmark (Variant 2)**.

---

## Isolation and Boundary Rules

To ensure evaluation validity, each condition must operate under strict source boundaries.

### 1. Generic Baseline

| Field | Value |
|---|---|
| Model | High-capability frontier LLM |
| Context | System prompt + `blind_business_outcomes_prompt.md` |
| Tools | None — no file reading, web search, or repo access |
| Allowed knowledge | Internal pre-trained parameters only |

### 2. Raw Repository Access

| Field | Value |
|---|---|
| Model | High-capability frontier LLM |
| Context | System prompt + `blind_business_outcomes_prompt.md` |
| Tools | `grep_search`, `view_file`, `find_by_name`, `run_command` restricted to `factory/*` |
| Disallowed | Access to `eku_store/*` or `evaluation/*` |

### 3. ESEKL MCP

| Field | Value |
|---|---|
| Model | High-capability frontier LLM |
| Context | System prompt + `blind_business_outcomes_prompt.md` + ESEKL MCP tool access |
| Tools | ESEKL MCP calls and web search |
| Disallowed | Direct repo access or raw code browsing |

---

## Execution Steps

1. **Create run directory**:
   ```bash
   RUN_ID="$(date +%Y-%m-%d)-business-blind-rerun"
   mkdir -p "evaluation/runs/$RUN_ID"/{prompts,raw_responses,scorecards}
   cp evaluation/business_benchmarks/blind_business_outcomes_prompt.md "evaluation/runs/$RUN_ID/prompts/blind_prompt.md"
   ```

2. **Dispatch conditions blind**: Deliver [`blind_business_outcomes_prompt.md`](../evaluation/business_benchmarks/blind_business_outcomes_prompt.md) to all 3 isolated contexts in parallel.
   *(For the technical bridge variant, use [`critical_async_operations_prompt.md`](../evaluation/business_benchmarks/critical_async_operations_prompt.md) with run slug `<date>-business-bridge-run`.)*

3. **Save verbatim responses**:
   - `evaluation/runs/$RUN_ID/raw_responses/baseline_general.md`
   - `evaluation/runs/$RUN_ID/raw_responses/baseline_repo_access.md`
   - `evaluation/runs/$RUN_ID/raw_responses/esekl_mcp.md`
   - Include standard YAML frontmatter headers in each file.

4. **Run hardened mechanical scorer**:
   ```bash
   python3 evaluation/scorers/score_response.py \
     --hidden-key evaluation/scorers/rubrics/business_abstraction.json \
     --response evaluation/runs/$RUN_ID/raw_responses/esekl_mcp.md \
     --output-json evaluation/runs/$RUN_ID/scorecards/esekl_mcp_scorecard.json \
     --output-md evaluation/runs/$RUN_ID/scorecards/esekl_mcp_scorecard.md
   ```

5. **Run Feynman gap regression**:
   ```bash
   python3 evaluation/gap_workflow/run_gap_regression.py \
     --response evaluation/runs/$RUN_ID/raw_responses/esekl_mcp.md \
     --output-json evaluation/runs/$RUN_ID/scorecards/feynman_gap_regression.json
   ```

6. **Verify validator gate**:
   ```bash
   python3 analyzer/validate_evidence_ledger.py
   ```
