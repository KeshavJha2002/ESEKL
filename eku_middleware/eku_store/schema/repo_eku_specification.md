# ESEKL Repo-Local EKU (RepoEKU) Specification

This document defines the formal data model, validation rules, and lifecycle contracts for **Repo-Local Empirical Knowledge Units (`RepoEKU`)** within the Empirical Software Engineering Knowledge Layer (ESEKL).

---

## 1. Architectural Purpose and Layer Boundary

`RepoEKU` serves as the concrete, evidence-bearing intermediate layer between atomic code observations (`OBS-*` / `HIST-*`) and cross-corpus domain abstractions (`DomainEKU`):

```text
Tier 0: Raw Codebase (factory/<repo>)
  └── Provenance: Git commit history, AST definitions, test suites

Tier 1: Atomic Observations (eku_store/evidence/observations.json)
  └── Format: Exact file path, line range, verbatim code snippet, language, substrate

Tier 2: Repo-Local EKUs (eku_store/repo_ekus/<repo>.json)
  └── Format: Concrete mechanism, source snippet, test provenance, failure provenance
  └── Epistemic Status: REPO_LOCAL (SOURCE_OBSERVED / TEST_OBSERVED / HISTORY_SUPPORTED)

Tier 3: Cross-Corpus Domain EKUs (eku_store/synthesized_queue_ekus.json)
  └── Format: Cross-repository abstraction, behavioral invariant, design contract
  └── Up-Traceability: Cites supportedByRepoEkus, alternativeMechanismRepoEkus, counterexamples
```

---

## 2. Core Fields and Data Schema

Each RepoEKU record in `eku_store/repo_ekus/<repo>.json` adheres to [`eku_store/schema/repo_eku_schema.json`](./repo_eku_schema.json):

| Field | Type | Description | Mandatory |
|---|---|---|---|
| `id` | string | Unique identifier matching `^REKU-[A-Z0-9_-]+-\d+$` (e.g. `REKU-RIVER-001`) | Yes |
| `repository` | string | Registered repository identifier in `corpus_manifest.json` | Yes |
| `domain` | string | Target problem domain | Yes |
| `substrate` | enum | `postgres` \| `redis` \| `sqlite` \| `memory` \| `file` \| `raft` \| `amqp` \| `native` | Yes |
| `objectType` | enum | `BEHAVIORAL_INVARIANT` \| `IMPLEMENTATION_PATTERN` \| `FAILURE_RECOVERY_MECHANISM` | Yes |
| `claim` | string | Precise mechanical statement of what this repository mechanism guarantees | Yes |
| `mechanism` | string | Technical mechanism name (e.g. Relational Lock-Free Dequeue) | Yes |
| `applicabilityConditions` | string[] | Substrate and runtime requirements (non-empty list) | Yes |
| `evidenceIds` | string[] | Array of valid `OBS-*` or `HIST-*` identifiers (non-empty list) | Yes |
| `commonKeywords` | string[] | Cross-cutting facet keywords (many-to-many, non-empty list) | Yes |
| `uniqueKeywords` | string[] | Repo-specific tokens preserving implementation nuance (non-empty list) | Yes |
| `keywordFacets` | object | Standardized taxonomy dictionary across dimensions (`concurrencyControl`, `stateStorage`, `ownershipModel`, `failureRecovery`, `scheduling`, `shutdownDrain`, `substrate`) | Recommended |
| `localContext` | string | Detailed explanation of why the mechanism was selected (min 10 chars) | Yes |
| `linkedDomainEkus` | string[] | Array of domain EKU IDs (`EKU-QUEUE-*`) supported by this unit | Yes |
| `linkedClaims` | string[] | Array of domain claim IDs (`CLM-*`) supported by this unit | Yes |
| `sourceProvenance` | object | `{ filePath, lineRange: [start, end], queryOrCodeSnippet }` | Required if `SOURCE_OBSERVED` |
| `testProvenance` | object | `{ filePath, testName }` | Required if `TEST_OBSERVED` |
| `historyProvenance` | object | `{ commitHash, failureId, prOrIssue, fixDescription }` | Optional |
| `epistemicLabels` | enum[] | `["SOURCE_OBSERVED", "TEST_OBSERVED"]` | Yes |
| `abstractionLevel` | string | Must be `"REPO_LOCAL"` | Yes |
| `status` | enum | `ACTIVE` \| `DEPRECATED` \| `PROMOTED_TO_DOMAIN` | Yes |

---

## 3. Ingestion Templates and Guidelines

When authoring new RepoEKUs, use the templates provided in [`eku_store/templates/`](../templates/):

- [`repo_eku_entry.template.json`](../templates/repo_eku_entry.template.json)
- [`keyword_facet_group.template.json`](../templates/keyword_facet_group.template.json)
- [`ingestion_checklist.md`](../templates/ingestion_checklist.md)

---

## 4. Validation and Environment Setup

Structural validation is strictly driven by [`repo_eku_schema.json`](./repo_eku_schema.json) via Python's standard `jsonschema` library.

```bash
# Install validator dependencies in a fresh environment
pip install -r requirements.txt

# Run full ledger and schema verification
python3 analyzer/validate_evidence_ledger.py

# Run the clean-environment virtualenv smoke test
bash scripts/python_validation_smoke.sh
```
