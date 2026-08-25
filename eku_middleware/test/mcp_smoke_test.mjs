import assert from 'node:assert';
import { ESEKLMCPServer } from '../src/mcp/server.js';

console.log('🧪 Running MCP JSON-RPC Protocol Smoke Tests...');

const server = new ESEKLMCPServer();

async function testInitialize() {
  const req = { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} };
  const res = await server.handleRequest(req);
  assert.strictEqual(res.jsonrpc, '2.0');
  assert.strictEqual(res.id, 1);
  assert.strictEqual(res.result.serverInfo.name, 'esekl-mcp-server');
  console.log('  ✅ initialize protocol check passed');
}

async function testToolsList() {
  const req = { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} };
  const res = await server.handleRequest(req);
  assert.strictEqual(res.jsonrpc, '2.0');
  assert.strictEqual(res.id, 2);
  assert(Array.isArray(res.result.tools));
  assert(res.result.tools.length >= 11, `Expected >= 11 tools, got ${res.result.tools.length}`);
  const toolNames = res.result.tools.map(t => t.name);
  assert(toolNames.includes('get_capabilities'));
  assert(toolNames.includes('get_eku'));
  assert(toolNames.includes('explain_provenance'));
  assert(toolNames.includes('compare_design_against_evidence'));
  assert(toolNames.includes('generate_verification_plan'));
  console.log(`  ✅ tools/list check passed (${res.result.tools.length} tools registered)`);
}

async function testGetCapabilities() {
  const req = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'get_capabilities', arguments: {} }
  };
  const res = await server.handleRequest(req);
  assert.strictEqual(res.jsonrpc, '2.0');
  const data = JSON.parse(res.result.content[0].text);
  assert.strictEqual(data.corpusSize, 13);
  assert.strictEqual(data.totalEkus, 20);
  assert.strictEqual(data.totalRepoEkus, 15);
  assert.strictEqual(data.totalObservations, 30);
  assert.strictEqual(data.repoEkuCoverage.coverageRatio, '7/13');
  assert(Array.isArray(data.repoEkuCoverage.loadErrors));
  console.log('  ✅ tools/call get_capabilities check passed');
}

async function testGetEKU() {
  const req = {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: { name: 'get_eku', arguments: { ekuId: 'EKU-QUEUE-015' } }
  };
  const res = await server.handleRequest(req);
  const data = JSON.parse(res.result.content[0].text);
  assert.strictEqual(data.id, 'EKU-QUEUE-015');
  assert.strictEqual(data.claimId, 'CLM-015');
  assert(Array.isArray(data.supportingEvidence));
  console.log('  ✅ tools/call get_eku (EKU-QUEUE-015) check passed');
}

async function testExplainProvenance() {
  const req = {
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: { name: 'explain_provenance', arguments: { evidenceId: 'OBS-BULLMQ-002' } }
  };
  const res = await server.handleRequest(req);
  const data = JSON.parse(res.result.content[0].text);
  assert.strictEqual(data.evidenceId, 'OBS-BULLMQ-002');
  assert.strictEqual(data.repository, 'bullmq');
  assert.strictEqual(data.epistemicStatus, 'SOURCE_OBSERVED');
  console.log('  ✅ tools/call explain_provenance (OBS-BULLMQ-002) check passed');
}

async function testCritiqueAndVerification() {
  const critiqueReq = {
    jsonrpc: '2.0',
    id: 6,
    method: 'tools/call',
    params: {
      name: 'compare_design_against_evidence',
      arguments: { proposedDesign: 'We execute payment settlements with async background retry workers and store results in Postgres.' }
    }
  };
  const critiqueRes = await server.handleRequest(critiqueReq);
  const critiqueData = JSON.parse(critiqueRes.result.content[0].text);
  assert(critiqueData.matchingEkus.includes('EKU-QUEUE-015'));
  assert(critiqueData.missingInvariants.length > 0);
  console.log('  ✅ tools/call compare_design_against_evidence check passed');

  const planReq = {
    jsonrpc: '2.0',
    id: 7,
    method: 'tools/call',
    params: {
      name: 'generate_verification_plan',
      arguments: { requirementOrDesign: 'Zero-downtime payments platform with lease expiration recovery' }
    }
  };
  const planRes = await server.handleRequest(planReq);
  const planData = JSON.parse(planRes.result.content[0].text);
  assert(planData.testSuites.length >= 4);
  console.log('  ✅ tools/call generate_verification_plan check passed');
}

async function runAll() {
  try {
    await testInitialize();
    await testToolsList();
    await testGetCapabilities();
    await testGetEKU();
    await testExplainProvenance();
    await testCritiqueAndVerification();
    console.log('🎉 ALL MCP PROTOCOL SMOKE TESTS PASSED PERFECTLY!\n');
  } catch (err) {
    console.error('❌ Smoke test failure:', err);
    process.exit(1);
  }
}

runAll();
