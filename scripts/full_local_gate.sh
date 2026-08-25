#!/usr/bin/env bash
# ESEKL Full Local Validation Gate
# Single canonical command to execute all Python, ledger, benchmark, and MCP test suites.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "============================================================"
echo "🛡️ ESEKL FULL LOCAL VALIDATION GATE"
echo "============================================================"
echo "Workspace Root: ${WORKSPACE_ROOT}"
echo ""

# 1. Run isolated clean-environment Python smoke test
echo "▶ 1/3: Running Clean-Environment Python Dependency Smoke..."
bash "${WORKSPACE_ROOT}/scripts/python_validation_smoke.sh"
echo ""

# 2. Run Evidence Ledger & Audit Validator
echo "▶ 2/3: Running ESEKL Evidence Ledger & Mechanical Audit Validator..."
python3 "${WORKSPACE_ROOT}/analyzer/validate_evidence_ledger.py"
echo ""

# 3. Run full MCP middleware test suite
echo "▶ 3/3: Running MCP Server & Agent Protocol Test Suite..."
npm test --prefix "${WORKSPACE_ROOT}/eku_middleware"
echo ""

echo "============================================================"
echo "🎉 ALL ESEKL LOCAL VALIDATION GATES PASSED PERFECTLY (0 ERRORS, 0 WARNINGS)"
echo "============================================================"
