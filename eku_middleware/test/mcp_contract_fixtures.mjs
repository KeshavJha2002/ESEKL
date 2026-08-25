import assert from 'node:assert';
import { ESEKLMCPServer } from '../src/mcp/server.js';

console.log('🧪 Running Comprehensive MCP Contract Conformance Fixtures (20 Tools)...');

const server = new ESEKLMCPServer();

async function callTool(name, args = {}) {
  const req = {
    jsonrpc: '2.0',
    id: Math.floor(Math.random() * 100000),
    method: 'tools/call',
    params: { name, arguments: args }
  };
  const res = await server.handleRequest(req);
  assert.strictEqual(res.jsonrpc, '2.0', `${name}: response must be JSON-RPC 2.0`);
  assert(res.result && Array.isArray(res.result.content), `${name}: response must contain content array`);
  const parsed = JSON.parse(res.result.content[0].text);
  assert(!parsed.error || parsed.error === 'NOT_FOUND', `${name}: unexpected server execution error: ${JSON.stringify(parsed)}`);
  return parsed;
}

function assertNoRawAbsolutePaths(obj, toolName) {
  const str = JSON.stringify(obj);
  assert(!str.includes('factory/'),
    `${toolName}: response leaked internal workspace absolute path`);
}

async function testAll20ToolContracts() {
  // --- 1. Discovery Tier (6 tools) ---

  // 1. get_capabilities
  const cap = await callTool('get_capabilities');
  assert(cap.corpusSize > 0, 'get_capabilities: missing corpusSize');
  assert(cap.totalEkus > 0, 'get_capabilities: missing totalEkus');
  assert(Array.isArray(cap.repositories), 'get_capabilities: missing repositories array');
  assert(typeof cap.domain === 'string', 'get_capabilities: missing domain');
  assertNoRawAbsolutePaths(cap, 'get_capabilities');

  // 2. list_dossiers
  const dos = await callTool('list_dossiers', { page: 1, pageSize: 5 });
  assert(typeof (dos.totalFound ?? dos.total) === 'number', 'list_dossiers: missing total / totalFound');
  assert(Array.isArray(dos.dossiers), 'list_dossiers: missing dossiers array');
  assert(dos.dossiers.length <= 5, 'list_dossiers: exceeded pageSize limit');
  assertNoRawAbsolutePaths(dos, 'list_dossiers');

  // 3. get_dossier_summary
  const dsum = await callTool('get_dossier_summary', { repo: 'river' });
  assert.strictEqual(dsum.repo, 'river');
  assert(Array.isArray(dsum.keyMechanisms), 'get_dossier_summary: missing keyMechanisms');
  assertNoRawAbsolutePaths(dsum, 'get_dossier_summary');

  // 4. list_research_threads
  const threads = await callTool('list_research_threads');
  assert(Array.isArray(threads.threads), 'list_research_threads: missing threads');
  assertNoRawAbsolutePaths(threads, 'list_research_threads');

  // 5. get_dossier_slice
  const slice = await callTool('get_dossier_slice', { repo: 'river', sliceType: 'lease_management' });
  assert.strictEqual(slice.repo, 'river');
  assert.strictEqual(slice.sliceType, 'lease_management');
  assert(Array.isArray(slice.content), 'get_dossier_slice: missing content array');
  assertNoRawAbsolutePaths(slice, 'get_dossier_slice');

  // 6. compare_engines
  const comp = await callTool('compare_engines', { repoA: 'river', repoB: 'bullmq' });
  assert(comp.engineA && comp.engineA.repo === 'river', 'compare_engines: missing engineA');
  assert(comp.engineB && comp.engineB.repo === 'bullmq', 'compare_engines: missing engineB');
  assert(Array.isArray(comp.claimMatrixComparison), 'compare_engines: missing claimMatrixComparison');
  assertNoRawAbsolutePaths(comp, 'compare_engines');

  // --- 2. Evidence & Layered Retrieval Tier (12 tools) ---

  // 7. search_evidence
  const search = await callTool('search_evidence', { query: 'postgres', limit: 5 });
  assert(typeof (search.totalMatches ?? search.totalFound) === 'number', 'search_evidence: missing totalMatches');
  assert(Array.isArray(search.results), 'search_evidence: missing results array');
  assert(search.results.length <= 5, 'search_evidence: exceeded limit');
  assertNoRawAbsolutePaths(search, 'search_evidence');

  // 8. get_eku
  const eku = await callTool('get_eku', { ekuId: 'EKU-QUEUE-015' });
  assert.strictEqual(eku.id, 'EKU-QUEUE-015');
  assert(eku.claimId, 'get_eku: missing claimId');
  assert(Array.isArray(eku.supportingEvidence), 'get_eku: missing supportingEvidence');
  assertNoRawAbsolutePaths(eku, 'get_eku');

  // 9. list_repo_ekus
  const rekus = await callTool('list_repo_ekus', { repo: 'river', pageSize: 5 });
  assert(typeof rekus.totalFound === 'number', 'list_repo_ekus: missing totalFound');
  assert(Array.isArray(rekus.repoEkus), 'list_repo_ekus: missing repoEkus');
  assert(rekus.repoEkus.length <= 5, 'list_repo_ekus: exceeded pageSize limit');
  assertNoRawAbsolutePaths(rekus, 'list_repo_ekus');

  // 10. get_repo_eku
  const reku = await callTool('get_repo_eku', { repoEkuId: 'REKU-RIVER-001' });
  assert.strictEqual(reku.repoEku.id, 'REKU-RIVER-001');
  assert.strictEqual(reku.repoEku.substrate, 'postgres');
  assert.strictEqual(reku.epistemicStatus, 'REPO_LOCAL');
  assertNoRawAbsolutePaths(reku, 'get_repo_eku');

  // 11. list_keyword_groups
  const kg = await callTool('list_keyword_groups', { pageSize: 5 });
  assert(typeof kg.totalFound === 'number', 'list_keyword_groups: missing totalFound');
  assert(Array.isArray(kg.keywordGroups ?? kg.groups), 'list_keyword_groups: missing keywordGroups array');
  assert((kg.keywordGroups ?? kg.groups).length <= 5, 'list_keyword_groups: exceeded pageSize limit');
  assertNoRawAbsolutePaths(kg, 'list_keyword_groups');

  // 12. get_keyword_group
  const kgItem = await callTool('get_keyword_group', { groupId: 'skip_locked' });
  const g = kgItem.keywordGroup ?? kgItem.group;
  assert(g && g.groupId.includes('skip_locked'), 'get_keyword_group: missing groupId');
  assert(Array.isArray(g.participatingRepoEkus), 'get_keyword_group: missing participatingRepoEkus');
  assertNoRawAbsolutePaths(kgItem, 'get_keyword_group');

  // 13. trace_domain_eku
  const trace = await callTool('trace_domain_eku', { ekuId: 'EKU-QUEUE-015' });
  assert.strictEqual(trace.domainEkuId, 'EKU-QUEUE-015');
  assert(Array.isArray(trace.supportedByRepoEkus), 'trace_domain_eku: missing supportedByRepoEkus');
  assertNoRawAbsolutePaths(trace, 'trace_domain_eku');

  // 14. get_failure_patterns
  const failPat = await callTool('get_failure_patterns', { problemStatement: 'lease expiration worker crash' });
  assert(Array.isArray(failPat.failurePatterns), 'get_failure_patterns: missing failurePatterns');
  assertNoRawAbsolutePaths(failPat, 'get_failure_patterns');

  // 15. get_failure_chains
  const failChains = await callTool('get_failure_chains', { repo: 'river' });
  assert(Array.isArray(failChains.failureChains), 'get_failure_chains: missing failureChains');
  assertNoRawAbsolutePaths(failChains, 'get_failure_chains');

  // 16. get_implementation_evidence
  const impl = await callTool('get_implementation_evidence', { substrate: 'postgres', limit: 5 });
  assert(typeof impl.totalFound === 'number', 'get_implementation_evidence: missing totalFound');
  assert(Array.isArray(impl.implementationPackets), 'get_implementation_evidence: missing implementationPackets');
  assert(impl.implementationPackets.length <= 5, 'get_implementation_evidence: exceeded limit');
  assertNoRawAbsolutePaths(impl, 'get_implementation_evidence');

  // 17. explain_provenance
  const prov = await callTool('explain_provenance', { evidenceId: 'OBS-BULLMQ-002' });
  assert.strictEqual(prov.evidenceId, 'OBS-BULLMQ-002');
  assert(prov.type === 'OBSERVATION' || prov.type === 'HISTORICAL_FAILURE');
  assertNoRawAbsolutePaths(prov, 'explain_provenance');

  // 18. get_data_quality_report
  const diag = await callTool('get_data_quality_report', { limit: 10 });
  assert(typeof diag.totalIssuesFound === 'number', 'get_data_quality_report: missing totalIssuesFound');
  assert(Array.isArray(diag.diagnostics), 'get_data_quality_report: missing diagnostics');
  assert(diag.storeHealthStatus === 'HEALTHY' || diag.storeHealthStatus === 'NEEDS_REMEDIATION');
  assertNoRawAbsolutePaths(diag, 'get_data_quality_report');

  // --- 3. Design Critique & Verification Tier (2 tools) ---

  // 19. compare_design_against_evidence
  const critique = await callTool('compare_design_against_evidence', {
    proposedDesign: 'Distributed worker cluster using PostgreSQL SKIP LOCKED without generation matching'
  });
  assert(Array.isArray(critique.matchingEkus), 'compare_design_against_evidence: missing matchingEkus');
  assert(Array.isArray(critique.missingInvariants), 'compare_design_against_evidence: missing missingInvariants');
  assert(Array.isArray(critique.whatNotToPromise), 'compare_design_against_evidence: missing whatNotToPromise');
  assertNoRawAbsolutePaths(critique, 'compare_design_against_evidence');

  // 20. generate_verification_plan
  const plan = await callTool('generate_verification_plan', {
    requirementOrDesign: 'Stalled worker lease recovery and partition fencing'
  });
  assert(Array.isArray(plan.testSuites), 'generate_verification_plan: missing testSuites');
  assert(plan.testSuites.length > 0, 'generate_verification_plan: expected testSuites');
  assertNoRawAbsolutePaths(plan, 'generate_verification_plan');

  console.log('🎉 ALL 20 MCP CONTRACT CONFORMANCE FIXTURES PASSED PERFECTLY!\n');
}

testAll20ToolContracts().catch(err => {
  console.error('❌ MCP Contract conformance fixture failure:', err);
  process.exit(1);
});
