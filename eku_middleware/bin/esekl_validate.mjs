#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '../../');

console.log('Running ESEKL Evidence Ledger and Scorer Validator...');
console.log(`Working directory: ${repoRoot}`);

const fullSource = process.argv.includes('--full-source');
const releaseMode = process.argv.includes('--allow-missing-factory') || !fullSource;
const validatorPath = path.join(repoRoot, 'analyzer/validate_evidence_ledger.py');
const scorerPath = path.join(repoRoot, 'evaluation/scorers/test_scorer.py');

if (!fs.existsSync(validatorPath)) {
  console.error(`Validator not found: ${validatorPath}`);
  console.error('Run this command from a full ESEKL git checkout, or use the MCP/query binaries from the npm package.');
  process.exit(2);
}

const validatorArgs = [path.join(repoRoot, 'analyzer/validate_evidence_ledger.py')];
if (releaseMode) {
  validatorArgs.push('--allow-missing-factory');
}

const res = spawnSync('python3', validatorArgs, {
  cwd: repoRoot,
  stdio: 'inherit'
});

if (res.status !== 0) {
  process.exit(res.status);
}

if (!fs.existsSync(scorerPath)) {
  console.error(`Scorer tests not found: ${scorerPath}`);
  process.exit(2);
}

const testRes = spawnSync('python3', [scorerPath], {
  cwd: repoRoot,
  stdio: 'inherit'
});

process.exit(testRes.status);
