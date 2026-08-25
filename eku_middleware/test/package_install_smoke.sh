#!/usr/bin/env bash
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../" && pwd)"
PACKAGE_DIR="$REPO_ROOT/eku_middleware"
TEMP_DIR=$(mktemp -d -t esekl-package-smoke-XXXXXX)
export npm_config_cache="/tmp/npm-cache"

echo "🧪 Running Packaged Distribution Install Smoke Test..."
echo "   Temp Directory: $TEMP_DIR"
echo "   Store Root: $REPO_ROOT"

cd "$PACKAGE_DIR"
TARBALL_NAME=$(npm pack --pack-destination "$TEMP_DIR" | tail -n 1)

cd "$TEMP_DIR"
npm init -y > /dev/null 2>&1
npm install "./$TARBALL_NAME" > /dev/null 2>&1

echo "  ✅ Installed package $TARBALL_NAME successfully"

echo "  ▶ Testing: esekl-mcp --list-tools"
./node_modules/.bin/esekl-mcp --list-tools > /dev/null

echo "  ▶ Testing: esekl-query --store-root=$REPO_ROOT capabilities"
./node_modules/.bin/esekl-query --store-root="$REPO_ROOT" capabilities > /dev/null

echo "  ▶ Testing: esekl-query --store-root=$REPO_ROOT eku EKU-QUEUE-015"
./node_modules/.bin/esekl-query --store-root="$REPO_ROOT" eku EKU-QUEUE-015 > /dev/null

echo "  ▶ Testing: esekl init --source-dir=$REPO_ROOT/eku_store"
mkdir nested-project
cd nested-project
../node_modules/.bin/esekl init --source-dir="$REPO_ROOT/eku_store" > /dev/null
../node_modules/.bin/esekl capabilities > /dev/null
../node_modules/.bin/esekl mcp --list-tools > /dev/null

# Clean up
rm -rf "$TEMP_DIR"

echo "🎉 ALL PACKAGED INSTALL SMOKE TESTS PASSED PERFECTLY!"
