# ESEKL Repository Ingestion and Expansion Checklist

Use this operational checklist when onboarding a new repository into the Empirical Software Engineering Knowledge Layer (ESEKL).

---

## Step-by-Step Execution Workflow

### Step 0: Ingestion Sandbox and Dry-Run

- [ ] Run template conformance and dry-run ingestion check before editing canonical files:
  ```bash
  python3 analyzer/dry_run_ingestion.py
  ```

### Step 1: Register Repository

- [ ] Clone repository into `factory/<repo>/`.
- [ ] Add manifest entry into `eku_store/corpus_manifest.json` using [`templates/corpus_manifest_entry.template.json`](./corpus_manifest_entry.template.json).

### Step 2: Extract Evidence

- [ ] Extract source observations into `eku_store/evidence/observations.json` using [`templates/observation_entry.template.json`](./observation_entry.template.json).
- [ ] Extract historical failure postmortems into `eku_store/evidence/historical_failures.json` using [`templates/historical_failure_entry.template.json`](./historical_failure_entry.template.json).

### Step 3: Author Repo-Local EKUs

- [ ] Create `eku_store/repo_ekus/<repo>.json` using [`templates/repo_eku_entry.template.json`](./repo_eku_entry.template.json).
- [ ] Ensure all `commonKeywords`, `uniqueKeywords`, and `localContext` are fully populated.

### Step 4: Classify Against Domain EKUs

- [ ] Update `eku_store/claim_matrix.json` for all 20 claims (`CLM-001` through `CLM-020`).
- [ ] Link `supportedByRepoEkus` on domain EKUs in `eku_store/synthesized_queue_ekus.json` using [`templates/domain_eku_classification.template.json`](./domain_eku_classification.template.json).

### Step 5: Execute Validation and Testing Gates

```bash
# 1. Run Python evidence ledger validator (checks 100% provenance and denominator math)
python3 analyzer/validate_evidence_ledger.py

# 2. Rebuild run manifests
python3 evaluation/build_run_manifest.py

# 3. Run full MCP test suite (19 tools, semantic fixtures, security caps, packaging)
npm test --prefix eku_middleware
```

### Step 6: Verify Layered MCP Retrieval

```bash
# Verify repo-local EKU retrieval
node eku_middleware/bin/esekl_query.mjs --store-root=. repo-ekus --repo=<repo>

# Verify keyword group retrieval
node eku_middleware/bin/esekl_query.mjs --store-root=. keyword-groups --keyword=<mechanism>
```
