#!/usr/bin/env node
import { cpSync, existsSync, mkdtempSync, rmSync, renameSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ESEKLMCPServer } from '../src/mcp/server.js';
import { ESEKLStore } from '../src/store/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getArg(name, fallback = null) {
  const prefix = `--${name}=`;
  const arg = process.argv.find(a => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function printHelp() {
  console.log(`
ESEKL CLI

Usage:
  esekl init [--dir=.eku_store] [--ref=main] [--force]
  esekl mcp [--store-root=<path>] [--log-jsonrpc=<path>]
  esekl query [--store-root=<path>] <command> [args...]
  esekl capabilities
  esekl search <term>
  esekl eku <EKU-ID>

Examples:
  npx esekl init
  npx esekl capabilities
  npx esekl mcp
`);
}

function run(command, args, options = {}) {
  const res = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (res.error) {
    throw res.error;
  }
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

function initStore() {
  const outDir = resolve(process.cwd(), getArg('dir', '.eku_store'));
  const ref = getArg('ref', 'main');
  const repo = getArg('repo', 'https://github.com/KeshavJha2002/ESEKL.git');
  const sourceDir = getArg('source-dir');
  const force = hasFlag('force');

  if (existsSync(outDir)) {
    if (!force) {
      console.error(`ESEKL store already exists: ${outDir}`);
      console.error('Use --force to replace it.');
      process.exit(1);
    }
    rmSync(outDir, { recursive: true, force: true });
  }

  const tmp = mkdtempSync(join(tmpdir(), 'esekl-init-'));
  try {
    if (sourceDir) {
      cpSync(resolve(process.cwd(), sourceDir), outDir, { recursive: true });
    } else {
      const cloneDir = join(tmp, 'repo');
      run('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', '--branch', ref, repo, cloneDir]);
      run('git', ['sparse-checkout', 'set', 'eku_store'], { cwd: cloneDir });
      renameSync(join(cloneDir, 'eku_store'), outDir);
    }
    console.log(`ESEKL store initialized at ${outDir}`);
    console.log('Try: esekl capabilities');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

async function startMcp() {
  let storeRoot = getArg('store-root');
  let logJsonRpc = getArg('log-jsonrpc');
  const server = new ESEKLMCPServer({ storeRoot, logJsonRpc });
  if (process.argv.includes('--list-tools')) {
    const req = { id: 1, method: 'tools/list' };
    const res = await server.handleRequest(req);
    console.log(JSON.stringify(res.result.tools, null, 2));
    return;
  }
  server.startStdio();
}

function runQuery(command, args) {
  const storeRoot = getArg('store-root');
  const store = new ESEKLStore(storeRoot);
  const query = args.join(' ');

  switch (command) {
    case 'capabilities':
      console.log(JSON.stringify(store.getCapabilities(), null, 2));
      break;
    case 'dossiers':
      console.log(JSON.stringify(store.listDossiers(), null, 2));
      break;
    case 'eku':
      console.log(JSON.stringify(store.getEKU(query.trim()), null, 2));
      break;
    case 'repo-ekus':
      console.log(JSON.stringify(store.listRepoEkus(query.trim() ? { repo: query.trim() } : {}), null, 2));
      break;
    case 'repo-eku':
      console.log(JSON.stringify(store.getRepoEku({ repoEkuId: query.trim() }), null, 2));
      break;
    case 'keyword-groups':
      console.log(JSON.stringify(store.listKeywordGroups(query.trim() ? { keyword: query.trim() } : {}), null, 2));
      break;
    case 'search':
      console.log(JSON.stringify(store.searchEvidence(query), null, 2));
      break;
    case 'provenance':
      console.log(JSON.stringify(store.explainProvenance(query.trim()), null, 2));
      break;
    default:
      console.log(JSON.stringify(store.searchEvidence([command, query].filter(Boolean).join(' ')), null, 2));
  }
}

const args = process.argv.slice(2).filter(a => !a.startsWith('--store-root=') && !a.startsWith('--log-jsonrpc='));
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  printHelp();
} else if (command === 'init') {
  initStore();
} else if (command === 'mcp') {
  await startMcp();
} else if (command === 'query') {
  runQuery(args[1], args.slice(2));
} else {
  runQuery(command, args.slice(1));
}
