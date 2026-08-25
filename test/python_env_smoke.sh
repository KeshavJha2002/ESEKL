#!/usr/bin/env bash
# Delegation wrapper to canonical scripts/python_validation_smoke.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

exec bash "${WORKSPACE_ROOT}/scripts/python_validation_smoke.sh" "$@"
