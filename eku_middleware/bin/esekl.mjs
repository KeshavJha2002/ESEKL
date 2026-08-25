#!/usr/bin/env node
import { cpSync, existsSync, mkdtempSync, rmSync, renameSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ESEKLMCPServer } from '../src/mcp/server.js';
import { ESEKLStore } from '../src/store/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Default global store: ~/.esekl/store */
function globalStoreDir() {
  return join(homedir(), '.esekl', 'store');
}

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
  esekl init [--dir=<path>] [--ref=main] [--force]
  esekl mcp [--store-root=<path>] [--log-jsonrpc=<path>]
  esekl query [--store-root=<path>] <command> [args...]
  esekl capabilities
  esekl search <term>
  esekl eku <EKU-ID>

Store resolution (in order):
  1. --store-root=<path>   explicit override
  2. ~/.esekl/store        global default (written by: esekl init)

Examples:
  npx esekl init           # one-time setup, writes to ~/.esekl/store
  npx esekl capabilities   # verify store loaded
  npx esekl mcp            # start MCP server, no path needed
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
  const outDir = resolve(getArg('dir', globalStoreDir()));
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

/** Bundled store ships inside the npm package at eku_middleware/eku_store/ */
function bundledStoreDir() {
  return join(__dirname, '..', 'eku_store');
}

function resolveStoreRoot() {
  const explicit = getArg('store-root');
  if (explicit) return explicit;
  const global = globalStoreDir();
  if (existsSync(global)) return global;
  const bundled = bundledStoreDir();
  if (existsSync(bundled)) return bundled;
  return null;
}

/** Fire-and-forget PostHog capture. Set ESEKL_NO_TELEMETRY=1 to opt out. */
export function capture(event, properties = {}) {
  if (process.env.ESEKL_NO_TELEMETRY) return;
  fetch('https://us.i.posthog.com/capture/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: 'phc_ozRYAop5F4RKn4kMjczsdkj9dGiV2S8fXUmFSdu3VPKF',
      event,
      distinct_id: 'anonymous',
      properties: {
        version: '1.0.1',
        platform: process.platform,
        node_version: process.version,
        ...properties,
      },
    }),
  }).catch(() => {});
}

async function startMcp() {
  const storeRoot = resolveStoreRoot();
  const logJsonRpc = getArg('log-jsonrpc');
  if (!storeRoot) {
    console.error('ESEKL store not found. Run: npx esekl init');
    process.exit(1);
  }
  const server = new ESEKLMCPServer({ storeRoot, logJsonRpc });
  if (process.argv.includes('--list-tools')) {
    const req = { id: 1, method: 'tools/list' };
    const res = await server.handleRequest(req);
    console.log(JSON.stringify(res.result.tools, null, 2));
    return;
  }
  capture('mcp_start');
  server.startStdio();
}

function runQuery(command, args) {
  const storeRoot = resolveStoreRoot();
  if (!storeRoot) {
    console.error('ESEKL store not found. Run: npx esekl init');
    process.exit(1);
  }
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
