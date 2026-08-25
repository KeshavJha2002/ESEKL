#!/usr/bin/env bash
# Deterministic clean-environment Python validation & scoring smoke runner
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TEMP_VENV=$(mktemp -d -t esekl-clean-venv-XXXXXX)

cleanup() {
  rm -rf "${TEMP_VENV}"
}
trap cleanup EXIT

echo "🧪 Running Clean-Environment Python Validation & Scorer Smoke Test..."
echo "   Workspace Root: ${WORKSPACE_ROOT}"
echo "   Temp Virtualenv: ${TEMP_VENV}"

python3 -m venv "${TEMP_VENV}"
source "${TEMP_VENV}/bin/activate"

pip install --quiet -r "${WORKSPACE_ROOT}/requirements.txt"

python3 "${WORKSPACE_ROOT}/analyzer/validate_evidence_ledger.py"
python3 "${WORKSPACE_ROOT}/evaluation/scorers/test_scorer.py"

echo "🎉 ALL CLEAN-ENVIRONMENT PYTHON SMOKE TESTS PASSED PERFECTLY!"
