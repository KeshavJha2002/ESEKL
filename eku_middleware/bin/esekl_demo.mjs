#!/usr/bin/env node
import { ESEKLMCPServer } from '../src/mcp/server.js';

console.log('============================================================');
console.log('🚀 ESEKL MODEL CONTEXT PROTOCOL (MCP) INTERACTIVE DEMO');
console.log('============================================================\n');

const server = new ESEKLMCPServer();

async function runDemo() {
  // 1. Capabilities
  console.log('1️⃣ Querying ESEKL Capabilities & Corpus Scope:');
  const capRes = await server.handleRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: 'get_capabilities', arguments: {} }
  });
  const caps = JSON.parse(capRes.result.content[0].text);
  console.log(`   Domain: ${caps.domain}`);
  console.log(`   Corpus Size: ${caps.corpusSize} mature distributed engines (${caps.repositories.slice(0, 5).join(', ')}...)`);
  console.log(`   Knowledge Units: ${caps.totalEkus} Base EKUs | ${caps.totalObservations} Code Observations | ${caps.totalHistoricalFailures} Verified Historical Failures\n`);

  // 2. Query EKU
  console.log('2️⃣ Retrieving Empirical Invariant (EKU-QUEUE-015 - Fenced Result Promotion):');
  const ekuRes = await server.handleRequest({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { name: 'get_eku', arguments: { ekuId: 'EKU-QUEUE-015' } }
  });
  const eku = JSON.parse(ekuRes.result.content[0].text);
  console.log(`   Title: ${eku.title}`);
  console.log(`   Invariant: ${eku.behavioralInvariant}`);
  console.log(`   Design Contract: ${eku.designContract}`);
  console.log(`   Corpus Support: ${eku.corpusStats.supports} supporting, ${eku.corpusStats.counterexamples} counterexamples\n`);

  // 3. Engine Comparison
  console.log('3️⃣ Comparing Two Real-World Engines (River vs BullMQ):');
  const compRes = await server.handleRequest({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'compare_engines', arguments: { repoA: 'river', repoB: 'bullmq' } }
  });
  const comp = JSON.parse(compRes.result.content[0].text);
  console.log(`   Engine A (River): ${comp.engineA.keyMechanisms[0]}`);
  console.log(`   Engine B (BullMQ): ${comp.engineB.keyMechanisms[0]}`);
  console.log(`   Matrix Comparison Rows: ${comp.claimMatrixComparison.length} evaluated\n`);

  // 4. Critique Startup Assignment
  console.log('4️⃣ Critiquing A Startup Architecture Proposal:');
  const critiqueRes = await server.handleRequest({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'compare_design_against_evidence',
      arguments: {
        proposedDesign: 'We execute asynchronous payments with background retry workers in PostgreSQL and dispatch partner webhooks using NTP synchronization.'
      }
    }
  });
  const critique = JSON.parse(critiqueRes.result.content[0].text);
  console.log(`   Matched EKUs: ${critique.matchingEkus.join(', ')}`);
  console.log(`   Identified Missing Invariants (${critique.missingInvariants.length}):`);
  for (const inv of critique.missingInvariants) {
    console.log(`     ⚠️ [${inv.severity}] ${inv.title || inv.invariant}: ${inv.risk.slice(0, 100)}...`);
  }
  console.log(`   What NOT to Promise:`);
  for (const w of critique.whatNotToPromise.slice(0, 2)) {
    console.log(`     🛑 ${w}`);
  }
  console.log('');

  // 5. Verification Plan
  console.log('5️⃣ Generating Evidence-Backed Adversarial Verification Plan:');
  const planRes = await server.handleRequest({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: {
      name: 'generate_verification_plan',
      arguments: {
        requirementOrDesign: 'Zero-downtime payments platform with lease recovery under clock skew'
      }
    }
  });
  const plan = JSON.parse(planRes.result.content[0].text);
  console.log(`   Generated ${plan.totalSuites} Adversarial Test Suites:`);
  for (const suite of plan.testSuites) {
    console.log(`     🧪 ${suite.testName} (Motivated by ${suite.motivatedByEku})`);
    console.log(`        Target Invariant: ${suite.targetInvariant.slice(0, 90)}...`);
  }

  console.log('\n============================================================');
  console.log('🎉 DEMO COMPLETE: ESEKL MCP Tools Successfully Proven!');
  console.log('============================================================');
}

runDemo();
