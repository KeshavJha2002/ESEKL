#!/usr/bin/env node
import { ESEKLStore } from '../src/store/index.js';

// Parse --store-root=<path> if provided
let storeRoot = null;
const filteredArgs = [];

for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--store-root=')) {
    storeRoot = arg.split('=')[1];
  } else {
    filteredArgs.push(arg);
  }
}

const store = new ESEKLStore(storeRoot);
const command = filteredArgs[0];
const query = filteredArgs.slice(1).join(' ');

if (!command || command === '--help' || command === '-h') {
  console.log(`
ESEKL Empirical Knowledge CLI
Usage:
  esekl-query [--store-root=<path>] capabilities
  esekl-query [--store-root=<path>] dossiers
  esekl-query [--store-root=<path>] eku <EKU-ID>
  esekl-query [--store-root=<path>] repo-ekus [repo]
  esekl-query [--store-root=<path>] repo-eku <REKU-ID>
  esekl-query [--store-root=<path>] keyword-groups [keyword]
  esekl-query [--store-root=<path>] search <term>
  esekl-query [--store-root=<path>] failure <problem>
  esekl-query [--store-root=<path>] provenance <evidence-id>
  esekl-query [--store-root=<path>] critique "<proposed-design>"
  esekl-query [--store-root=<path>] verify "<requirement-or-design>"
`);
  process.exit(0);
}

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
    console.log(JSON.stringify(store.searchEvidence(command + ' ' + query), null, 2));
}
