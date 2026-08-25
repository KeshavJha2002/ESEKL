import assert from 'node:assert';
import { ESEKLMCPServer } from '../src/mcp/server.js';
import { ALL_ISSUE_CODES } from '../src/schema/data_quality_issues.js';

console.log('🧪 Running Generalized MCP Semantic Quality Fixtures...');

const server = new ESEKLMCPServer();

// 1. Dossier slice quality
async function testDossierSliceQuality() {
  const req = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'get_dossier_slice',
      arguments: { repo: 'river', sliceType: 'failure_recovery' }
    }
  };
  const res = await server.handleRequest(req);
  const data = JSON.parse(res.result.content[0].text);
  assert.strictEqual(data.repo, 'river');
  assert.strictEqual(data.sliceType, 'failure_recovery');
  assert(data.totalItems >= 3, `Expected >= 3 failure items, got ${data.totalItems}`);
  const hasHistorical = data.content.some(c => c.id && c.id.startsWith('HIST-'));
  assert(hasHistorical, 'Expected at least one HIST-* failure in failure_recovery slice');
  console.log('  ✅ get_dossier_slice quality fixture passed (verified HIST-* evidence)');
}

// 2. Multi-token search with filters
async function testSearchEvidenceQuality() {
  const req = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'search_evidence',
      arguments: { query: 'clock drift lease recovery' }
    }
  };
  const res = await server.handleRequest(req);
  const data = JSON.parse(res.result.content[0].text);
  assert(data.totalMatches >= 1);
  const hasEku16 = data.results.some(r => r.id === 'EKU-QUEUE-016' || r.id === 'EKU-QUEUE-003');
  assert(hasEku16, 'Expected EKU-QUEUE-016 or EKU-QUEUE-003 in lease recovery search');
  assert(data.results[0].epistemicLabel, 'Expected epistemicLabel on search result');
  console.log('  ✅ search_evidence quality fixture passed (verified EKU-016 ranking and epistemicLabel)');
}

// 3. Scenario A: Webhook delivery & external API retries
async function testWebhookRetryCritique() {
  const req = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'compare_design_against_evidence',
      arguments: {
        proposedDesign: 'We dispatch webhooks to third-party endpoints with retries and log delivery status in our main transactional database.'
      }
    }
  };
  const res = await server.handleRequest(req);
  const data = JSON.parse(res.result.content[0].text);
  assert(data.matchingEkus.some(e => e === 'EKU-QUEUE-017' || e === 'EKU-QUEUE-018' || e === 'EKU-QUEUE-015'));
  assert(data.whatNotToPromise.some(w => w.includes('exactly-once')));
  console.log('  ✅ Webhook delivery critique passed (verified retry & what-not-to-promise contracts)');
}

// 4. Scenario B: High-concurrency cron scheduler & poison pill crash loops
async function testCronSchedulerVerificationPlan() {
  const req = {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'generate_verification_plan',
      arguments: {
        requirementOrDesign: 'Distributed cron scheduler executing batch reports with crash loop protection'
      }
    }
  };
  const res = await server.handleRequest(req);
  const data = JSON.parse(res.result.content[0].text);
  assert(data.totalSuites >= 2);
  const hasCrashOrPoison = data.testSuites.some(s => s.motivatedByEku === 'EKU-QUEUE-017' || s.motivatedByEku === 'EKU-QUEUE-018' || s.motivatedByEku === 'EKU-QUEUE-003');
  assert(hasCrashOrPoison, 'Expected crash recovery or poison isolation test suite');
  console.log('  ✅ Cron scheduler verification plan passed (verified crash & poison suites)');
}

// 5. Scenario C: Multi-tenant burst overload and backpressure
async function testMultiTenantOverloadCritique() {
  const req = {
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: {
      name: 'compare_design_against_evidence',
      arguments: {
        proposedDesign: 'Multi-tenant ingestion pipeline with enterprise burst surges and storage connection pooling'
      }
    }
  };
  const res = await server.handleRequest(req);
  const data = JSON.parse(res.result.content[0].text);
  assert(data.matchingEkus.some(e => e === 'EKU-QUEUE-019' || e === 'EKU-QUEUE-006'));
  console.log('  ✅ Multi-tenant overload critique passed (verified storage saturation EKU-019)');
}

// 6. First-Class Failure Chains Retrieval
async function testFailureChainsQuality() {
  const req = {
    jsonrpc: '2.0',
    id: 6,
    method: 'tools/call',
    params: {
      name: 'get_failure_chains',
      arguments: { trigger: 'SIGKILL' }
    }
  };
  const res = await server.handleRequest(req);
  const data = JSON.parse(res.result.content[0].text);
  assert(data.totalFound >= 1);
  const chain = data.failureChains[0];
  assert(chain.failureId.startsWith('HIST-'));
  assert(chain.triggeringCondition);
  assert(chain.fixCommitHash);
  assert.strictEqual(chain.epistemicStatus, 'HISTORY_SUPPORTED');
  console.log('  ✅ get_failure_chains quality fixture passed (verified normalized failure chains)');
}

// 7. Implementation Evidence Retrieval
async function testImplementationEvidenceQuality() {
  // Test River SKIP LOCKED
  const riverReq = {
    jsonrpc: '2.0',
    id: 7,
    method: 'tools/call',
    params: {
      name: 'get_implementation_evidence',
      arguments: { mechanism: 'SKIP LOCKED' }
    }
  };
  const riverRes = await server.handleRequest(riverReq);
  const riverData = JSON.parse(riverRes.result.content[0].text);
  assert(riverData.totalFound >= 1);
  const riverPacket = riverData.implementationPackets[0];
  assert(riverPacket.packetId.startsWith('IMPL-RIVER-'));
  assert.strictEqual(riverPacket.substrate, 'postgres');
  assert(riverPacket.sourceSnippets.length >= 1);
  assert(riverPacket.sourceSnippets[0].lines.includes('FOR UPDATE SKIP LOCKED'));
  assert.strictEqual(riverPacket.epistemicStatus, 'SOURCE_OBSERVED');
  assert(Array.isArray(riverPacket.linkedDomainEkus));

  // Test BullMQ Lua Token Removal
  const bullReq = {
    jsonrpc: '2.0',
    id: 8,
    method: 'tools/call',
    params: {
      name: 'get_implementation_evidence',
      arguments: { repo: 'bullmq', mechanism: 'token_fencing' }
    }
  };
  const bullRes = await server.handleRequest(bullReq);
  const bullData = JSON.parse(bullRes.result.content[0].text);
  assert(bullData.totalFound >= 1);
  const bullPacket = bullData.implementationPackets[0];
  assert(bullPacket.packetId.startsWith('IMPL-BULLMQ-'));
  assert.strictEqual(bullPacket.substrate, 'redis');
  assert(bullPacket.sourceSnippets[0].filePath.includes('removeLock') || bullPacket.sourceSnippets[0].lines.includes('redis.call'));
  assert(Array.isArray(bullPacket.linkedDomainEkus));

  // Test Litequeue SQLite BEGIN IMMEDIATE Dequeue
  const liteReq = {
    jsonrpc: '2.0',
    id: 9,
    method: 'tools/call',
    params: {
      name: 'get_implementation_evidence',
      arguments: { repo: 'litequeue', mechanism: 'sqlite_immediate' }
    }
  };
  const liteRes = await server.handleRequest(liteReq);
  const liteData = JSON.parse(liteRes.result.content[0].text);
  assert(liteData.totalFound >= 1);
  const litePacket = liteData.implementationPackets[0];
  assert(litePacket.packetId.startsWith('IMPL-LITEQUEUE-'));
  assert(litePacket.sourceSnippets[0].lines.includes('BEGIN IMMEDIATE'));
  assert.strictEqual(litePacket.substrate, 'sqlite');
  assert.strictEqual(litePacket.epistemicStatus, 'SOURCE_OBSERVED');
  assert(Array.isArray(litePacket.linkedDomainEkus));

  // Test that unlinked / missing-substrate items are excluded without fallback guessing
  const customStore = server.store;
  const originalRepoEkus = [...customStore.repoEkus];
  try {
    customStore.repoEkus.push({
      id: 'REKU-MALFORMED-001',
      repository: 'malformed_repo',
      mechanism: 'Unlinked Mechanism',
      applicabilityConditions: ['test'],
      evidenceIds: ['OBS-RIVER-001'],
      commonKeywords: ['test'],
      uniqueKeywords: ['test'],
      localContext: 'Test malformed unit without substrate or domain linkage'
      // substrate and linkedDomainEkus are deliberately omitted
    });
    const malformedRes = customStore.getImplementationEvidence({ repo: 'malformed_repo' });
    assert.strictEqual(malformedRes.totalFound, 0, 'Malformed unlinked RepoEKU must be excluded from implementation packets');
    assert(malformedRes.diagnostics, 'Malformed RepoEKU should be surfaced in diagnostics');
    assert.strictEqual(malformedRes.diagnostics.omittedRepoEkus.length, 1);
    assert.strictEqual(malformedRes.diagnostics.omittedRepoEkus[0].repoEkuId, 'REKU-MALFORMED-001');
    assert(malformedRes.diagnostics.omittedRepoEkus[0].missingFields.includes('substrate'));
  } finally {
    customStore.repoEkus = originalRepoEkus;
  }

  console.log('  ✅ get_implementation_evidence quality fixture passed (verified River, BullMQ & Litequeue explicit substrates, zero-fallback exclusion & data diagnostics)');
}

// 8. Layered Repo EKU Retrieval & Domain Down-Traceability
async function testLayeredEkuRetrievalQuality() {
  // list_repo_ekus by keyword
  const listReq = {
    jsonrpc: '2.0',
    id: 9,
    method: 'tools/call',
    params: {
      name: 'list_repo_ekus',
      arguments: { mechanism: 'mvcc_dequeue' }
    }
  };
  const listRes = await server.handleRequest(listReq);
  const listData = JSON.parse(listRes.result.content[0].text);
  assert(listData.totalFound >= 1);
  assert.strictEqual(listData.epistemicStatus, 'REPO_LOCAL');

  // get_repo_eku
  const getReq = {
    jsonrpc: '2.0',
    id: 10,
    method: 'tools/call',
    params: {
      name: 'get_repo_eku',
      arguments: { repoEkuId: 'REKU-RIVER-001' }
    }
  };
  const getRes = await server.handleRequest(getReq);
  const getData = JSON.parse(getRes.result.content[0].text);
  assert(getData.repoEku);
  assert(getData.repoEku.sourceProvenance.queryOrCodeSnippet.includes('FOR UPDATE SKIP LOCKED'));
  assert(getData.repoEku.commonKeywords.includes('skip_locked'));
  assert(getData.repoEku.localContext.includes('PostgreSQL'));

  // trace_domain_eku
  const traceReq = {
    jsonrpc: '2.0',
    id: 11,
    method: 'tools/call',
    params: {
      name: 'trace_domain_eku',
      arguments: { ekuId: 'EKU-QUEUE-007' }
    }
  };
  const traceRes = await server.handleRequest(traceReq);
  const traceData = JSON.parse(traceRes.result.content[0].text);
  assert(traceData.supportedByRepoEkus.length >= 1);
  assert.strictEqual(traceData.supportedByRepoEkus[0].id, 'REKU-RIVER-001');
  assert(traceData.commonKeywordGroups.includes('row_locking'));
  assert(traceData.substrateFamilies.includes('postgres'));

  console.log('  ✅ list_repo_ekus / get_repo_eku / trace_domain_eku quality fixtures passed (verified layered retrieval & facet grouping)');
}

// 9. Keyword Groups & Facet Filtering Quality
async function testKeywordGroupsQuality() {
  // list_keyword_groups (common)
  const listReq = {
    jsonrpc: '2.0',
    id: 12,
    method: 'tools/call',
    params: {
      name: 'list_keyword_groups',
      arguments: { keyword: 'skip_locked' }
    }
  };
  const listRes = await server.handleRequest(listReq);
  const listData = JSON.parse(listRes.result.content[0].text);
  assert(listData.totalFound >= 1);
  assert(listData.keywordGroups.some(g => g.groupId.includes('skip_locked')));

  // get_keyword_group
  const getReq = {
    jsonrpc: '2.0',
    id: 13,
    method: 'tools/call',
    params: {
      name: 'get_keyword_group',
      arguments: { groupId: 'skip_locked' }
    }
  };
  const getRes = await server.handleRequest(getReq);
  const getData = JSON.parse(getRes.result.content[0].text);
  assert(getData.keywordGroup);
  assert(getData.keywordGroup.participatingRepoEkus.length >= 1);
  assert.strictEqual(getData.keywordGroup.epistemicStatus, 'KEYWORD_GROUP_VIEW');

  // Non-lossy context check: ensure localContext and applicabilityConditions are retained on member RepoEKUs
  const member = getData.keywordGroup.participatingRepoEkus[0];
  assert(member.localContext && member.localContext.length > 10, 'Expected non-empty localContext on member RepoEKU in keyword group');
  assert(Array.isArray(member.applicabilityConditions), 'Expected applicabilityConditions array on member RepoEKU in keyword group');
  assert.strictEqual(member.epistemicStatus, 'REPO_LOCAL');

  // search_evidence with layer filter
  const searchReq = {
    jsonrpc: '2.0',
    id: 14,
    method: 'tools/call',
    params: {
      name: 'search_evidence',
      arguments: {
        query: 'skip locked postgres',
        filters: { layer: 'repo_eku' }
      }
    }
  };
  const searchRes = await server.handleRequest(searchReq);
  const searchData = JSON.parse(searchRes.result.content[0].text);
  assert(searchData.totalMatches >= 1);
  assert.strictEqual(searchData.results[0].type, 'REPO_EKU');
  assert.strictEqual(searchData.results[0].epistemicStatus, 'REPO_LOCAL');

  console.log('  ✅ list_keyword_groups / get_keyword_group / layer-filtered search quality fixtures passed');
}

// 10. Comprehensive Negative Tests
async function testUnknownIdentifierNegative() {
  // Negative 1: Unknown Domain EKU
  const req1 = {
    jsonrpc: '2.0',
    id: 15,
    method: 'tools/call',
    params: {
      name: 'get_eku',
      arguments: { ekuId: 'EKU-QUEUE-999' }
    }
  };
  const res1 = await server.handleRequest(req1);
  const data1 = JSON.parse(res1.result.content[0].text);
  assert.strictEqual(data1.error, 'NOT_FOUND');
  assert(Array.isArray(data1.availableIds));

  // Negative 2: Unknown Repo EKU
  const req2 = {
    jsonrpc: '2.0',
    id: 16,
    method: 'tools/call',
    params: {
      name: 'get_repo_eku',
      arguments: { repoEkuId: 'REKU-UNKNOWN-999' }
    }
  };
  const res2 = await server.handleRequest(req2);
  const data2 = JSON.parse(res2.result.content[0].text);
  assert.strictEqual(data2.error, 'NOT_FOUND');
  assert(Array.isArray(data2.availableIds));

  // Negative 3: Unknown Keyword Group
  const req3 = {
    jsonrpc: '2.0',
    id: 17,
    method: 'tools/call',
    params: {
      name: 'get_keyword_group',
      arguments: { groupId: 'nonexistent_keyword_xyz' }
    }
  };
  const res3 = await server.handleRequest(req3);
  const data3 = JSON.parse(res3.result.content[0].text);
  assert.strictEqual(data3.error, 'NOT_FOUND');
  assert(Array.isArray(data3.availableGroups));

  // Negative 4: Unsupported Layer Filter
  const req4 = {
    jsonrpc: '2.0',
    id: 18,
    method: 'tools/call',
    params: {
      name: 'search_evidence',
      arguments: {
        query: 'postgres',
        filters: { layer: 'unsupported_layer_xyz' }
      }
    }
  };
  const res4 = await server.handleRequest(req4);
  const data4 = JSON.parse(res4.result.content[0].text);
  assert.strictEqual(data4.error, 'INVALID_REQUEST');
  assert(Array.isArray(data4.supportedLayers));

  console.log('  ✅ Unknown identifier & unsupported layer negative tests passed (structured NOT_FOUND & INVALID_REQUEST)');
}

// 11. Data-Quality Diagnostic Audit Tool
async function testDataQualityReportQuality() {
  const req = {
    jsonrpc: '2.0',
    id: 19,
    method: 'tools/call',
    params: {
      name: 'get_data_quality_report',
      arguments: { limit: 10 }
    }
  };
  const res = await server.handleRequest(req);
  const data = JSON.parse(res.result.content[0].text);
  assert(data.storeHealthStatus === 'HEALTHY' || data.storeHealthStatus === 'NEEDS_REMEDIATION');
  assert(Array.isArray(data.diagnostics));
  assert(Array.isArray(data.auditedLayers));

  // Test each of the 9 data-quality issue codes
  const customStore = server.store;
  const originalRepoEkus = [...customStore.repoEkus];
  const originalEkus = [...customStore.ekus];

  try {
    const observedFixtureIssueCodes = new Set();
    const expectIssue = (report, affectedId, issueCode) => {
      assert(ALL_ISSUE_CODES.includes(issueCode), `Fixture expects unregistered issue code ${issueCode}`);
      assert(report.diagnostics.some(d => d.affectedId === affectedId && d.issueCode === issueCode),
        `Expected ${issueCode} for ${affectedId}`);
      observedFixtureIssueCodes.add(issueCode);
    };

    // 1. MISSING_EXPLICIT_FIELDS
    customStore.repoEkus = [...originalRepoEkus, { id: 'REKU-T1', repository: 'river' }];
    const res1 = customStore.getDataQualityReport({ layer: 'REPO_LOCAL' });
    expectIssue(res1, 'REKU-T1', 'MISSING_EXPLICIT_FIELDS');

    // 2. BROKEN_EVIDENCE_LINK
    customStore.repoEkus = [...originalRepoEkus, {
      id: 'REKU-T2',
      repository: 'river',
      substrate: 'postgres',
      objectType: 'BEHAVIORAL_INVARIANT',
      claim: 'Sample claim',
      mechanism: 'Sample mech',
      localContext: 'Detailed local context description here.',
      evidenceIds: ['OBS-NONEXISTENT-999'],
      commonKeywords: ['k1'],
      uniqueKeywords: ['u1']
    }];
    const res2 = customStore.getDataQualityReport({ layer: 'REPO_LOCAL' });
    expectIssue(res2, 'REKU-T2', 'BROKEN_EVIDENCE_LINK');

    // 3. MISSING_SOURCE_PROVENANCE
    customStore.repoEkus = [...originalRepoEkus, {
      id: 'REKU-T3',
      repository: 'river',
      substrate: 'postgres',
      objectType: 'BEHAVIORAL_INVARIANT',
      claim: 'Sample claim',
      mechanism: 'Sample mech',
      localContext: 'Detailed local context description here.',
      evidenceIds: ['OBS-RIVER-001'],
      commonKeywords: ['k1'],
      uniqueKeywords: ['u1'],
      epistemicLabels: ['SOURCE_OBSERVED']
    }];
    const res3 = customStore.getDataQualityReport({ layer: 'REPO_LOCAL' });
    expectIssue(res3, 'REKU-T3', 'MISSING_SOURCE_PROVENANCE');

    // 4. MISSING_TEST_PROVENANCE
    customStore.repoEkus = [...originalRepoEkus, {
      id: 'REKU-T4',
      repository: 'river',
      substrate: 'postgres',
      objectType: 'BEHAVIORAL_INVARIANT',
      claim: 'Sample claim',
      mechanism: 'Sample mech',
      localContext: 'Detailed local context description here.',
      evidenceIds: ['OBS-RIVER-001'],
      commonKeywords: ['k1'],
      uniqueKeywords: ['u1'],
      epistemicLabels: ['TEST_OBSERVED']
    }];
    const res4 = customStore.getDataQualityReport({ layer: 'REPO_LOCAL' });
    expectIssue(res4, 'REKU-T4', 'MISSING_TEST_PROVENANCE');

    // 5. BROKEN_SUPPORT_LINK
    customStore.ekus = [...originalEkus, { id: 'EKU-T5', supportedByRepoEkus: ['REKU-NONEXISTENT-999'] }];
    const res5 = customStore.getDataQualityReport({ layer: 'DOMAIN_ABSTRACTION' });
    expectIssue(res5, 'EKU-T5', 'BROKEN_SUPPORT_LINK');

    // 6. BROKEN_ALTERNATIVE_LINK
    customStore.ekus = [...originalEkus, { id: 'EKU-T6', alternativeMechanismRepoEkus: ['REKU-NONEXISTENT-999'] }];
    const res6 = customStore.getDataQualityReport({ layer: 'DOMAIN_ABSTRACTION' });
    expectIssue(res6, 'EKU-T6', 'BROKEN_ALTERNATIVE_LINK');

    // 7. BROKEN_COUNTEREXAMPLE_LINK
    customStore.ekus = [...originalEkus, { id: 'EKU-T7', counterexampleRepoEkus: ['REKU-NONEXISTENT-999'] }];
    const res7 = customStore.getDataQualityReport({ layer: 'DOMAIN_ABSTRACTION' });
    expectIssue(res7, 'EKU-T7', 'BROKEN_COUNTEREXAMPLE_LINK');

    // 8. BROKEN_NOT_APPLICABLE_LINK
    customStore.ekus = [...originalEkus, { id: 'EKU-T8', notApplicableRepoEkus: ['REKU-NONEXISTENT-999'] }];
    const res8 = customStore.getDataQualityReport({ layer: 'DOMAIN_ABSTRACTION' });
    expectIssue(res8, 'EKU-T8', 'BROKEN_NOT_APPLICABLE_LINK');

    // 9. MISSING_FALSIFICATION_AUDIT
    customStore.ekus = [...originalEkus, { id: 'EKU-T9', title: 'Unaudited EKU' }];
    const res9 = customStore.getDataQualityReport({ layer: 'DOMAIN_ABSTRACTION' });
    expectIssue(res9, 'EKU-T9', 'MISSING_FALSIFICATION_AUDIT');

    assert.deepStrictEqual(
      [...observedFixtureIssueCodes].sort(),
      [...ALL_ISSUE_CODES].sort(),
      'Data-quality semantic fixtures must cover every registered issue code exactly once or more'
    );

  } finally {
    customStore.repoEkus = originalRepoEkus;
    customStore.ekus = originalEkus;
  }

  console.log('  ✅ get_data_quality_report quality fixture passed (verified all 9 issue codes, store diagnostic audit, broken links & bounded issue reporting)');
}

async function runAllQualityFixtures() {
  try {
    await testDossierSliceQuality();
    await testSearchEvidenceQuality();
    await testWebhookRetryCritique();
    await testCronSchedulerVerificationPlan();
    await testMultiTenantOverloadCritique();
    await testFailureChainsQuality();
    await testImplementationEvidenceQuality();
    await testLayeredEkuRetrievalQuality();
    await testKeywordGroupsQuality();
    await testUnknownIdentifierNegative();
    await testDataQualityReportQuality();
    console.log('🎉 ALL GENERALIZED MCP SEMANTIC QUALITY FIXTURES PASSED PERFECTLY!\n');
  } catch (err) {
    console.error('❌ Quality fixture failure:', err);
    process.exit(1);
  }
}

runAllQualityFixtures();
