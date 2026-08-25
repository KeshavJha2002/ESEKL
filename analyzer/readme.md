# ESEKL Analyzer

`analyzer/` contains deterministic validation and report-freshness tooling for the checked-in ESEKL store. It should not contain synthesis reports, benchmark narratives, or prompt archives.

## Files

- `validate_evidence_ledger.py`: canonical mechanical validator for evidence, claims, EKUs, corpus statistics, RepoEKUs, templates, benchmark gates, and scorer fixtures.
- `dry_run_ingestion.py`: deterministic template-instantiation smoke test used by the validator.
- `generate_coverage_report.py`: regenerates `eku_store/repo_ekus/coverage.md` from checked-in EKU data.
- `fixtures/`: negative fixtures proving schema and validator rejection paths.

Research prompts and benchmark workflow documents live under `benchmark/`.

## Commands

```bash
python3 analyzer/validate_evidence_ledger.py --allow-missing-factory
python3 analyzer/generate_coverage_report.py
bash scripts/full_local_gate.sh
```

The validator is the release gate. It must exit with `0 ERRORS, 0 WARNINGS` before publishing or handing the store to an MCP-backed agent.
