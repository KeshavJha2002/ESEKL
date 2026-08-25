# ESEKL Model Context Protocol (MCP) Agent Tool Contract

**Version**: `1.0.0-beta`
**Namespace**: `esekl` / `esekl-*`
**Architecture**: Progressive Disclosure, Epistemic Labeling, Evidence Down-Traceability

---

## Purpose and Agent Usage Model

The Empirical Software Engineering Knowledge Layer (ESEKL) MCP server turns distributed systems research into an interactive, agent-usable empirical engineering toolchain.

Rather than forcing AI coding/planning agents to browse large JSON/Markdown files or consume context-saturating repository dumps, this MCP contract provides **task-shaped, progressive disclosure tools** that enable agents to:

1. **Discover corpus affordances**: Learn what distributed domains and repository dossiers exist.
2. **Retrieve empirical ground truth**: Query behavioral invariants, solution families, implementation patterns, and historical failure modes.
3. **Audit engineering proposals**: Critique proposed system designs against verified cross-repository counterexamples and failure modes.
4. **Generate adversarial verification plans**: Formulate concrete test suites mapped directly to empirical evidence objects.
5. **Trace full provenance**: Inspect the exact source code files, line numbers, git commits, and test functions supporting any claim.

---

## Epistemic Labeling Taxonomy

Every high-level answer emitted by ESEKL tools is tagged with standard epistemic labels so the agent never confuses empirical observations with model inferences:

| Epistemic Label | Meaning and Source Boundary |
|---|---|
| `SOURCE_OBSERVED` | Direct mechanical inspection of production source code lines and AST structures. |
| `TEST_OBSERVED` | Direct execution or inspection of regression test suites in the target repository. |
| `HISTORY_SUPPORTED` | Verified real-world production incident, bugfix, or issue commit (`git cat-file -e`). |
| `DOCUMENTED` | Architecture documentation or official specification statement. |
| `MODEL_INFERRED` | High-level synthesis or generalization formulated across observations. |
| `CROSS_REPO_ABSTRACTION` | Universal or multi-engine behavioral property validated across >= 2 codebases. |
| `SYNTHESIZED_ADVICE` | Actionable architectural guidance derived from empirical invariants. |

---

## Complete MCP Tool Surface

```text
Discovery & Navigation:
  +-- get_capabilities()
  +-- list_dossiers(filter?, page?, pageSize?)
  +-- get_dossier_summary(repo)
  +-- list_research_threads()
  +-- get_dossier_slice(repo, sliceType, page?, pageSize?)
  +-- compare_engines(repoA, repoB, aspect?)

Evidence & Layered Retrieval:
  +-- search_evidence(query, filters?, limit?)
  +-- get_eku(eku_id)
  +-- list_repo_ekus(repo?, mechanism?, objectType?, limit?)
  +-- get_repo_eku(repo_eku_id)
  +-- list_keyword_groups(keyword?, facet?, commonOnly?, uniqueOnly?, limit?)
  +-- get_keyword_group(group_id)
  +-- trace_domain_eku(eku_id)
  +-- get_failure_patterns(problem_statement, filters?, limit?)
  +-- get_failure_chains(repo?, trigger?, limit?)
  +-- get_implementation_evidence(eku_id?, repo?, substrate?, mechanism?, limit?)
  +-- explain_provenance(evidence_id)

Design Critique & Verification:
  +-- compare_design_against_evidence(proposed_design, options?)
  +-- generate_verification_plan(requirement_or_design, options?)
```

---

## 1. Discovery and Navigation Tools

### `get_capabilities`

- **Description**: Returns the active knowledge layer capabilities, loaded domains, corpus size, total counts of EKUs, claims, observations, and supported search filters.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {}
  }
  ```
- **Output Schema**:
  ```json
  {
    "domain": "Queue, Broker & Streaming Systems",
    "corpusSize": 13,
    "repositories": ["asynq", "bullmq", "pgmq", "river", "goqite", "litequeue", "nats-server", "nsq", "blazingmq", "redpanda", "rabbitmq", "artemis", "rocketmq"],
    "totalEkus": 20,
    "totalRepoEkus": 15,
    "totalClaims": 20,
    "totalObservations": 30,
    "totalHistoricalFailures": 9,
    "repoEkuCoverage": {
      "repositoriesWithRepoEkus": ["asynq", "bullmq", "pgmq", "river", "litequeue", "nats-server", "redpanda"],
      "repositoriesPendingRepoEkus": ["goqite", "nsq", "blazingmq", "rabbitmq", "artemis", "rocketmq"],
      "coverageRatio": "7/13",
      "loadErrors": [],
      "epistemicStatus": "COVERAGE_METADATA"
    },
    "supportedFilters": ["repo", "abstractionLevel", "objectType", "status"],
    "layeredRetrievalTools": ["list_repo_ekus", "get_repo_eku", "list_keyword_groups", "get_keyword_group", "trace_domain_eku", "get_implementation_evidence"],
    "version": "5.0.0-consolidated"
  }
  ```

---

### `list_dossiers`

- **Description**: Lists all repository dossiers with summary metadata, language, architecture pattern, and evidence count.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "language": { "type": "string", "description": "Optional filter by programming language (e.g. 'go', 'typescript', 'rust', 'c++', 'java', 'erlang', 'sql')" },
      "storageEngine": { "type": "string", "description": "Optional filter by storage engine (e.g. 'redis', 'postgres', 'sqlite', 'disk', 'memory')" },
      "page": { "type": "integer", "default": 1 },
      "pageSize": { "type": "integer", "default": 10 }
    }
  }
  ```
- **Output Schema**:
  ```json
  {
    "total": 13,
    "page": 1,
    "pageSize": 10,
    "dossiers": [
      {
        "repo": "taskforcesh/bullmq",
        "language": "typescript",
        "storageEngine": "redis",
        "architectureStyle": "Leased Task Queue with Lua Atomic Scripts",
        "totalObservations": 5,
        "totalHistoricalFailures": 2,
        "summary": "Redis-backed distributed task queue using Lua script transactional boundaries, lock-token generation fencing, and two-phase stall rescue."
      }
    ]
  }
  ```

---

### `get_dossier_summary`

- **Description**: Returns a compact high-level summary of a specific repository dossier without dumping raw source files.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "repo": { "type": "string", "description": "Repository identifier (e.g. 'bullmq', 'river', 'pgmq', 'nats-server')" }
    },
    "required": ["repo"]
  }
  ```
- **Output Schema**:
  ```json
  {
    "repo": "riverqueue/river",
    "fullName": "riverqueue/river",
    "primaryLanguage": "go",
    "storageBackend": "PostgreSQL (pgx)",
    "keyMechanisms": [
      "SELECT FOR UPDATE SKIP LOCKED job reservation",
      "Two-phase JobRescuer periodic lease sweep",
      "Transactional outbox insertion within domain database transactions"
    ],
    "discoveredEdgeConditions": [
      "Job completion SQL historically lacked worker generation token check",
      "Periodic recovery query accepted caller-supplied timestamp parameter"
    ],
    "availableSlices": ["architecture", "state_machine", "lease_management", "failure_recovery", "concurrency_control"]
  }
  ```

---

### `list_research_threads`

- **Description**: Returns key cross-repository research themes and failure domains discovered across the corpus.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {}
  }
  ```
- **Output Schema**:
  ```json
  {
    "threads": [
      {
        "id": "thread-01-fencing",
        "title": "Generation Fencing & Domain Result Promotion",
        "summary": "How systems prevent superseded workers from committing side-effects after lease expiration.",
        "relatedEkus": ["EKU-QUEUE-002", "EKU-QUEUE-015"]
      },
      {
        "id": "thread-02-lease-time",
        "title": "Storage-Time vs Monotonic Clock Lease Recovery",
        "summary": "Pitfalls of caller-supplied now parameters vs authoritative storage timestamps.",
        "relatedEkus": ["EKU-QUEUE-003", "EKU-QUEUE-016"]
      },
      {
        "id": "thread-03-counter-isolation",
        "title": "Counter Isolation: Handler Errors vs Process Crashes",
        "summary": "Separation of retry attempts from SIGKILL/OOM worker crashes to prevent poison loops.",
        "relatedEkus": ["EKU-QUEUE-006", "EKU-QUEUE-017", "EKU-QUEUE-018"]
      },
      {
        "id": "thread-04-backpressure",
        "title": "Admission Control & Storage Stall Fast-Failure",
        "summary": "Protecting memory stability during downstream storage stalls.",
        "relatedEkus": ["EKU-QUEUE-007", "EKU-QUEUE-019"]
      }
    ]
  }
  ```

---

### `get_dossier_slice`

- **Description**: Returns a paginated, structured slice of a repository dossier for detailed technical examination.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "repo": { "type": "string", "description": "Repository identifier" },
      "sliceType": { "type": "string", "enum": ["architecture", "state_machine", "lease_management", "failure_recovery", "concurrency_control"] },
      "page": { "type": "integer", "default": 1 },
      "pageSize": { "type": "integer", "default": 5 }
    },
    "required": ["repo", "sliceType"]
  }
  ```
- **Output Schema**:
  ```json
  {
    "repo": "taskforcesh/bullmq",
    "sliceType": "lease_management",
    "page": 1,
    "pageSize": 5,
    "totalItems": 3,
    "content": [
      {
        "topic": "Two-Phase Stall Detection",
        "mechanism": "moveStalledJobsToWait.lua executes a two-phase mark-and-sweep using maxStalledCount",
        "evidenceId": "OBS-BULLMQ-004",
        "epistemicStatus": "SOURCE_OBSERVED"
      }
    ]
  }
  ```

### `compare_engines`

- **Description**: Compares two distributed engines side-by-side across architecture styles, storage engines, claims, and invariants.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "repoA": { "type": "string", "description": "First repository identifier (e.g. 'river')" },
      "repoB": { "type": "string", "description": "Second repository identifier (e.g. 'bullmq')" },
      "aspect": { "type": "string", "description": "Optional aspect filter (e.g. 'lease', 'concurrency', 'recovery')" }
    },
    "required": ["repoA", "repoB"]
  }
  ```
- **Output Schema**:
  ```json
  {
    "engineA": {
      "repo": "river",
      "primaryLanguage": "Go",
      "storageEngine": "PostgreSQL",
      "architectureStyle": "Relational Table Worker Queue"
    },
    "engineB": {
      "repo": "bullmq",
      "primaryLanguage": "TypeScript",
      "storageEngine": "Redis",
      "architectureStyle": "In-Memory Atomic Redis Lua Queue"
    },
    "claimMatrixComparison": [],
    "summary": "Comparison of river against bullmq"
  }
  ```

---

## 2. Evidence and EKU Retrieval Tools

### `search_evidence`

- **Description**: Searches the empirical knowledge layer across EKUs, claims, observations, and historical failures.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Search query terms (e.g. 'clock drift', 'lock token', 'SIGKILL', 'dead-letter queue', 'backpressure')" },
      "filters": {
        "type": "object",
        "properties": {
          "repo": { "type": "string" },
          "objectType": { "type": "string", "enum": ["BEHAVIORAL_INVARIANT", "SOLUTION_FAMILY", "IMPLEMENTATION_PATTERN"] },
          "epistemicType": { "type": "string", "enum": ["OBSERVATION", "HISTORICAL_FAILURE", "CLAIM", "EKU"] }
        }
      },
      "limit": { "type": "integer", "default": 5 }
    },
    "required": ["query"]
  }
  ```
- **Output Schema**:
  ```json
  {
    "query": "clock drift lease",
    "totalMatches": 4,
    "results": [
      {
        "id": "EKU-QUEUE-016",
        "type": "EKU",
        "title": "Authoritative Storage-Time Lease Recovery",
        "objectType": "BEHAVIORAL_INVARIANT",
        "relevanceScore": 0.95,
        "summary": "Lease and recovery queries must evaluate time at the authoritative storage boundary; caller-supplied now parameters reintroduce clock skew.",
        "epistemicLabel": "CROSS_REPO_ABSTRACTION"
      }
    ]
  }
  ```

---

### `get_eku`

- **Description**: Retrieves full structured details of a specific Empirical Knowledge Unit (EKU).
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "ekuId": { "type": "string", "description": "EKU ID (e.g. 'EKU-QUEUE-015')" }
    },
    "required": ["ekuId"]
  }
  ```
- **Output Schema**:
  ```json
  {
    "id": "EKU-QUEUE-015",
    "title": "Fenced Domain Result Promotion & Outbox Emission",
    "objectType": "BEHAVIORAL_INVARIANT",
    "claimId": "CLM-015",
    "problem": "A queue can fence stale completion of the job row while still allowing a superseded worker to write authoritative domain results or emit an outbox event.",
    "behavioralInvariant": "Ownership fencing must guard every authoritative side-effecting state mutation, including domain result promotion or outbox emission, not only queue-row completion.",
    "applicabilityConstraints": [
      "Applies when job execution produces authoritative business state, payment reconciliation state, or outbox messages."
    ],
    "supportingEvidence": ["OBS-BULLMQ-002", "OBS-LITEQUEUE-002"],
    "counterEvidence": ["OBS-ASYNQ-002", "OBS-PGMQ-002", "OBS-RIVER-006"],
    "historicalEvidence": ["HIST-RIVER-003"],
    "designContract": "Before committing a result row, payment ledger projection, or sendable outbox record, the storage transaction must prove current job ownership by token/generation.",
    "verificationContract": [
      "Worker A owns generation 1 and pauses.",
      "Worker B owns generation 2 and completes.",
      "Worker A attempts domain result promotion and queue completion.",
      "Both stale writes affect zero authoritative rows and emit stale-owner telemetry."
    ],
    "corpusStats": {
      "corpusSize": 13,
      "applicable": 7,
      "supports": 2,
      "alternativeMechanism": 2,
      "counterexamples": 3,
      "insufficientEvidence": 0,
      "notApplicable": 6
    }
  }
  ```

---

### `get_failure_patterns`

- **Description**: Queries recurring second-order failure patterns and vulnerability signatures.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "problemStatement": { "type": "string", "description": "Description of the operational domain or planned feature" },
      "filters": {
        "type": "object",
        "properties": {
          "severity": { "type": "string" },
          "repo": { "type": "string" }
        }
      },
      "limit": { "type": "integer", "default": 5 }
    },
    "required": ["problemStatement"]
  }
  ```
- **Output Schema**:
  ```json
  {
    "problemStatement": "Async payment settlement with external partner webhooks",
    "failurePatterns": [
      {
        "id": "HIST-RIVER-003",
        "title": "Unfenced Complete/Cancel Mutation Bug",
        "repo": "riverqueue/river",
        "commitHash": "d5eb922c2227d81a8b0e77d01e194fe9b78848d7",
        "failureMechanism": "Worker executing a stalled job could complete the job row after lease expiration because SQL query checked state='running' without worker generation token check.",
        "preventionContract": "Enforce generation token matching (WHERE id = $1 AND generation = $2) on every finalization query.",
        "epistemicLabel": "HISTORY_SUPPORTED"
      }
    ]
  }
  ```

### `get_failure_chains`

- **Description**: Retrieves structured causal failure chains tracing root trigger, intermediate invariant breakdown, and terminal failure mode across repositories.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "repo": { "type": "string", "description": "Filter by repository identifier (e.g. 'river')" },
      "trigger": { "type": "string", "description": "Filter by trigger keywords" },
      "hasRegressionTest": { "type": "boolean", "description": "Filter by regression test availability" },
      "limit": { "type": "integer", "default": 5 }
    }
  }
  ```
- **Output Schema**:
  ```json
  {
    "totalFound": 1,
    "limit": 5,
    "failureChains": [
      {
        "id": "FC-RIVER-001",
        "repository": "river",
        "trigger": "Stalled worker lease expiration during network partition",
        "intermediateBreakdown": "Re-assignment to second worker without generation increment",
        "terminalFailure": "Double execution and conflicting state finalization",
        "hasRegressionTest": true,
        "epistemicStatus": "HISTORY_SUPPORTED"
      }
    ]
  }
  ```

---

### `list_repo_ekus`

- **Description**: Returns a paginated list of concrete, evidence-bearing Repo-Local EKUs (`REPO_LOCAL`) with local context and source/test provenance.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "repo": { "type": "string", "description": "Filter by repository identifier (e.g. 'river', 'bullmq', 'litequeue')" },
      "mechanism": { "type": "string", "description": "Filter by mechanism keywords" },
      "objectType": { "type": "string", "enum": ["BEHAVIORAL_INVARIANT", "IMPLEMENTATION_PATTERN", "FAILURE_RECOVERY_MECHANISM"] },
      "page": { "type": "integer", "default": 1 },
      "pageSize": { "type": "integer", "default": 10 }
    }
  }
  ```
- **Output Schema**:
  ```json
  {
    "totalFound": 3,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1,
    "repoEkus": [
      {
        "id": "REKU-RIVER-001",
        "repository": "river",
        "domain": "Queue, Broker & Distributed Workflow Systems",
        "objectType": "IMPLEMENTATION_PATTERN",
        "claim": "PostgreSQL FOR UPDATE SKIP LOCKED allows concurrent worker pools to acquire non-overlapping available jobs without table-level locking.",
        "mechanism": "Relational Lock-Free Dequeue (FOR UPDATE SKIP LOCKED)",
        "applicabilityConditions": ["Requires PostgreSQL 9.5+ or compatible MVCC relational store."],
        "commonKeywords": ["skip_locked", "postgres", "row_locking"],
        "uniqueKeywords": ["riverpgxv5", "river_job_state_available"],
        "localContext": "River implements its primary job queue inside PostgreSQL. It relies on FOR UPDATE SKIP LOCKED in its sqlc query to scale Go worker goroutines.",
        "epistemicLabels": ["SOURCE_OBSERVED", "TEST_OBSERVED"],
        "abstractionLevel": "REPO_LOCAL"
      }
    ],
    "epistemicStatus": "REPO_LOCAL"
  }
  ```

---

### `get_repo_eku`

- **Description**: Retrieves full details of a specific Repo-Local EKU including exact source lines, SQL/Lua snippets, local context, and test suite names.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "repoEkuId": { "type": "string", "description": "Repo EKU ID (e.g. 'REKU-RIVER-001', 'REKU-BULLMQ-001')" }
    },
    "required": ["repoEkuId"]
  }
  ```
- **Output Schema**:
  ```json
  {
    "repoEku": {
      "id": "REKU-RIVER-001",
      "repository": "river",
      "mechanism": "Relational Lock-Free Dequeue (FOR UPDATE SKIP LOCKED)",
      "claim": "PostgreSQL FOR UPDATE SKIP LOCKED allows concurrent worker pools to acquire non-overlapping available jobs without table-level locking.",
      "localContext": "River implements its primary job queue inside PostgreSQL...",
      "sourceProvenance": {
        "filePath": "riverdriver/riverpgxv5/internal/dbsqlc/river_job.sql",
        "lineRange": [45, 55],
        "queryOrCodeSnippet": "SELECT id, args, attempt, state FROM river_job WHERE state = 'available' ORDER BY priority ASC, scheduled_at ASC LIMIT $1 FOR UPDATE SKIP LOCKED;"
      },
      "testProvenance": {
        "filePath": "internal/jobexecutor/job_executor_test.go",
        "testName": "TestJobExecutor"
      },
      "epistemicStatus": "REPO_LOCAL"
    },
    "epistemicStatus": "REPO_LOCAL"
  }
  ```

---

### `list_keyword_groups`

- **Description**: Lists cross-cutting common and unique keyword facet groups aggregating Repo-Local EKUs and Domain-Level EKUs.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "keyword": { "type": "string", "description": "Filter by keyword substring" },
      "facet": { "type": "string", "enum": ["COMMON_KEYWORD", "UNIQUE_KEYWORD", "MECHANISM_FAMILY", "SUBSTRATE_FAMILY"] },
      "commonOnly": { "type": "boolean" },
      "uniqueOnly": { "type": "boolean" },
      "page": { "type": "integer", "default": 1 },
      "pageSize": { "type": "integer", "default": 10 }
    }
  }
  ```
- **Output Schema**:
  ```json
  {
    "totalFound": 2,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1,
    "keywordGroups": [
      {
        "groupId": "skip_locked",
        "groupType": "COMMON_KEYWORD",
        "keyword": "skip_locked",
        "participatingRepoEkus": [
          {
            "id": "REKU-RIVER-001",
            "repository": "river",
            "mechanism": "Relational Lock-Free Dequeue (FOR UPDATE SKIP LOCKED)",
            "claim": "PostgreSQL FOR UPDATE SKIP LOCKED allows concurrent worker pools to acquire non-overlapping available jobs without table-level locking.",
            "localContext": "River implements its primary job queue inside PostgreSQL...",
            "applicabilityConditions": ["Requires PostgreSQL 9.5+ or compatible MVCC relational store."],
            "epistemicStatus": "REPO_LOCAL"
          }
        ],
        "participatingDomainEkus": [
          { "id": "EKU-QUEUE-007", "title": "Lock-Free MVCC Row Skipping Dequeue", "claimId": "CLM-007" }
        ],
        "repositories": ["river"],
        "epistemicStatus": "KEYWORD_GROUP_VIEW"
      }
    ],
    "epistemicStatus": "KEYWORD_GROUP_VIEW"
  }
  ```

---

### `get_keyword_group`

- **Description**: Retrieves full details for a specific keyword group including participating Repo-Local EKUs (with complete local context) and linked Domain EKUs.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "groupId": { "type": "string", "description": "Keyword group ID (e.g. 'skip_locked', 'token_fencing', 'row_locking')" }
    },
    "required": ["groupId"]
  }
  ```
- **Output Schema**:
  ```json
  {
    "keywordGroup": {
      "groupId": "skip_locked",
      "groupType": "COMMON_KEYWORD",
      "keyword": "skip_locked",
      "participatingRepoEkus": [
        {
          "id": "REKU-RIVER-001",
          "repository": "river",
          "mechanism": "Relational Lock-Free Dequeue (FOR UPDATE SKIP LOCKED)",
          "claim": "PostgreSQL FOR UPDATE SKIP LOCKED allows concurrent worker pools to acquire non-overlapping available jobs without table-level locking.",
          "localContext": "River implements its primary job queue inside PostgreSQL...",
          "applicabilityConditions": ["Requires PostgreSQL 9.5+ or compatible MVCC relational store."],
          "epistemicStatus": "REPO_LOCAL"
        }
      ],
      "participatingDomainEkus": [
        { "id": "EKU-QUEUE-007", "title": "Lock-Free MVCC Row Skipping Dequeue", "claimId": "CLM-007" }
      ],
      "repositories": ["river"],
      "epistemicStatus": "KEYWORD_GROUP_VIEW"
    },
    "epistemicStatus": "KEYWORD_GROUP_VIEW"
  }
  ```

---

### `trace_domain_eku`

- **Description**: Down-traces a domain-level EKU to its underlying supporting Repo-Local EKUs, observations, alternative mechanisms, and test suites.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "ekuId": { "type": "string", "description": "Domain EKU ID (e.g. 'EKU-QUEUE-007', 'EKU-QUEUE-010')" }
    },
    "required": ["ekuId"]
  }
  ```
- **Output Schema**:
  ```json
  {
    "domainEkuId": "EKU-QUEUE-007",
    "title": "Lock-Free MVCC Row Skipping Dequeue",
    "claimId": "CLM-007",
    "abstractionLevel": "DOMAIN_ABSTRACTION",
    "commonKeywordGroups": ["skip_locked", "row_locking"],
    "uniqueKeywordGroups": ["riverpgxv5"],
    "mechanismFamilies": ["relational_row_locks"],
    "substrateFamilies": ["postgres"],
    "supportedByRepoEkus": [
      {
        "id": "REKU-RIVER-001",
        "repository": "river",
        "mechanism": "Relational Lock-Free Dequeue (FOR UPDATE SKIP LOCKED)",
        "claim": "PostgreSQL FOR UPDATE SKIP LOCKED allows concurrent worker pools to acquire non-overlapping available jobs without table-level locking."
      }
    ],
    "rawObservationsCount": 2,
    "epistemicStatus": "DOMAIN_ABSTRACTION"
  }
  ```

---

### `get_implementation_evidence`

- **Description**: Retrieves dynamic, bounded implementation evidence packets derived from explicit Repo-Local EKUs with zero fallback semantics. Surfaces omitted malformed RepoEKUs in `diagnostics.omittedRepoEkus`.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "ekuId": { "type": "string", "description": "Filter by linked domain EKU ID" },
      "repo": { "type": "string", "description": "Filter by repository name" },
      "substrate": { "type": "string", "enum": ["postgres", "redis", "sqlite", "memory", "file", "raft", "amqp", "native"] },
      "mechanism": { "type": "string", "description": "Filter by mechanism name or keyword" },
      "limit": { "type": "integer", "default": 5, "maximum": 10 }
    }
  }
  ```
- **Output Schema**:
  ```json
  {
    "totalFound": 1,
    "limit": 5,
    "implementationPackets": [
      {
        "packetId": "IMPL-RIVER-RIVER-001",
        "repoEkuId": "REKU-RIVER-001",
        "repository": "river",
        "substrate": "postgres",
        "mechanism": "Relational Lock-Free Dequeue (FOR UPDATE SKIP LOCKED)",
        "linkedEku": "EKU-QUEUE-001",
        "linkedDomainEkus": ["EKU-QUEUE-001", "EKU-QUEUE-007"],
        "claimId": "CLM-001",
        "linkedClaims": ["CLM-001", "CLM-007"],
        "commonKeywords": ["skip_locked", "row_locking", "mvcc_dequeue"],
        "uniqueKeywords": ["riverpgxv5", "dbsqlc"],
        "keywordFacets": {
          "concurrencyControl": ["skip_locked", "row_locking"],
          "stateStorage": ["postgres"],
          "substrate": ["postgres"]
        },
        "localContext": "River implements its primary job queue inside PostgreSQL...",
        "sourceSnippets": [
          {
            "filePath": "riverdriver/riverpgxv5/internal/dbsqlc/river_job.sql",
            "lines": "SELECT id, args, attempt, state FROM river_job WHERE state = 'available' ORDER BY priority ASC, scheduled_at ASC LIMIT $1 FOR UPDATE SKIP LOCKED;"
          }
        ],
        "testReferences": [
          "TestJobExecutor in internal/jobexecutor/job_executor_test.go"
        ],
        "applicabilityConstraints": [
          "Requires PostgreSQL 9.5+ or compatible MVCC relational store supporting row-level SKIP LOCKED."
        ],
        "epistemicStatus": "SOURCE_OBSERVED"
      }
    ],
    "diagnostics": {
      "omittedRepoEkus": [],
      "reason": "One or more matching RepoEKUs were omitted because they lack explicit substrate or domain linkage."
    }
  }
  ```

---

### `explain_provenance`

- **Description**: Returns the complete down-traceability evidence chain for an EKU, claim, or observation ID.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "evidenceId": { "type": "string", "description": "ID of EKU, Claim, Observation, or Historical Failure" }
    },
    "required": ["evidenceId"]
  }
  ```
- **Output Schema**:
  ```json
  {
    "evidenceId": "OBS-BULLMQ-002",
    "type": "OBSERVATION",
    "repository": "taskforcesh/bullmq",
    "sourceRepository": "taskforcesh/bullmq",
    "commitHash": "c06b51cd3aacd0d9ee65e2544220c89f24d2479c",
    "filePath": "src/commands/moveToFinished-12.lua",
    "lineRange": { "start": 40, "end": 44 },
    "sourceUrl": "https://github.com/taskforcesh/bullmq/blob/c06b51cd3aacd0d9ee65e2544220c89f24d2479c/src/commands/moveToFinished-12.lua#L40-L44",
    "rawSourceUrl": "https://raw.githubusercontent.com/taskforcesh/bullmq/c06b51cd3aacd0d9ee65e2544220c89f24d2479c/src/commands/moveToFinished-12.lua",
    "snippetSha256": "4b68e98da6984e1b00ad99e74d1c448bb5bbcb110cb16246473133604f32616f",
    "semanticTest": "src/test/test_stalled_jobs.ts:testStalledJobs",
    "associatedClaim": "CLM-002",
    "associatedEkus": ["EKU-QUEUE-002", "EKU-QUEUE-015"],
    "epistemicStatus": "SOURCE_OBSERVED"
  }
  ```

---

### `get_data_quality_report`

- **Description**: Generates a bounded data-quality diagnostic audit across Repo-Local EKUs and Domain EKUs, surfacing missing explicit fields or broken references.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "layer": { "type": "string", "enum": ["REPO_LOCAL", "DOMAIN_ABSTRACTION"], "description": "Optional layer filter" },
      "limit": { "type": "integer", "default": 20, "maximum": 50 }
    }
  }
  ```
- **Output Schema**:
  ```json
  {
    "totalIssuesFound": 0,
    "limit": 20,
    "storeHealthStatus": "HEALTHY",
    "diagnostics": [],
    "auditedLayers": ["REPO_LOCAL", "DOMAIN_ABSTRACTION"]
  }
  ```
- **Diagnostic Issue Codes**:

  | Issue Code | Layer | Meaning |
  |---|---|---|
  | `MISSING_EXPLICIT_FIELDS` | `REPO_LOCAL` | RepoEKU is missing required core fields (e.g. `substrate`, `claim`, `localContext`). |
  | `BROKEN_EVIDENCE_LINK` | `REPO_LOCAL` | RepoEKU cites non-existent `OBS-*` or `HIST-*` identifier. |
  | `MISSING_SOURCE_PROVENANCE` | `REPO_LOCAL` | RepoEKU marked `SOURCE_OBSERVED` lacks source file path or query snippet. |
  | `MISSING_TEST_PROVENANCE` | `REPO_LOCAL` | RepoEKU marked `TEST_OBSERVED` lacks test file path or test function name. |
  | `BROKEN_SUPPORT_LINK` | `DOMAIN_ABSTRACTION` | Domain EKU cites unknown `supportedByRepoEkus` identifier. |
  | `BROKEN_ALTERNATIVE_LINK` | `DOMAIN_ABSTRACTION` | Domain EKU cites unknown `alternativeMechanismRepoEkus` identifier. |
  | `BROKEN_COUNTEREXAMPLE_LINK` | `DOMAIN_ABSTRACTION` | Domain EKU cites unknown `counterexampleRepoEkus` identifier. |
  | `BROKEN_NOT_APPLICABLE_LINK` | `DOMAIN_ABSTRACTION` | Domain EKU cites unknown `notApplicableRepoEkus` identifier. |
  | `MISSING_FALSIFICATION_AUDIT` | `DOMAIN_ABSTRACTION` | Domain EKU lacks counterexample links, not-applicable links, and audit note. |

---

## 3. Design Critique and Verification Tools

### `compare_design_against_evidence`

- **Description**: Analyzes an architectural proposal against ESEKL invariants and returns matching EKUs, missing invariants, failure triggers, counterexamples, and "what not to promise".
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "proposedDesign": { "type": "string", "description": "Text description or specification of the proposed system architecture" },
      "options": {
        "type": "object",
        "properties": {
          "strictness": { "type": "string", "enum": ["advisory", "strict"], "default": "strict" }
        }
      }
    },
    "required": ["proposedDesign"]
  }
  ```
- **Output Schema**:
  ```json
  {
    "matchingEkus": ["EKU-QUEUE-015", "EKU-QUEUE-016", "EKU-QUEUE-017", "EKU-QUEUE-019"],
    "missingInvariants": [
      {
        "invariant": "Storage-Time Lease Evaluation",
        "severity": "CRITICAL",
        "risk": "Caller-supplied VM timestamps allow clock drift across container hosts to cause premature lease expiration or duplicate execution.",
        "recommendedFix": "Use database server time (e.g. clock_timestamp()) exclusively in lease recovery queries."
      }
    ],
    "whatNotToPromise": [
      "Never promise true 'exactly-once' delivery over external network boundaries without partner idempotency keys.",
      "Never promise constant latency during unmetered enterprise batch spikes; enforce admission semaphores and HTTP 429/503."
    ],
    "epistemicClassification": {
      "empiricalEvidenceCount": 8,
      "modelInferredPoints": 2,
      "synthesizedAdvice": "Enforce generation token fencing on payment projection commits."
    }
  }
  ```

---

### `generate_verification_plan`

- **Description**: Generates an adversarial verification plan mapped to empirical evidence objects.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "requirementOrDesign": { "type": "string", "description": "System requirement or architecture under test" },
      "options": {
        "type": "object",
        "properties": {
          "includeAdversarialScenarios": { "type": "boolean", "default": true }
        }
      }
    },
    "required": ["requirementOrDesign"]
  }
  ```
- **Output Schema**:
  ```json
  {
    "testSuites": [
      {
        "name": "Split-Brain Worker Generation Fencing Test",
        "motivatedByEku": "EKU-QUEUE-015",
        "motivatedByFailure": "HIST-RIVER-003",
        "procedure": [
          "Worker A acquires generation 1 lease and executes external API.",
          "Inject 45s pause into Worker A.",
          "Rescuer assigns generation 2 to Worker B; Worker B completes and commits.",
          "Worker A resumes and attempts commit with generation 1.",
          "Assert Worker A write affects 0 rows and emits stale_worker_write error."
        ]
      },
      {
        "name": "Unparseable Payload Crash Loop Isolation Test",
        "motivatedByEku": "EKU-QUEUE-017",
        "motivatedByFailure": "HIST-BULLMQ-001",
        "procedure": [
          "Enqueue malformed payload causing native SIGKILL / parser crash.",
          "Simulate worker termination on 3 consecutive dequeues.",
          "Assert attempt counter increments at claim time and payload moves to dead-letter queue."
        ]
      }
    ]
  }
  ```

---

## Failure and Error Handling Contracts

1. **Unknown identifiers**: Querying a nonexistent EKU ID (e.g. `EKU-QUEUE-999`) or Observation ID returns structured JSON error `{ "error": "NOT_FOUND", "message": "Unknown identifier 'EKU-QUEUE-999'", "availableIds": [...] }`.
2. **Context safety and pagination**: Dossier and search queries enforce strict default limits (`pageSize: 10`, `limit: 5`) to prevent accidental context flooding.
3. **No hidden prompt leaks**: Tools never expose hidden benchmark rubric keys or evaluation test answers to planning agents.
