import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESEKLMCPServer } from '../src/mcp/server.js';

console.log('🧪 Running MCP JSON-RPC Transaction Logger Tests...');

const __filename = fileURLToPath(import.meta.url);
const tmpLog = path.resolve(path.dirname(__filename), 'tmp_test_log.jsonl');

if (fs.existsSync(tmpLog)) fs.unlinkSync(tmpLog);

const server = new ESEKLMCPServer({ logJsonRpc: tmpLog });

async function testLogging() {
  // Call initialize
  await server.handleRequest({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });

  // Call get_eku
  await server.handleRequest({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { name: 'get_eku', arguments: { ekuId: 'EKU-QUEUE-015' } }
  });

  // Call compare_design_against_evidence with long text
  const longText = 'Payment settlement '.repeat(50);
  await server.handleRequest({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'compare_design_against_evidence', arguments: { proposedDesign: longText } }
  });

  assert(fs.existsSync(tmpLog), 'Expected log file to exist');
  const lines = fs.readFileSync(tmpLog, 'utf-8').trim().split('\n');
  assert.strictEqual(lines.length, 3, `Expected 3 log entries, got ${lines.length}`);

  const entry1 = JSON.parse(lines[0]);
  assert.strictEqual(entry1.requestId, 1);
  assert.strictEqual(entry1.method, 'initialize');
  assert.strictEqual(entry1.status, 'OK');
  assert(entry1.responseByteSize > 0);
  assert(entry1.responseHash.length === 64);

  const entry2 = JSON.parse(lines[1]);
  assert.strictEqual(entry2.toolName, 'get_eku');
  assert.strictEqual(entry2.arguments.ekuId, 'EKU-QUEUE-015');
  assert.strictEqual(entry2.status, 'OK');

  const entry3 = JSON.parse(lines[2]);
  assert.strictEqual(entry3.toolName, 'compare_design_against_evidence');
  assert(entry3.arguments.proposedDesign.includes('[TRUNCATED'), 'Expected argument truncation on long text');

  // Clean up
  fs.unlinkSync(tmpLog);
  console.log('🎉 ALL MCP LOGGER TESTS PASSED PERFECTLY!\n');
}

testLogging().catch(err => {
  console.error('❌ Logger test failed:', err);
  if (fs.existsSync(tmpLog)) fs.unlinkSync(tmpLog);
  process.exit(1);
});
