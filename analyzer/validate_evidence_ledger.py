REGISTERED_MCP_TOOLS = {
    "get_capabilities",
    "list_dossiers",
    "get_dossier_summary",
    "list_research_threads",
    "get_dossier_slice",
    "compare_engines",
    "search_evidence",
    "get_eku",
    "list_repo_ekus",
    "get_repo_eku",
    "list_keyword_groups",
    "get_keyword_group",
    "trace_domain_eku",
    "get_failure_patterns",
    "get_failure_chains",
    "explain_provenance",
    "compare_design_against_evidence",
    "generate_verification_plan",
    "get_implementation_evidence",
    "get_data_quality_report"
}

import glob
import hashlib
import json
import os
import re
import subprocess
import sys
sys.path.insert(0, os.getcwd())
from evaluation.run_metadata_contract import validate_display_metadata

try:
    import jsonschema
except ImportError:
    print("\n❌ MISSING DEPENDENCY: Python 'jsonschema' library is not installed.")
    print("👉 Please install dependencies by running: pip install -r requirements.txt\n")
    sys.exit(1)

VALID_MATRIX_CLASSES = {
    "SUPPORTS",
    "ALTERNATIVE_MECHANISM",
    "COUNTEREXAMPLE",
    "INSUFFICIENT_EVIDENCE",
    "NOT_APPLICABLE",
}

STAT_KEYS_BY_CLASS = {
    "SUPPORTS": "supports",
    "ALTERNATIVE_MECHANISM": "alternativeMechanism",
    "COUNTEREXAMPLE": "counterexamples",
    "INSUFFICIENT_EVIDENCE": "insufficientEvidence",
    "NOT_APPLICABLE": "notApplicable",
}

VALID_GAP_TYPES = {
    "MISSING_OBSERVATION",
    "OVERLY_COMPRESSED_OBSERVATION",
    "MISSING_FAILURE_CHAIN",
    "RETRIEVAL_FAILED",
    "ABSTRACTION_HID_CONDITION",
    "EVIDENCE_PACKET_OMITTED_REGRESSION_TEST",
    "NOT_A_REAL_GAP",
}

REQUIRED_FRONTMATTER_FIELDS = [
    "agent",
    "condition",
    "run_id",
    "started_at",
    "completed_at",
    "allowed_sources"
]

ALLOW_MISSING_FACTORY = "--allow-missing-factory" in sys.argv
FACTORY_LOCK_FILE = "eku_middleware/eku_store/release/factory_repo_lock.json"
FACTORY_LOCK = None


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def repo_fs_name(repo):
    return str(repo).replace("-", "_")


def validate_factory_lock(manifest_data, errors):
    global FACTORY_LOCK
    if not os.path.exists(FACTORY_LOCK_FILE):
        errors.append(f"Missing factory lock file required by --allow-missing-factory: {FACTORY_LOCK_FILE}")
        return

    lock = load_json(FACTORY_LOCK_FILE)
    FACTORY_LOCK = {r.get("repo"): r for r in lock.get("repositories", [])}
    locked = {r.get("repo"): r for r in lock.get("repositories", [])}
    for repo_info in manifest_data.get("repositories", []):
        repo = repo_info.get("repo")
        if repo not in locked:
            errors.append(f"Factory lock file {FACTORY_LOCK_FILE}: missing repo '{repo}'")
            continue
        locked_commit = locked[repo].get("manifestCommit")
        if locked_commit != repo_info.get("commit"):
            errors.append(
                f"Factory lock file {FACTORY_LOCK_FILE}: repo '{repo}' manifestCommit {locked_commit} "
                f"!= corpus_manifest commit {repo_info.get('commit')}"
            )
        if not locked[repo].get("validatedSourceCommit"):
            errors.append(f"Factory lock file {FACTORY_LOCK_FILE}: repo '{repo}' missing validatedSourceCommit")
        if not locked[repo].get("targetRepo"):
            errors.append(f"Factory lock file {FACTORY_LOCK_FILE}: repo '{repo}' missing targetRepo")


def validate_locked_repo_reference(repo, evidence_id, errors):
    if not ALLOW_MISSING_FACTORY:
        return
    if not FACTORY_LOCK or repo not in FACTORY_LOCK:
        errors.append(f"{evidence_id}: repo '{repo}' is not present in {FACTORY_LOCK_FILE}")
        return
    locked = FACTORY_LOCK[repo]
    if not locked.get("targetRepo"):
        errors.append(f"{evidence_id}: locked repo '{repo}' missing targetRepo")
    if not locked.get("manifestCommit"):
        errors.append(f"{evidence_id}: locked repo '{repo}' missing manifestCommit")


def normalize_test_name(name):
    if not name:
        return ""
    return name.strip().split()[0].strip("`'\"(),:")


def extract_regression_test_path(regression_test):
    if not regression_test:
        return None
    if " in " in regression_test:
        return regression_test.split(" in ")[1].strip()
    match = re.search(r"([\w./-]+(?:_test\.go|\.test\.ts|\.test\.js|_test\.py|test_[\w./-]+\.py|Test\.java|Test\.cc|Test\.cpp|Test\.erl|SUITE\.erl|_test\.rs|\.java|\.cc|\.cpp|\.erl|\.rs))", regression_test)
    return match.group(1) if match else None


def test_repo_eku_negative_fixtures(repo_eku_schema, manifest_repo_names, all_obs_ids, all_hist_ids, repo_eku_ids):
    """
    Data-driven regression suite ensuring validator and schema reject broken,
    unmanifested, and malformed RepoEKUs and Domain EKU links.
    """
    neg_repo_path = "analyzer/fixtures/negative_repo_ekus.json"
    neg_domain_path = "analyzer/fixtures/negative_domain_links.json"
    fixture_schema_path = "analyzer/fixtures/negative_fixture_schema.json"

    repo_fixtures = load_json(neg_repo_path)
    domain_fixtures = load_json(neg_domain_path)
    fixture_schema = load_json(fixture_schema_path)

    import jsonschema
    # 0. Validate fixture files against negative_fixture_schema.json
    try:
        jsonschema.validate(instance=repo_fixtures, schema=fixture_schema)
        jsonschema.validate(instance=domain_fixtures, schema=fixture_schema)
    except jsonschema.ValidationError as ve:
        raise AssertionError(f"Negative fixture file schema validation failed: {ve.message}")

    # Check for duplicate fixture IDs
    all_fids = set()
    for fix in repo_fixtures + domain_fixtures:
        fid = fix["fixtureId"]
        if fid in all_fids:
            raise AssertionError(f"Duplicate negative fixtureId '{fid}' detected across fixture suites")
        all_fids.add(fid)

    neg_errors = []
    valid_substrates = {"postgres", "redis", "sqlite", "memory", "file", "raft", "amqp", "native"}

    # 1. Evaluate RepoEKU negative fixtures
    for fix in repo_fixtures:
        fid = fix["fixtureId"]
        cat = fix["expectedErrorCategory"]
        p = fix["payload"]

        if cat == "BROKEN_EVIDENCE_ID":
            for eid in p.get("evidenceIds", []):
                if eid not in all_obs_ids and eid not in all_hist_ids:
                    neg_errors.append(f"{fid}: Caught broken evidenceId '{eid}'")

        elif cat == "MISSING_SOURCE_PROVENANCE":
            if "SOURCE_OBSERVED" in p.get("epistemicLabels", []):
                sp = p.get("sourceProvenance")
                if not sp or not sp.get("filePath") or not sp.get("queryOrCodeSnippet"):
                    neg_errors.append(f"{fid}: Caught missing sourceProvenance")

        elif cat == "UNREGISTERED_REPOSITORY":
            if p.get("repository") not in manifest_repo_names:
                neg_errors.append(f"{fid}: Caught unmanifested repo '{p.get('repository')}'")

        elif cat == "INVALID_SUBSTRATE":
            if p.get("substrate") not in valid_substrates:
                neg_errors.append(f"{fid}: Caught invalid substrate '{p.get('substrate')}'")

        elif cat == "MISSING_LINKED_DOMAIN_EKUS":
            if not p.get("linkedDomainEkus"):
                neg_errors.append(f"{fid}: Caught missing linkedDomainEkus")

        elif cat == "SCHEMA_VALIDATION_ERROR":
            try:
                import jsonschema
                jsonschema.validate(instance=p, schema=repo_eku_schema)
            except Exception:
                neg_errors.append(f"{fid}: Caught schema rejection")

        elif cat == "UNBACKED_HISTORY_LABEL":
            if "HISTORY_SUPPORTED" in p.get("epistemicLabels", []):
                has_hist = any(e.startswith("HIST-") for e in p.get("evidenceIds", [])) or bool(p.get("historyProvenance"))
                if not has_hist:
                    neg_errors.append(f"{fid}: Caught HISTORY_SUPPORTED without HIST evidence or historyProvenance")

        elif cat == "INVALID_KEYWORD_FACETS_TYPE":
            kf = p.get("keywordFacets", {})
            if isinstance(kf, dict):
                for k, v in kf.items():
                    if not isinstance(v, list) or not all(isinstance(x, str) for x in v):
                        neg_errors.append(f"{fid}: Caught keywordFacets non-array-of-strings")

    # 2. Evaluate Domain EKU link negative fixtures
    for fix in domain_fixtures:
        fid = fix["fixtureId"]
        cat = fix["expectedErrorCategory"]
        p = fix["payload"]

        if cat == "BROKEN_SUPPORT_LINK":
            for sup in p.get("supportedByRepoEkus", []):
                if sup not in repo_eku_ids:
                    neg_errors.append(f"{fid}: Caught unknown supportedByRepoEku '{sup}'")

        elif cat == "BROKEN_ALTERNATIVE_LINK":
            for alt in p.get("alternativeMechanismRepoEkus", []):
                if alt not in repo_eku_ids:
                    neg_errors.append(f"{fid}: Caught unknown alternativeMechanismRepoEku '{alt}'")

        elif cat == "BROKEN_COUNTEREXAMPLE_LINK":
            for ce in p.get("counterexampleRepoEkus", []):
                if ce not in repo_eku_ids:
                    neg_errors.append(f"{fid}: Caught unknown counterexampleRepoEku '{ce}'")

        elif cat == "BROKEN_NOT_APPLICABLE_LINK":
            for na in p.get("notApplicableRepoEkus", []):
                if na not in repo_eku_ids:
                    neg_errors.append(f"{fid}: Caught unknown notApplicableRepoEku '{na}'")

    total_fixtures = len(repo_fixtures) + len(domain_fixtures)
    assert len(neg_errors) == total_fixtures, f"Expected {total_fixtures} negative fixture catches, got {len(neg_errors)}"
    print(f"   ✅ All {total_fixtures} data-driven negative fixture checks passed (verified validator & JSON Schema reject broken references, invalid substrate, and malformed structures).")


def main():
    print("=" * 60)
    print("🔍 ESEKL EVIDENCE LEDGER, RELEASE & AUDIT VALIDATOR")
    print("=" * 60)

    errors = []
    warnings = []

    # 1. Load Evidence Files
    obs_file = 'eku_middleware/eku_store/evidence/observations.json'
    hist_file = 'eku_middleware/eku_store/evidence/historical_failures.json'
    claims_file = 'eku_middleware/eku_store/evidence/claims.json'
    ekus_file = 'eku_middleware/eku_store/synthesized_queue_ekus.json'
    matrix_file = 'eku_middleware/eku_store/claim_matrix.json'
    manifest_file = 'eku_middleware/eku_store/corpus_manifest.json'

    for f in [obs_file, hist_file, claims_file, ekus_file, matrix_file, manifest_file]:
        if not os.path.exists(f):
            errors.append(f"Missing required file: {f}")

    if errors:
        for err in errors:
            print(f"❌ {err}")
        sys.exit(1)

    observations = load_json(obs_file)
    historical_failures = load_json(hist_file)
    claims = load_json(claims_file)
    ekus_data = load_json(ekus_file)
    matrix_data = load_json(matrix_file)
    manifest_data = load_json(manifest_file)

    print(f"✅ Loaded {len(observations)} observations, {len(historical_failures)} historical failures, {len(claims)} claims, {len(ekus_data['ekus'])} base EKUs.")
    if ALLOW_MISSING_FACTORY:
        validate_factory_lock(manifest_data, errors)
        print(f"ℹ️ Release validation mode enabled: local factory/ source checks may be satisfied by {FACTORY_LOCK_FILE}.")

    # 1.5. Validate Repo-Local EKUs
    print("\n--- 1.5. Validating Repo-Local EKUs ---")
    repo_eku_files = glob.glob("eku_middleware/eku_store/repo_ekus/*.json")
    repo_ekus = []
    repo_eku_ids = set()
    repo_eku_schema = load_json("eku_middleware/eku_store/schema/repo_eku_schema.json")
    import jsonschema
    manifest_repo_names = {r.get("id", "").lower() for r in manifest_data.get("repositories", [])} | \
                          {r.get("repo", "").lower().replace("factory/", "") for r in manifest_data.get("repositories", [])} | \
                          {r.get("name", "").lower() for r in manifest_data.get("repositories", [])}

    all_obs_ids = {o.get("id") for o in observations}
    all_hist_ids = {h.get("id") for h in historical_failures}

    if "--negative-only" in sys.argv:
        print("\n🧪 Running Standalone Data-Driven Negative Fixture Suite...")
        test_repo_eku_negative_fixtures(repo_eku_schema, manifest_repo_names, all_obs_ids, all_hist_ids, {"REKU-RIVER-001"})
        print("🎉 Standalone negative fixture suite completed successfully.\n")
        return

    for rf in repo_eku_files:
        try:
            r_list = load_json(rf)
            for reku in r_list:
                reku_id = reku.get("id")
                repo_name = (reku.get("repository") or "").lower()

                # 0. Canonical JSON Schema Structural Validation
                try:
                    jsonschema.validate(instance=reku, schema=repo_eku_schema)
                except jsonschema.ValidationError as ve:
                    errors.append(f"Repo EKU {reku_id} in {rf}: Schema validation failed: {ve.message}")

                if reku_id in repo_eku_ids:
                    errors.append(f"Duplicate Repo EKU id '{reku_id}' in {rf}")
                repo_eku_ids.add(reku_id)
                repo_ekus.append(reku)

                # 1. Repository membership in corpus manifest
                if repo_name not in manifest_repo_names:
                    errors.append(f"Repo EKU {reku_id}: repository '{reku.get('repository')}' not registered in corpus_manifest.json")

                # 2. Evidence IDs existence
                ev_ids = reku.get("evidenceIds", [])
                for eid in ev_ids:
                    if eid not in all_obs_ids and eid not in all_hist_ids:
                        errors.append(f"Repo EKU {reku_id}: cites missing evidenceId '{eid}'")

                # 3. Epistemic label requirements & on-disk file verification
                labels = reku.get("epistemicLabels", [])
                if "SOURCE_OBSERVED" in labels:
                    sp = reku.get("sourceProvenance")
                    if not sp or not sp.get("filePath") or not sp.get("queryOrCodeSnippet"):
                        errors.append(f"Repo EKU {reku_id}: labeled SOURCE_OBSERVED but missing valid sourceProvenance")
                    elif os.path.exists(os.path.join("factory", repo_name)):
                        src_file = os.path.join("factory", repo_name, sp.get("filePath"))
                        if not os.path.exists(src_file):
                            errors.append(f"Repo EKU {reku_id}: source file '{src_file}' does not exist on disk")

                if "TEST_OBSERVED" in labels:
                    tp = reku.get("testProvenance")
                    if not tp or not tp.get("filePath") or not tp.get("testName"):
                        errors.append(f"Repo EKU {reku_id}: labeled TEST_OBSERVED but missing valid testProvenance")
                    elif os.path.exists(os.path.join("factory", repo_name)):
                        test_file = os.path.join("factory", repo_name, tp.get("filePath"))
                        if not os.path.exists(test_file):
                            errors.append(f"Repo EKU {reku_id}: test file '{test_file}' does not exist on disk")

                if "HISTORY_SUPPORTED" in labels:
                    has_hist = any(e.startswith("HIST-") for e in ev_ids) or bool(reku.get("historyProvenance"))
                    if not has_hist:
                        errors.append(f"Repo EKU {reku_id}: labeled HISTORY_SUPPORTED but lacks HIST-* evidenceId or historyProvenance")

                # 4. keywordFacets value typing
                kf = reku.get("keywordFacets")
                if kf and isinstance(kf, dict):
                    for facet_name, facet_vals in kf.items():
                        if not isinstance(facet_vals, list) or not all(isinstance(v, str) for v in facet_vals):
                            errors.append(f"Repo EKU {reku_id}: keywordFacets['{facet_name}'] must be an array of strings")

        except Exception as e:
            errors.append(f"Repo EKU file {rf}: Failed parsing: {e}")
    print(f"   Repo EKU files checked: {len(repo_eku_files)} (Loaded {len(repo_ekus)} Repo EKUs)")
    test_repo_eku_negative_fixtures(repo_eku_schema, manifest_repo_names, all_obs_ids, all_hist_ids, repo_eku_ids)

    # 1.7. Validate RepoEKU Contract Drift Across Schema, Templates, Spec & Code
    print("\n--- 1.7. Validating RepoEKU Contract Drift Across Surfaces ---")
    CANONICAL_REPO_EKU_REQUIRED_FIELDS = [
        "id", "repository", "domain", "substrate", "objectType",
        "claim", "mechanism", "applicabilityConditions", "evidenceIds",
        "commonKeywords", "uniqueKeywords", "localContext",
        "linkedDomainEkus", "linkedClaims", "abstractionLevel",
        "epistemicLabels", "status"
    ]

    # 1. Check schema
    schema_path = "eku_middleware/eku_store/schema/repo_eku_schema.json"
    if os.path.exists(schema_path):
        schema_json = load_json(schema_path)
        schema_req = set(schema_json.get("required", []))
        for rf in CANONICAL_REPO_EKU_REQUIRED_FIELDS:
            if rf not in schema_req:
                errors.append(f"RepoEKU schema {schema_path}: missing required field '{rf}' in schema 'required' array")

    # 2. Check template
    template_path = "eku_middleware/eku_store/templates/repo_eku_entry.template.json"
    if os.path.exists(template_path):
        template_json = load_json(template_path)
        for rf in CANONICAL_REPO_EKU_REQUIRED_FIELDS:
            if rf not in template_json:
                errors.append(f"RepoEKU template {template_path}: missing required field '{rf}'")

    # 3. Check specification table
    spec_path = "eku_middleware/eku_store/schema/repo_eku_specification.md"
    if os.path.exists(spec_path):
        with open(spec_path, "r", encoding="utf-8") as sf:
            spec_txt = sf.read()
        for rf in CANONICAL_REPO_EKU_REQUIRED_FIELDS:
            if f"`{rf}`" not in spec_txt:
                errors.append(f"RepoEKU specification {spec_path}: missing core-field documentation for `{rf}`")

    # 4. Check TypeScript definition
    ts_path = "eku_middleware/src/schema/repo_eku.ts"
    if os.path.exists(ts_path):
        with open(ts_path, "r", encoding="utf-8") as tf:
            ts_txt = tf.read()
        for rf in CANONICAL_REPO_EKU_REQUIRED_FIELDS:
            if f"{rf}:" not in ts_txt and f"{rf}?" not in ts_txt:
                errors.append(f"RepoEKU TypeScript definition {ts_path}: missing field '{rf}'")

    # 5. Check template instantiation & connected mini-corpus dry-run
    try:
        from analyzer.dry_run_ingestion import test_template_instantiation, test_connected_mini_corpus_dry_run
        test_template_instantiation()
        test_connected_mini_corpus_dry_run()
    except Exception as e:
        errors.append(f"Template instantiation check failed: {e}")

    print(f"   Contract drift checked across 4 surfaces (Schema, Template, Spec, TypeScript).")

    # 2. Validate Observations
    print("\n--- 1. Validating Observations Down-Traceability ---")
    observation_ids = set()
    for obs in observations:
        oid = obs.get("id")
        repo = obs.get("repo")
        rel_path = obs.get("filePath")
        line_range = obs.get("lineRange", [1, 1])
        full_path = os.path.join('factory', repo, rel_path)
        validate_locked_repo_reference(repo, oid, errors)

        if not oid:
            errors.append("Observation missing id")
        elif oid in observation_ids:
            errors.append(f"Duplicate observation id: {oid}")
        observation_ids.add(oid)

        if not isinstance(line_range, list) or len(line_range) != 2:
            errors.append(f"Observation {oid}: lineRange must be [start, end], got {line_range}")
            continue

        if not os.path.exists(full_path):
            if ALLOW_MISSING_FACTORY:
                if not obs.get("snippetSha256"):
                    errors.append(f"Observation {oid}: release mode requires snippetSha256 when factory/ is absent")
                continue
            errors.append(f"Observation {oid}: Source file does not exist: {full_path}")
            continue

        try:
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
            if line_range[0] < 1 or line_range[1] > len(lines) or line_range[0] > line_range[1]:
                errors.append(f"Observation {oid}: Line range {line_range} out of bounds for {rel_path} (total lines: {len(lines)})")
            else:
                actual_snippet = ''.join(lines[line_range[0] - 1:line_range[1]])
                expected_hash = hashlib.sha256(actual_snippet.encode("utf-8")).hexdigest()
                recorded_hash = obs.get("snippetSha256")
                if recorded_hash != expected_hash:
                    errors.append(f"Observation {oid}: snippetSha256 mismatch for {rel_path}:{line_range} (expected {expected_hash}, got {recorded_hash})")

                extracted_snippet = obs.get("extractedSnippet")
                if extracted_snippet and extracted_snippet not in actual_snippet:
                    errors.append(f"Observation {oid}: extractedSnippet is not contained in cited source range")
        except Exception as e:
            errors.append(f"Observation {oid}: Failed reading {full_path}: {e}")

        # Check test file if present
        test_file = obs.get("testFile")
        test_name = normalize_test_name(obs.get("testName"))
        if test_file:
            full_test_path = os.path.join('factory', repo, test_file)
            if not os.path.exists(full_test_path):
                if not ALLOW_MISSING_FACTORY:
                    errors.append(f"Observation {oid}: Test file {test_file} not found in factory/{repo}")
            elif test_name:
                test_content = open(full_test_path, 'r', encoding='utf-8', errors='ignore').read()
                if test_name not in test_content:
                    errors.append(f"Observation {oid}: Test name '{test_name}' not found in {test_file}")

    print(f"   Observations checked: {len(observations)} (Errors: {len(errors)}, Warnings: {len(warnings)})")

    # 3. Validate Historical Failures & Git Commit Provenance
    print("\n--- 2. Validating Historical Failure Git Commit Provenance ---")
    historical_failure_ids = set()
    for hf in historical_failures:
        hid = hf.get("id")
        historical_failure_ids.add(hid)
        repo = hf.get("repo")
        commit_hash = hf.get("fixCommit")
        repo_path = os.path.join('factory', repo)
        validate_locked_repo_reference(repo, hid, errors)
        if ALLOW_MISSING_FACTORY and not commit_hash:
            errors.append(f"Historical failure {hid}: release mode requires fixCommit")

        if not os.path.exists(repo_path) or not os.path.exists(os.path.join(repo_path, '.git')):
            if ALLOW_MISSING_FACTORY:
                continue
            errors.append(f"Historical failure {hid}: Repository factory/{repo} has no .git")
            continue

        res = subprocess.run(['git', 'cat-file', '-e', commit_hash], cwd=repo_path, capture_output=True)
        if res.returncode != 0:
            errors.append(f"Historical failure {hid}: Commit hash {commit_hash} does not exist in factory/{repo}")
        else:
            cmsg = subprocess.run(['git', 'log', '-n', '1', '--format=%s', commit_hash], cwd=repo_path, capture_output=True, text=True).stdout.strip()
            head_commit = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=repo_path, capture_output=True, text=True).stdout.strip()
            if commit_hash == head_commit and re.search(r"\b(bump|release|prepare version|version)\b", cmsg.lower()):
                errors.append(f"Historical failure {hid}: Commit {commit_hash} appears to be repository HEAD/version bump rather than specific bug fix.")

            lowered = " ".join([cmsg, hf.get("assumption", ""), hf.get("trigger", ""), hf.get("observedFailure", ""), hf.get("generalizedConstraint", "")]).lower()
            if not re.search(r"\b(fix|bug|panic|crash|race|deadlock|corrupt|timeout|hang|npe|leak|poison|fail)\b", lowered):
                warnings.append(f"Historical failure {hid}: Commit subject and failure text contain no obvious bug/failure terms.")

        regression = hf.get("regressionTest", "")
        regression_path = extract_regression_test_path(regression)
        if regression_path:
            full_regression_path = os.path.join(repo_path, regression_path)
            if not os.path.exists(full_regression_path):
                errors.append(f"Historical failure {hid}: Regression test file not found: factory/{repo}/{regression_path}")
            else:
                test_name = normalize_test_name(regression.split(" in ")[0])
                if test_name and test_name not in open(full_regression_path, 'r', encoding='utf-8', errors='ignore').read():
                    errors.append(f"Historical failure {hid}: Regression test name '{test_name}' not found in {regression_path}")
        elif regression:
            warnings.append(f"Historical failure {hid}: Could not parse regression test path from '{regression}'")

    # 4. Validate Claims & Abstraction Level Typing
    print("\n--- 3. Validating Claims & Abstraction Levels ---")
    valid_levels = {"BEHAVIORAL_INVARIANT", "SOLUTION_FAMILY", "IMPLEMENTATION_PATTERN", "PARAMETER_CHOICE"}
    claim_ids = set()
    for clm in claims:
        cid = clm.get("id")
        if not cid:
            errors.append("Claim missing id")
        elif cid in claim_ids:
            errors.append(f"Duplicate claim id: {cid}")
        claim_ids.add(cid)

        level = clm.get("abstractionLevel")
        if level not in valid_levels:
            errors.append(f"Claim {cid}: Invalid abstraction level '{level}' (must be one of {valid_levels})")
        if not clm.get("modelInferred"):
            errors.append(f"Claim {cid}: Cross-repository abstraction missing modelInferred flag.")

        for field in ["supportingObservationIds", "contradictingObservationIds"]:
            for oid in clm.get(field, []):
                if oid not in observation_ids:
                    errors.append(f"Claim {cid}: {field} references unknown observation id {oid}")

    # 5. Validate Matrix & Corpus Statistics Consistency
    print("\n--- 4. Validating Claim Matrix & Corpus Statistics Math ---")
    corpus = matrix_data.get("corpus", [])
    expected_corpus_size = 13
    if len(corpus) != expected_corpus_size:
        errors.append(f"Matrix corpus size {len(corpus)} != expected {expected_corpus_size}")

    matrix_counts_by_id = {}
    for item in matrix_data.get("matrix", []):
        mid = item.get("id")
        ra = item.get("repositoryAssessments", {})
        missing = set(corpus) - set(ra.keys())
        extra = set(ra.keys()) - set(corpus)
        if len(ra) != expected_corpus_size or missing or extra:
            errors.append(f"Matrix entry {mid}: expected exact corpus coverage; missing={sorted(missing)}, extra={sorted(extra)}")

        counts = {cls: 0 for cls in VALID_MATRIX_CLASSES}
        for repo, assessment in ra.items():
            cls = assessment.get("class")
            if cls not in VALID_MATRIX_CLASSES:
                errors.append(f"Matrix entry {mid}/{repo}: invalid class '{cls}'")
            else:
                counts[cls] += 1

            # Check evidence IDs cited in assessment fields or rationale
            for text_val in [assessment.get("notes", ""), assessment.get("rationale", ""), assessment.get("evidenceId", "")]:
                for ref_obs in re.findall(r"\bOBS-[A-Z0-9]+-\d+\b", text_val):
                    if ref_obs not in observation_ids:
                        errors.append(f"Matrix entry {mid}/{repo}: cites unknown observation ID '{ref_obs}'")
                for ref_hist in re.findall(r"\bHIST-[A-Z0-9]+-\d+\b", text_val):
                    if ref_hist not in historical_failure_ids:
                        errors.append(f"Matrix entry {mid}/{repo}: cites unknown historical failure ID '{ref_hist}'")
                for ref_clm in re.findall(r"\bCLM-\d+\b", text_val):
                    if ref_clm not in claim_ids:
                        errors.append(f"Matrix entry {mid}/{repo}: cites unknown claim ID '{ref_clm}'")
        matrix_counts_by_id[mid] = counts

    for eku in ekus_data.get("ekus", []):
        eid = eku.get("id")
        # Check all referenced Repo EKUs across link fields
        for sup_reku in eku.get("supportedByRepoEkus", []):
            if sup_reku not in repo_eku_ids:
                errors.append(f"Domain EKU {eid}: cites unknown supportedByRepoEku '{sup_reku}'")
        for alt_reku in eku.get("alternativeMechanismRepoEkus", []):
            if alt_reku not in repo_eku_ids:
                errors.append(f"Domain EKU {eid}: cites unknown alternativeMechanismRepoEku '{alt_reku}'")
        for ce_reku in eku.get("counterexampleRepoEkus", []):
            if ce_reku not in repo_eku_ids:
                errors.append(f"Domain EKU {eid}: cites unknown counterexampleRepoEku '{ce_reku}'")
        for na_reku in eku.get("notApplicableRepoEkus", []):
            if na_reku not in repo_eku_ids:
                errors.append(f"Domain EKU {eid}: cites unknown notApplicableRepoEku '{na_reku}'")

        # Falsification audit note quality check
        ce_note = eku.get("counterexampleAuditNote")
        if not ce_note:
            errors.append(f"Domain EKU {eid}: missing required 'counterexampleAuditNote'")
        elif len(ce_note.strip()) < 80:
            errors.append(f"Domain EKU {eid}: counterexampleAuditNote is too terse ({len(ce_note.strip())} chars < 80 chars minimum)")
        elif not ce_note.startswith("Audited across"):
            errors.append(f"Domain EKU {eid}: counterexampleAuditNote must start with standard 'Audited across' prefix")

        cs = eku.get("corpusStats", {})
        c_size = cs.get("corpusSize", 0)
        c_app = cs.get("applicable", 0)
        c_sup = cs.get("supports", 0)
        c_alt = cs.get("alternativeMechanism", 0)
        c_cnt = cs.get("counterexamples", 0)
        c_ins = cs.get("insufficientEvidence", 0)
        c_na = cs.get("notApplicable", 0)

        if (c_sup + c_alt + c_cnt + c_ins + c_na) != c_size:
            errors.append(f"EKU {eid}: Stat sum ({c_sup}+{c_alt}+{c_cnt}+{c_ins}+{c_na}) != corpusSize ({c_size})")

        if c_app != (c_sup + c_alt + c_cnt + c_ins):
            errors.append(f"EKU {eid}: Applicable ({c_app}) != supports+alt+counterex+insufficient ({c_sup+c_alt+c_cnt+c_ins})")

        matrix_counts = matrix_counts_by_id.get(eid)
        if not matrix_counts:
            errors.append(f"EKU {eid}: Missing claim matrix row")
        else:
            for cls, key in STAT_KEYS_BY_CLASS.items():
                if matrix_counts[cls] != cs.get(key, 0):
                    errors.append(f"EKU {eid}: corpusStats.{key}={cs.get(key, 0)} does not match claim matrix {cls} count={matrix_counts[cls]}")

    # 6. Check Manifest Contradiction Accounting
    print("\n--- 5. Validating Corpus Manifest Contradiction Accounting ---")
    dossier_contradiction_sum = 0
    for repo_info in manifest_data.get("repositories", []):
        rname = repo_info.get("repo")
        rfs = repo_fs_name(rname)
        dossier_path = f"eku_middleware/eku_store/{rfs}/dossier_{rfs}.json"
        if os.path.exists(dossier_path):
            with open(dossier_path) as df:
                dd = json.load(df)
                clist = dd.get("unresolvedContradictionsAndBypasses", dd.get("contradictions", []))
                dossier_contradiction_sum += len(clist)
        else:
            errors.append(f"Missing dossier for repo '{rname}' at {dossier_path}")

    manifest_reported = manifest_data.get("total_contradictions", 0)
    if manifest_reported != dossier_contradiction_sum:
        errors.append(f"Manifest reports {manifest_reported} total contradictions, but dossiers contain {dossier_contradiction_sum} contradictions in unresolvedContradictionsAndBypasses.")

    # 7. Check EKU Patch Releases
    print("\n--- 6. Validating EKU Patch Releases ---")
    patch_release_files = glob.glob("eku_middleware/eku_store/synthesized_queue_ekus_v*.json")
    for pr_file in patch_release_files:
        try:
            pr_data = load_json(pr_file)
            for req_field in ["releaseType", "baseRelease", "validationStatus", "promotionInputs", "ekus"]:
                if req_field not in pr_data:
                    errors.append(f"Patch release {pr_file} missing required header: {req_field}")

            for p_input in pr_data.get("promotionInputs", []):
                if not os.path.exists(p_input):
                    errors.append(f"Patch release {pr_file}: promotionInput file not found: {p_input}")

            for pe in pr_data.get("ekus", []):
                pe_id = pe.get("id")
                pe_claim = pe.get("claimId")
                if pe_claim and pe_claim not in claim_ids:
                    errors.append(f"Patch release {pr_file} EKU {pe_id}: references unknown claim {pe_claim}")

                for fld in ["supportingEvidence", "counterEvidence", "relatedEvidence"]:
                    for oid in pe.get(fld, []):
                        if oid not in observation_ids:
                            errors.append(f"Patch release {pr_file} EKU {pe_id}: {fld} references unknown observation {oid}")

                for hid in pe.get("historicalEvidence", []):
                    if hid not in historical_failure_ids:
                        errors.append(f"Patch release {pr_file} EKU {pe_id}: historicalEvidence references unknown failure {hid}")
        except Exception as e:
            errors.append(f"Patch release {pr_file}: Failed parsing: {e}")

    print(f"   Patch release files checked: {len(patch_release_files)}")

    # 8. Check Promotion Records
    print("\n--- 7. Validating Promotion Records ---")
    promotion_records = glob.glob("eku_middleware/eku_store/promotion/records/*.json")
    for pr_rec in promotion_records:
        try:
            rec_data = load_json(pr_rec)
            target_rel = rec_data.get("targetReleaseFile")
            if not target_rel or not os.path.exists(target_rel):
                errors.append(f"Promotion record {pr_rec}: targetReleaseFile not found: {target_rel}")
            else:
                target_data = load_json(target_rel)
                target_eku_ids = {e["id"] for e in target_data.get("ekus", [])}
                for pe in rec_data.get("promotedEkus", []):
                    if pe.get("ekuId") not in target_eku_ids:
                        errors.append(f"Promotion record {pr_rec}: promoted EKU {pe.get('ekuId')} not found in target release {target_rel}")
        except Exception as e:
            errors.append(f"Promotion record {pr_rec}: Failed parsing: {e}")

    print(f"   Promotion records checked: {len(promotion_records)}")

    # 9. Check Gap Audits & Regression Benchmarks
    print("\n--- 8. Validating Gap Audits & Regression Benchmarks ---")
    gap_audit_files = glob.glob("evaluation/gap_workflow/*.json")
    for ga_file in gap_audit_files:
        if "schema" in ga_file or "template" in ga_file:
            continue
        try:
            ga_data = load_json(ga_file)
            for gap_item in ga_data.get("gaps", []):
                gid = gap_item.get("id")
                gtype = gap_item.get("gapType")
                if gtype not in VALID_GAP_TYPES:
                    errors.append(f"Gap audit {ga_file} item {gid}: Invalid gapType '{gtype}' (must be one of {VALID_GAP_TYPES})")

                for oid in gap_item.get("patchedObservationIds", []):
                    if oid not in observation_ids:
                        errors.append(f"Gap audit {ga_file} item {gid}: patchedObservationId {oid} not in observations.json")

                for cid in gap_item.get("patchedClaimIds", []):
                    if cid not in claim_ids:
                        errors.append(f"Gap audit {ga_file} item {gid}: patchedClaimId {cid} not in claims.json")

                for hid in gap_item.get("patchedHistoricalFailureIds", []):
                    if hid not in historical_failure_ids:
                        errors.append(f"Gap audit {ga_file} item {gid}: patchedHistoricalFailureId {hid} not in historical_failures.json")
        except Exception as e:
            errors.append(f"Gap audit {ga_file}: Failed parsing: {e}")

    print(f"   Gap audit files checked: {len(gap_audit_files)}")

    # 8.5. Validate Benchmark Regression Gates
    print("\n--- 8.5. Validating Benchmark Regression Gates ---")
    try:
        from evaluation.check_regression_gates import load_gates, check_gate
        loaded_gates = load_gates()
        for g in loaded_gates:
            g_errs = check_gate(g)
            for ge in g_errs:
                errors.append(ge)
        print(f"   Benchmark regression gates checked: {len(loaded_gates)} gates")
    except Exception as e:
        errors.append(f"Failed running benchmark regression gates check: {e}")

    # 10. Check Hidden Key Scoring Rubrics
    print("\n--- 9. Validating Hidden Key Scoring Rubrics ---")
    rubric_files = glob.glob("evaluation/scorers/rubrics/*.json")
    for r_file in rubric_files:
        try:
            r_data = load_json(r_file)
            if not r_data.get("hiddenKeys"):
                errors.append(f"Rubric {r_file}: missing or empty hiddenKeys array")
            for k in r_data.get("hiddenKeys", []):
                if not k.get("acceptable_phrasings"):
                    errors.append(f"Rubric {r_file} key {k.get('id')}: missing acceptable_phrasings")
        except Exception as e:
            errors.append(f"Rubric {r_file}: Failed parsing: {e}")

    print(f"   Rubric files checked: {len(rubric_files)}")


    # 10. Deep Evaluation Run Manifests, Hashes & Pre-Registration Validation
    print("\n--- 10. Validating Evaluation Run Manifests, Hashes & Audits ---")

    # Check run_index.json if present
    run_index_file = "evaluation/run_index.json"
    if os.path.exists(run_index_file):
        try:
            rindex = load_json(run_index_file)
            canonical_set = set(rindex.get("canonicalRuns", []))
            for r_entry in rindex.get("runs", []):
                rid = r_entry.get("runId")
                r_dir = os.path.join("evaluation", "runs", rid)
                if not os.path.exists(r_dir):
                    errors.append(f"run_index.json entry '{rid}': directory does not exist: {r_dir}")
                else:
                    if rid in canonical_set and r_entry.get("status") == "SUPERSEDED":
                        errors.append(f"run_index.json entry '{rid}': cannot be listed as canonical while status is SUPERSEDED")
                    if r_entry.get("hasToolLogs"):
                        tlog_dir = os.path.join(r_dir, "tool_logs")
                        if not os.path.exists(tlog_dir):
                            errors.append(f"run_index.json entry '{rid}': claims hasToolLogs=True but tool_logs/ directory is missing")
        except Exception as e:
            errors.append(f"Failed parsing {run_index_file}: {e}")

    run_manifests = glob.glob("evaluation/runs/*/artifacts_manifest.json")
    for mf in run_manifests:
        rdir = os.path.dirname(mf)
        rid = os.path.basename(rdir)
        try:
            mdata = load_json(mf)
            tool_call_counts_by_log = {}
            for art in mdata.get("artifacts", []):
                rel_p = art.get("path") or art.get("relativePath")
                if not rel_p:
                    errors.append(f"Run manifest {mf}: artifact missing path/relativePath")
                    continue
                full_p = os.path.join(rdir, rel_p)
                if not os.path.exists(full_p):
                    errors.append(f"Run manifest {mf}: artifact path does not exist: {full_p}")
                else:
                    # Verify cryptographic SHA-256 hash match
                    rec_sha = art.get("sha256")
                    if rec_sha:
                        h = hashlib.sha256()
                        with open(full_p, "rb") as f_in:
                            while chunk := f_in.read(65536):
                                h.update(chunk)
                        calc_sha = h.hexdigest()
                        if calc_sha != rec_sha:
                            errors.append(f"Run manifest {mf}: SHA-256 mismatch for {rel_p} (expected {rec_sha[:8]}, got {calc_sha[:8]})")

                    # Check raw response frontmatter
                    if art.get("type") == "RAW_RESPONSE":
                        with open(full_p, "r", encoding="utf-8", errors="ignore") as rf:
                            txt = rf.read()
                        if not txt.startswith("---"):
                            errors.append(f"Raw response {full_p}: missing YAML frontmatter header")
                        else:
                            header_block = txt.split("---")[1]
                            for req_f in REQUIRED_FRONTMATTER_FIELDS:
                                if f"{req_f}:" not in header_block:
                                    errors.append(f"Raw response {full_p}: frontmatter missing field '{req_f}'")

                    # Check scorecard integrity
                    elif art.get("type") == "SCORECARD" and full_p.endswith(".json"):
                        sc_data = load_json(full_p)
                        for sc_f in ["suiteId", "overallScore", "dimensionScores", "recalledKeys", "scoredAt", "responsePath"]:
                            val = sc_data.get(sc_f)
                            if val is None or (isinstance(val, str) and not val.strip()):
                                errors.append(f"Scorecard JSON {full_p}: missing or blank required provenance field '{sc_f}'")
                        r_path = sc_data.get("responsePath")
                        if r_path and not os.path.exists(r_path):
                            errors.append(f"Scorecard JSON {full_p}: responsePath does not exist: {r_path}")

                    # Check scorecard markdown completeness
                    elif art.get("type") == "SCORECARD" and full_p.endswith(".md"):
                        with open(full_p, "r", encoding="utf-8") as sc_md_f:
                            sc_md_txt = sc_md_f.read()
                        if "- **Expected Contract**: ``" in sc_md_txt or "- **Expected Contract**: \\n" in sc_md_txt:
                            errors.append(f"Scorecard MD {full_p}: blank Expected Contract field")

                    # Check tool log JSONL format & registered tools
                    elif art.get("type") == "TOOL_LOG" and full_p.endswith(".jsonl"):
                        with open(full_p, "r", encoding="utf-8") as tlf:
                            line_num = 0
                            for line in tlf:
                                line = line.strip()
                                if not line:
                                    continue
                                line_num += 1
                                try:
                                    t_entry = json.loads(line)
                                    t_name = t_entry.get("toolName")
                                    if t_name and t_name not in REGISTERED_MCP_TOOLS:
                                        errors.append(f"Tool log {full_p} line {line_num}: unknown MCP tool '{t_name}'")
                                    if "method" not in t_entry or "status" not in t_entry:
                                        errors.append(f"Tool log {full_p} line {line_num}: missing method or status")
                                except Exception as e:
                                    errors.append(f"Tool log {full_p} line {line_num}: invalid JSON: {e}")
                            tool_call_counts_by_log[full_p] = line_num

            # If run directory has preregistration, verify format
            prereg_file = os.path.join(rdir, "preregistration.md")
            if os.path.exists(prereg_file):
                with open(prereg_file, "r", encoding="utf-8") as pf:
                    ptxt = pf.read()
                if "Prompt SHA-256 Checksum" not in ptxt:
                    errors.append(f"Pre-registration {prereg_file}: missing prompt checksum field")
                if "KEY-001" not in ptxt and "KEY-CANVAS-001" not in ptxt:
                    errors.append(f"Pre-registration {prereg_file}: missing hidden key definitions")

        except Exception as e:
            errors.append(f"Run manifest {mf}: Failed parsing: {e}")

    print(f"   Run manifests checked: {len(run_manifests)}")

    # 11. Validating Benchmark Score Consistency Across Scorecards & Summaries
    print("\n--- 11. Validating Benchmark Score Consistency Across Scorecards & Summaries ---")
    run_index_file = "evaluation/run_index.json"
    if os.path.exists(run_index_file):
        try:
            rindex = load_json(run_index_file)
            canonical_set = set(rindex.get("canonicalRuns", []))
            runs_map = {r["runId"]: r for r in rindex.get("runs", [])}

            # Read global summary files if present
            run_index_md = ""
            if os.path.exists("evaluation/RUN_INDEX.md"):
                with open("evaluation/RUN_INDEX.md", "r", encoding="utf-8") as f:
                    run_index_md = f.read()

            outcome_matrix_md = ""
            if os.path.exists("evaluation/OUTCOME_MATRIX.md"):
                with open("evaluation/OUTCOME_MATRIX.md", "r", encoding="utf-8") as f:
                    outcome_matrix_md = f.read()

            checked_scorecards = 0
            for rid in canonical_set:
                r_dir = os.path.join("evaluation", "runs", rid)
                sc_dir = os.path.join(r_dir, "scorecards")
                if not os.path.exists(sc_dir):
                    errors.append(f"Canonical run {rid}: scorecards directory missing: {sc_dir}")
                    continue

                scores_by_agent = {}
                agent_files = [
                    ("baselineGeneral", "baseline_general_scorecard.json"),
                    ("baselineRepoAccess", "baseline_repo_access_scorecard.json"),
                    ("eseklMcp", "esekl_mcp_scorecard.json"),
                ]
                for a_key, sc_file in agent_files:
                    sc_path = os.path.join(sc_dir, sc_file)
                    if os.path.exists(sc_path):
                        sc_json = load_json(sc_path)
                        score = sc_json.get("overallScore")
                        if score is not None:
                            scores_by_agent[a_key] = float(score)
                            checked_scorecards += 1

                # 1. Verify run_index.json
                r_entry = runs_map.get(rid)
                if not r_entry:
                    errors.append(f"Canonical run {rid} is in canonicalRuns but missing entry in 'runs'")
                else:
                    entry_scores = r_entry.get("scores", {})
                    for a_key, sc_val in scores_by_agent.items():
                        idx_val = entry_scores.get(a_key)
                        if idx_val is None:
                            errors.append(f"Canonical run {rid} in run_index.json missing '{a_key}' score")
                        elif abs(float(idx_val) - sc_val) > 0.001:
                            errors.append(f"Canonical run {rid} in run_index.json: '{a_key}' score mismatch (scorecard={sc_val}, run_index={idx_val})")

                    for metadata_error in validate_display_metadata(r_entry, canonical=True):
                        errors.append(f"Canonical run {metadata_error}")

                # 2. Verify run readme.md
                readme_path = os.path.join(r_dir, "readme.md")
                if os.path.exists(readme_path):
                    with open(readme_path, "r", encoding="utf-8") as f:
                        readme_txt = f.read()
                    if "<!-- BEGIN GENERATED RUN SCORE TABLE -->" in readme_txt and "<!-- END GENERATED RUN SCORE TABLE -->" in readme_txt:
                        actual_run_table = readme_txt.split("<!-- BEGIN GENERATED RUN SCORE TABLE -->")[1].split("<!-- END GENERATED RUN SCORE TABLE -->")[0].strip()
                        from evaluation.build_run_summaries import generate_run_score_table
                        expected_run_table = generate_run_score_table(rid, rindex).strip()
                        if actual_run_table != expected_run_table:
                            errors.append(f"Canonical run {rid} readme.md generated score table is stale! Run 'python3 evaluation/build_run_summaries.py' to regenerate.")
                    else:
                        errors.append(f"Canonical run {rid} readme.md missing generated score table marker comments")

                # 3. Verify telemetry_notes.md
                telem_path = os.path.join(r_dir, "telemetry_notes.md")
                if os.path.exists(telem_path):
                    with open(telem_path, "r", encoding="utf-8") as f:
                        telem_txt = f.read()
                    for a_key, sc_val in scores_by_agent.items():
                        candidates = [f"{sc_val:.2f}", f"{sc_val:.1f}", str(sc_val)]
                        if not any(c in telem_txt for c in candidates):
                            errors.append(f"Canonical run {rid} telemetry_notes.md does not contain scorecard score {sc_val} for {a_key}")

            # Check historical & non-canonical runs displayMetadata
            for r_entry in rindex.get("runs", []):
                rid = r_entry.get("runId")
                if rid not in canonical_set:
                    for metadata_error in validate_display_metadata(r_entry, canonical=False):
                        errors.append(f"Historical run {metadata_error}")

            print(f"   Canonical runs score consistency checked: {len(canonical_set)} runs ({checked_scorecards} scorecards)")

            # 5. Byte-for-byte freshness check for RUN_INDEX.md generated table
            if run_index_md:
                if "<!-- BEGIN GENERATED CANONICAL RUNS TABLE -->" in run_index_md and "<!-- END GENERATED CANONICAL RUNS TABLE -->" in run_index_md:
                    actual_block = run_index_md.split("<!-- BEGIN GENERATED CANONICAL RUNS TABLE -->")[1].split("<!-- END GENERATED CANONICAL RUNS TABLE -->")[0].strip()
                    from evaluation.build_run_summaries import generate_canonical_table
                    expected_block = generate_canonical_table(rindex).strip()
                    if actual_block != expected_block:
                        errors.append("evaluation/RUN_INDEX.md canonical generated table block is stale! Run 'python3 evaluation/build_run_summaries.py' to regenerate.")
                else:
                    errors.append("evaluation/RUN_INDEX.md missing canonical generated table marker comments")

                if "<!-- BEGIN GENERATED HISTORICAL RUNS TABLE -->" in run_index_md and "<!-- END GENERATED HISTORICAL RUNS TABLE -->" in run_index_md:
                    actual_hist = run_index_md.split("<!-- BEGIN GENERATED HISTORICAL RUNS TABLE -->")[1].split("<!-- END GENERATED HISTORICAL RUNS TABLE -->")[0].strip()
                    from evaluation.build_run_summaries import generate_historical_table
                    expected_hist = generate_historical_table(rindex).strip()
                    if actual_hist != expected_hist:
                        errors.append("evaluation/RUN_INDEX.md historical generated table block is stale! Run 'python3 evaluation/build_run_summaries.py' to regenerate.")
                else:
                    errors.append("evaluation/RUN_INDEX.md missing historical generated table marker comments")

            # 6. Byte-for-byte freshness check for OUTCOME_MATRIX.md generated table
            if outcome_matrix_md:
                if "<!-- BEGIN GENERATED OUTCOME MATRIX TABLE -->" in outcome_matrix_md and "<!-- END GENERATED OUTCOME MATRIX TABLE -->" in outcome_matrix_md:
                    actual_matrix = outcome_matrix_md.split("<!-- BEGIN GENERATED OUTCOME MATRIX TABLE -->")[1].split("<!-- END GENERATED OUTCOME MATRIX TABLE -->")[0].strip()
                    from evaluation.build_run_summaries import generate_outcome_matrix_table
                    expected_matrix = generate_outcome_matrix_table(rindex).strip()
                    if actual_matrix != expected_matrix:
                        errors.append("evaluation/OUTCOME_MATRIX.md generated table block is stale or modified! Run 'python3 evaluation/build_run_summaries.py' to regenerate.")
                else:
                    errors.append("evaluation/OUTCOME_MATRIX.md missing generated table marker comments")

            # 7. Byte-for-byte freshness check for coverage.md
            coverage_path = "eku_middleware/eku_store/repo_ekus/coverage.md"
            if os.path.exists(coverage_path):
                with open(coverage_path, "r", encoding="utf-8") as cov_f:
                    actual_cov = cov_f.read().strip()
                from analyzer.generate_coverage_report import build_coverage_report_content
                expected_cov = build_coverage_report_content().strip()
                if actual_cov != expected_cov:
                    errors.append("eku_middleware/eku_store/repo_ekus/coverage.md is stale! Run 'python3 analyzer/generate_coverage_report.py' to regenerate.")

        except Exception as e:
            errors.append(f"Failed score consistency validation: {e}")

    # Print summary
    print("\n" + "=" * 60)
    print(f"VALIDATION SUMMARY: {len(errors)} ERRORS, {len(warnings)} WARNINGS")
    print("=" * 60)

    if warnings:
        print("\n⚠️ WARNINGS DETECTED:")
        for w in warnings:
            print(f"  - {w}")

    if errors:
        print("\n❌ ERRORS DETECTED:")
        for e in errors:
            print(f"  - {e}")
        return False
    else:
        print("\n🎉 ALL MECHANICAL INTEGRITY CHECKS PASSED PERFECTLY!")
        return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
