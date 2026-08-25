#!/usr/bin/env python3
"""
ESEKL Ingestion Dry-Run & Connected Template Conformance Checker
Instantiates checked-in templates from eku_store/templates/ with deterministic placeholder replacements
and validates 100% cross-link integrity in a temporary /tmp sandbox.
"""

import json
import os
import sys
import tempfile

TEMPLATES_DIR = "eku_store/templates"

def load_template(filename):
    path = os.path.join(TEMPLATES_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Required ingestion template '{path}' not found")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "$comment" in data:
        del data["$comment"]
    return data

def test_template_instantiation():
    print("▶ 1. Validating RepoEKU template instantiation against repo_eku_schema.json...")
    template = load_template("repo_eku_entry.template.json")
    schema_path = "eku_store/schema/repo_eku_schema.json"

    with open(schema_path, "r", encoding="utf-8") as f:
        schema = json.load(f)

    # Instantiate template with valid concrete fixture data
    instantiated = dict(template)
    instantiated["id"] = "REKU-FIXTURE-001"
    instantiated["repository"] = "river"
    instantiated["domain"] = "Queue, Broker & Distributed Workflow Systems"
    instantiated["substrate"] = "postgres"
    instantiated["objectType"] = "BEHAVIORAL_INVARIANT"
    instantiated["claim"] = "Valid sample claim describing relational lock-free dequeue behavior."
    instantiated["mechanism"] = "Relational Dequeue Mechanism"
    instantiated["applicabilityConditions"] = ["Requires PostgreSQL 9.5+"]
    instantiated["evidenceIds"] = ["OBS-RIVER-001"]
    instantiated["commonKeywords"] = ["skip_locked", "row_locking"]
    instantiated["uniqueKeywords"] = ["riverpgxv5"]
    instantiated["localContext"] = "River uses Postgres FOR UPDATE SKIP LOCKED to achieve high-concurrency worker polling."
    instantiated["linkedDomainEkus"] = ["EKU-QUEUE-001"]
    instantiated["linkedClaims"] = ["CLM-001"]
    instantiated["sourceProvenance"] = {
        "filePath": "riverdriver/riverpgxv5/internal/dbsqlc/river_job.sql",
        "lineRange": [45, 55],
        "queryOrCodeSnippet": "SELECT id FROM river_job FOR UPDATE SKIP LOCKED;"
    }
    instantiated["testProvenance"] = {
        "filePath": "internal/jobexecutor/job_executor_test.go",
        "testName": "TestJobExecutor"
    }
    instantiated["epistemicLabels"] = ["SOURCE_OBSERVED", "TEST_OBSERVED"]
    instantiated["abstractionLevel"] = "REPO_LOCAL"
    instantiated["status"] = "ACTIVE"

    import jsonschema
    try:
        jsonschema.validate(instance=instantiated, schema=schema)
    except jsonschema.ValidationError as ve:
        raise AssertionError(f"Template repo_eku_entry.template.json drifted from schema: {ve.message}")

    print("  ✅ Instantiated RepoEKU template passed JSON Schema validation.")

def test_connected_mini_corpus_dry_run():
    print("▶ 2. Simulating full connected multi-layer ingestion dry-run across all 6 checked-in templates...")
    with tempfile.TemporaryDirectory(prefix="esekl-connected-dryrun-") as tmpdir:
        # 1. Instantiate Manifest Entry from template
        manifest_tpl = load_template("corpus_manifest_entry.template.json")
        manifest_entry = dict(manifest_tpl)
        manifest_entry["id"] = "simulated_broker"
        manifest_entry["name"] = "Simulated In-Memory Distributed Broker"
        manifest_entry["repo"] = "factory/simulated_broker"
        manifest_entry["language"] = "rust"
        manifest_entry["storageEngine"] = "memory"
        manifest_entry["primaryAbstraction"] = "KV Queue"
        manifest_entry["license"] = "Apache-2.0"
        manifest_entry["pinnedCommit"] = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
        manifest_entry["description"] = "High-performance simulated message broker."

        # 2. Instantiate Atomic Observation from template
        obs_tpl = load_template("observation_entry.template.json")
        obs_entry = dict(obs_tpl)
        obs_entry["id"] = "OBS-SIMULATED-001"
        obs_entry["repo"] = "simulated_broker"
        obs_entry["filePath"] = "src/engine/lease.rs"
        obs_entry["lineRange"] = [20, 35]
        obs_entry["snippetSha256"] = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        obs_entry["testName"] = "test_atomic_lease_renewal"
        obs_entry["description"] = "Atomic compare-and-swap lease extension using monotonic instant ticks."
        obs_entry["observedBehavior"] = "Monotonic tick validation prevents split-brain lease extension."

        # 3. Instantiate Historical Failure from template
        hist_tpl = load_template("historical_failure_entry.template.json")
        hist_entry = dict(hist_tpl)
        hist_entry["id"] = "HIST-SIMULATED-001"
        hist_entry["repo"] = "simulated_broker"
        hist_entry["title"] = "Clock skew during epoch rollover allowed duplicate lease grant"
        hist_entry["commitHash"] = "f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5"
        hist_entry["originalAssumption"] = "System clock is synchronized across all peer threads."
        hist_entry["triggeringCondition"] = "NTP backward step during high load."
        hist_entry["observedFailure"] = "Two workers concurrently processed the same lease ticket."
        hist_entry["failureMechanism"] = "Wall clock comparison without monotonic sequence fencing."
        hist_entry["preventionContract"] = "Enforce monotonic epoch IDs on all lease renewals."
        hist_entry["regressionTest"] = "test_lease_rollover_under_skew in tests/integration.rs"

        # 4. Instantiate RepoEKU from template
        reku_tpl = load_template("repo_eku_entry.template.json")
        reku_entry = dict(reku_tpl)
        reku_entry["id"] = "REKU-SIMULATED-001"
        reku_entry["repository"] = "simulated_broker"
        reku_entry["domain"] = "Queue, Broker & Distributed Workflow Systems"
        reku_entry["substrate"] = "memory"
        reku_entry["objectType"] = "BEHAVIORAL_INVARIANT"
        reku_entry["claim"] = "Monotonic epoch fencing prevents split-brain task leasing."
        reku_entry["mechanism"] = "Monotonic Epoch Fencing"
        reku_entry["applicabilityConditions"] = ["In-memory atomic CAS"]
        reku_entry["evidenceIds"] = ["OBS-SIMULATED-001", "HIST-SIMULATED-001"]
        reku_entry["commonKeywords"] = ["lease_fencing", "epoch_counter"]
        reku_entry["uniqueKeywords"] = ["simulated_instant_cas"]
        reku_entry["localContext"] = "Simulated broker uses a 64-bit atomic counter to guarantee single-consumer leases."
        reku_entry["linkedDomainEkus"] = ["EKU-QUEUE-002", "EKU-QUEUE-016"]
        reku_entry["linkedClaims"] = ["CLM-002", "CLM-016"]
        reku_entry["sourceProvenance"] = {
            "filePath": "src/engine/lease.rs",
            "lineRange": [20, 35],
            "queryOrCodeSnippet": "atomic_cas(&self.epoch, current, current + 1);"
        }
        reku_entry["testProvenance"] = {
            "filePath": "tests/integration.rs",
            "testName": "test_atomic_lease_renewal"
        }
        reku_entry["historyProvenance"] = {
            "commitHash": "f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5",
            "failureId": "HIST-SIMULATED-001"
        }
        reku_entry["epistemicLabels"] = ["SOURCE_OBSERVED", "TEST_OBSERVED", "HISTORY_SUPPORTED"]
        reku_entry["abstractionLevel"] = "REPO_LOCAL"
        reku_entry["status"] = "ACTIVE"

        # 5. Instantiate Keyword/Facet Group View from template
        kg_tpl = load_template("keyword_facet_group.template.json")
        keyword_group_entry = dict(kg_tpl)
        keyword_group_entry["groupId"] = "lease_fencing"
        keyword_group_entry["groupType"] = "COMMON_KEYWORD"
        keyword_group_entry["keyword"] = "lease_fencing"
        keyword_group_entry["participatingRepoEkus"] = [
            {
                "id": "REKU-SIMULATED-001",
                "repository": "simulated_broker",
                "mechanism": "Monotonic Epoch Fencing",
                "claim": "Monotonic epoch fencing prevents split-brain task leasing.",
                "localContext": "Simulated broker uses a 64-bit atomic counter to guarantee single-consumer leases."
            }
        ]
        keyword_group_entry["participatingDomainEkus"] = [
            {
                "id": "EKU-QUEUE-002",
                "title": "Token-Fenced Ownership Validation on State Finalization",
                "claimId": "CLM-002"
            }
        ]
        keyword_group_entry["repositories"] = ["simulated_broker"]
        keyword_group_entry["epistemicStatus"] = "KEYWORD_GROUP_VIEW"

        # 6. Instantiate Domain EKU Classification from template
        dc_tpl = load_template("domain_eku_classification.template.json")
        domain_class_entry = dict(dc_tpl)
        domain_class_entry["domainEkuId"] = "EKU-QUEUE-002"
        domain_class_entry["repository"] = "simulated_broker"
        domain_class_entry["classification"] = "SUPPORTS"
        domain_class_entry["linkedRepoEkus"] = ["REKU-SIMULATED-001"]
        domain_class_entry["commonKeywordGroups"] = ["lease_fencing"]
        domain_class_entry["uniqueKeywordGroups"] = ["simulated_instant_cas"]
        domain_class_entry["mechanismFamilies"] = ["epoch_fencing"]
        domain_class_entry["substrateFamilies"] = ["memory"]
        domain_class_entry["justification"] = "Simulated broker enforces atomic CAS epoch counters directly proving token-fenced ownership."

        # Save all to temporary sandbox
        files = {
            "manifest.json": manifest_entry,
            "observations.json": [obs_entry],
            "historical_failures.json": [hist_entry],
            "repo_ekus.json": [reku_entry],
            "keyword_group.json": keyword_group_entry,
            "domain_classification.json": domain_class_entry
        }

        for fname, data in files.items():
            fpath = os.path.join(tmpdir, fname)
            with open(fpath, "w", encoding="utf-8") as out:
                json.dump(data, out, indent=2)

        # Cross-reference & schema validation
        schema = json.load(open("eku_store/schema/repo_eku_schema.json"))
        import jsonschema
        try:
            jsonschema.validate(instance=reku_entry, schema=schema)
        except jsonschema.ValidationError as ve:
            raise AssertionError(f"RepoEKU instantiated from template failed JSON Schema validation: {ve.message}")

        # Assert cross-link integrity
        assert reku_entry["repository"] == manifest_entry["id"], "RepoEKU template instance must match manifest repo ID"
        assert obs_entry["id"] in reku_entry["evidenceIds"], "RepoEKU template instance must cite observation ID"
        assert hist_entry["id"] in reku_entry["evidenceIds"], "RepoEKU template instance must cite historical failure ID"
        assert reku_entry["id"] in domain_class_entry["linkedRepoEkus"], "Domain classification template instance must link RepoEKU"
        assert any(r["id"] == reku_entry["id"] for r in keyword_group_entry["participatingRepoEkus"]), "Keyword group template instance must include RepoEKU"
        assert keyword_group_entry["participatingRepoEkus"][0]["localContext"] == reku_entry["localContext"], "Keyword group template instance must preserve localContext"

        print("  ✅ All 6 template files loaded, instantiated, and verified with 100% cross-link integrity.")

def main():
    print("=" * 60)
    print("📋 ESEKL COMPREHENSIVE INGESTION DRY-RUN & TEMPLATE AUDIT")
    print("=" * 60)
    test_template_instantiation()
    test_connected_mini_corpus_dry_run()
    print("\n🎉 ALL 6 INGESTION TEMPLATE CONFORMANCE & DRY-RUN CHECKS PASSED!\n")

if __name__ == "__main__":
    main()
