#!/usr/bin/env node
/**
 * eku-extract.mjs
 *
 * Unified Headless EKU Extraction Driver.
 * Extracts structural facts, Git commit history/fixes, and test invariants
 * from a target repository into `.eku/` for in-session agent investigation.
 *
 * Usage:
 *   node bin/eku_extract.mjs <target-repo-path> [--out-dir <outDir>]
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractBugFixHistory } from '../src/extractors/git_history.js';
import { extractTestInvariantsFromRepo } from '../src/extractors/test_invariants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const targetRepoArg = process.argv[2] || '.';
const targetRepo = resolve(process.cwd(), targetRepoArg);

let explicitOutDir = null;
const outDirIdx = process.argv.indexOf('--out-dir');
if (outDirIdx !== -1 && process.argv[outDirIdx + 1]) {
  explicitOutDir = resolve(process.cwd(), process.argv[outDirIdx + 1]);
}

if (!existsSync(targetRepo) || !statSync(targetRepo).isDirectory()) {
  console.error(`Error: Directory not found: ${targetRepo}`);
  process.exit(1);
}

console.log(`[EKU-Extract] Starting empirical extraction for: ${targetRepo}`);

// 1. Output directories
const repoName = targetRepo.split('/').pop() || 'unknown';
const ekuDir = join(targetRepo, '.eku');
mkdirSync(ekuDir, { recursive: true });

const outDirs = [ekuDir];
if (explicitOutDir) {
  mkdirSync(explicitOutDir, { recursive: true });
  outDirs.push(explicitOutDir);
} else {
  // Check if standard eku_store/<repoName> exists
  const storeDir = resolve(process.cwd(), 'eku_store', repoName);
  mkdirSync(storeDir, { recursive: true });
  outDirs.push(storeDir);
}

// 2. Discover files recursively (respecting common ignores)
function walkDir(dir, baseDir, fileList = []) {
  const ignorePatterns = new Set(['.git', 'node_modules', 'dist', 'build', 'vendor', '.ua', '.understand-anything', '.eku']);
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (ignorePatterns.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    const relPath = relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      walkDir(fullPath, baseDir, fileList);
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      let category = 'other';
      if (['.go', '.py', '.ts', '.js', '.rs', '.java', '.c', '.cpp', '.h', '.rb', '.php'].includes(ext)) {
        category = 'code';
      } else if (['.md', '.txt', '.rst'].includes(ext)) {
        category = 'docs';
      } else if (['.json', '.yaml', '.yml', '.toml', '.ini'].includes(ext)) {
        category = 'config';
      }

      const isTest = entry.name.includes('_test.') || entry.name.includes('.test.') || entry.name.includes('.spec.') || entry.name.startsWith('test_');

      fileList.push({
        path: relPath,
        name: entry.name,
        ext,
        category,
        isTest,
        sizeBytes: statSync(fullPath).size,
      });
    }
  }
  return fileList;
}

const allFiles = walkDir(targetRepo, targetRepo);
const codeFiles = allFiles.filter(f => f.category === 'code');
const testFiles = allFiles.filter(f => f.isTest);
const docFiles = allFiles.filter(f => f.category === 'docs');

console.log(`[EKU-Extract] Discovered ${allFiles.length} files (${codeFiles.length} code files, ${testFiles.length} test files).`);

// 3. Extract Git History Archaeology & Bug Fixes
console.log(`[EKU-Extract] Extracting Git history and bug fix archaeology...`);
const bugFixes = extractBugFixHistory(targetRepo, 250);
console.log(`[EKU-Extract] Extracted ${bugFixes.length} categorized historical bug fixes / race condition patches.`);

// 4. Extract Test Invariants & Behavioral Scenarios
console.log(`[EKU-Extract] Extracting test suite behavioral invariants...`);
const testScenarios = extractTestInvariantsFromRepo(targetRepo, testFiles.map(f => f.path));
console.log(`[EKU-Extract] Extracted ${testScenarios.length} test invariant scenarios.`);

// 5. Read project metadata (README / Package / Go Module)
let readmeSnippet = '';
const readmePath = join(targetRepo, 'readme.md');
if (existsSync(readmePath)) {
  try {
    readmeSnippet = readFileSync(readmePath, 'utf8').slice(0, 4000);
  } catch {}
}

// 6. Write Unified Research Context Package
const researchContext = {
  project: {
    name: repoName,
    repoPath: targetRepo,
    analyzedAt: new Date().toISOString(),
    fileStats: {
      totalFiles: allFiles.length,
      codeFiles: codeFiles.length,
      testFiles: testFiles.length,
      docFiles: docFiles.length,
    },
    languages: Array.from(new Set(codeFiles.map(f => f.ext))).filter(Boolean),
  },
  readmeSnippet,
  codeInventory: codeFiles.map(f => ({ path: f.path, sizeBytes: f.sizeBytes, isTest: f.isTest })),
  testScenariosSummary: testScenarios.slice(0, 150),
  historicalFixesSummary: bugFixes.slice(0, 150),
};

for (const dir of outDirs) {
  writeFileSync(join(dir, 'research_context.json'), JSON.stringify(researchContext, null, 2));
  writeFileSync(join(dir, 'git_history.json'), JSON.stringify(bugFixes, null, 2));
  writeFileSync(join(dir, 'test_invariants.json'), JSON.stringify(testScenarios, null, 2));
  console.log(`[EKU-Extract] ✅ Written extraction context to: ${dir}`);
}

console.log(`[EKU-Extract] Ready for in-session multi-agent EKU investigation!`);
