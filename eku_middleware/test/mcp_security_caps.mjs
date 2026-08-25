import assert from 'node:assert';
import process from 'node:process';
import { ESEKLMCPServer } from '../src/mcp/server.js';

console.log('🧪 Running MCP Security & Disclosure Caps Tests...');

const server = new ESEKLMCPServer();

async function testPaginationCap() {
  const req = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'list_dossiers',
      arguments: { pageSize: 100 } // Requesting oversized page
    }
  };
  const res = await server.handleRequest(req);
  const data = JSON.parse(res.result.content[0].text);
  assert(data.dossiers.length <= 10, `Expected max 10 dossiers returned, got ${data.dossiers.length}`);
  console.log('  ✅ list_dossiers pagination cap enforced (<= 10 items)');
}

async function testSearchLimitCap() {
  const req = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'search_evidence',
      arguments: { query: 'queue', limit: 100 } // Requesting oversized limit
    }
  };
  const res = await server.handleRequest(req);
  const data = JSON.parse(res.result.content[0].text);
  assert(data.results.length <= 10, `Expected max 10 search results, got ${data.results.length}`);
  console.log('  ✅ search_evidence limit cap enforced (<= 10 items)');
}

async function testPathSanitization() {
  const req = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'get_dossier_slice',
      arguments: { repo: 'river', sliceType: 'state_machine' }
    }
  };
  const res = await server.handleRequest(req);
  const text = res.result.content[0].text;
  assert(!text.includes(process.cwd()), 'No internal full system paths should leak in MCP responses');
  console.log('  ✅ Path sanitization verified (relative repository paths only)');
}

async function testRepoEkusPaginationCap() {
  const req = {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'list_repo_ekus',
      arguments: { pageSize: 100 } // Requesting oversized page
    }
  };
  const res = await server.handleRequest(req);
  const data = JSON.parse(res.result.content[0].text);
  assert(data.repoEkus.length <= 10, `Expected max 10 repo EKUs returned, got ${data.repoEkus.length}`);
  assert(data.page === 1);
  assert(data.pageSize === 10);
  console.log('  ✅ list_repo_ekus pagination cap enforced (<= 10 items)');
}

async function testKeywordGroupsPaginationCap() {
  const req = {
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: {
      name: 'list_keyword_groups',
      arguments: { pageSize: 100 } // Requesting oversized page
    }
  };
  const res = await server.handleRequest(req);
  const data = JSON.parse(res.result.content[0].text);
  assert(data.keywordGroups.length <= 20, `Expected max 20 keyword groups returned, got ${data.keywordGroups.length}`);
  assert(data.page === 1);
  assert(data.pageSize === 20);
  console.log('  ✅ list_keyword_groups pagination cap enforced (<= 20 items)');
}

async function runCapsTests() {
  try {
    await testPaginationCap();
    await testSearchLimitCap();
    await testPathSanitization();
    await testRepoEkusPaginationCap();
    await testKeywordGroupsPaginationCap();
    console.log('🎉 ALL MCP SECURITY & DISCLOSURE CAPS TESTS PASSED PERFECTLY!\n');
  } catch (err) {
    console.error('❌ Caps test failure:', err);
    process.exit(1);
  }
}

runCapsTests();
