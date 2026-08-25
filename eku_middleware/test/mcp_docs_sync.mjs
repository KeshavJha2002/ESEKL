import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESEKLMCPServer } from '../src/mcp/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Running MCP Documentation & Registered Tool Schema Sync Tests...');

const server = new ESEKLMCPServer();
const res = await server.handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
const registeredTools = res.result.tools || [];
const registeredToolNames = new Set(registeredTools.map(t => t.name));

const mcpContractPath = path.join(__dirname, '..', 'mcp_contract.md');
const readmePath = path.join(__dirname, '..', 'README.md');

assert(fs.existsSync(mcpContractPath), 'mcp_contract.md must exist');
assert(fs.existsSync(readmePath), 'README.md must exist');

const contractMd = fs.readFileSync(mcpContractPath, 'utf-8');
const readmeMd = fs.readFileSync(readmePath, 'utf-8');

console.log(`   Found ${registeredToolNames.size} registered MCP tools.`);

// 1. Check all registered tools are documented in mcp_contract.md and README.md
for (const toolName of registeredToolNames) {
  assert(contractMd.includes(`### \`${toolName}\``) || contractMd.includes(`\`${toolName}`),
    `Tool '${toolName}' is registered but missing documentation in mcp_contract.md`);
  assert(readmeMd.includes(`\`${toolName}`),
    `Tool '${toolName}' is registered but missing in README.md tool list`);
}
console.log('  ✅ All registered tools documented in mcp_contract.md and README.md');

// 2. Extract tools documented in mcp_contract.md and ensure they are actually registered
const contractToolMatches = [...contractMd.matchAll(/### `([a-z_]+)`/g)].map(m => m[1]);
for (const docTool of contractToolMatches) {
  assert(registeredToolNames.has(docTool),
    `mcp_contract.md documents tool '${docTool}' which is NOT in registered tools list`);
}
console.log('  ✅ No undocumented phantom tools in mcp_contract.md');

// 3. Verify tool input schema properties match documented arguments
for (const tool of registeredTools) {
  const props = Object.keys(tool.inputSchema?.properties || {});
  for (const prop of props) {
    assert(contractMd.includes(`"${prop}"`) || contractMd.includes(`\`${prop}\``) || contractMd.includes(prop),
      `Property '${prop}' for tool '${tool.name}' is registered in inputSchema but missing in mcp_contract.md`);
  }
}
console.log('  ✅ Registered input schema properties aligned with mcp_contract.md');

// 4. Verify data-quality issue codes registry sync
import { ALL_ISSUE_CODES } from '../src/schema/data_quality_issues.js';
for (const code of ALL_ISSUE_CODES) {
  assert(contractMd.includes(`\`${code}\``),
    `Data-quality issue code '${code}' in registry is missing from mcp_contract.md`);
}
console.log('  ✅ All registered data-quality issue codes documented in mcp_contract.md');

// 5. Verify core tools output shape keys documented in mcp_contract.md
const outputKeyChecks = {
  get_data_quality_report: ['totalIssuesFound', 'limit', 'storeHealthStatus', 'diagnostics', 'auditedLayers'],
  get_implementation_evidence: ['totalFound', 'limit', 'implementationPackets'],
  trace_domain_eku: ['domainEkuId', 'title', 'claimId', 'supportedByRepoEkus'],
  compare_design_against_evidence: ['matchingEkus', 'missingInvariants', 'whatNotToPromise', 'epistemicClassification']
};

for (const [toolName, expectedKeys] of Object.entries(outputKeyChecks)) {
  for (const key of expectedKeys) {
    assert(contractMd.includes(`"${key}"`),
      `Documented output schema for '${toolName}' is missing expected key '${key}' in mcp_contract.md`);
  }
}
console.log('  ✅ Core tools output schema keys verified in mcp_contract.md');

// 6. Verify README.md contains layer query scenarios A through E
const requiredScenarios = [
  'Scenario A: Investigating a Repo-Specific Mechanism',
  'Scenario B: Exploring Cross-Cutting Keyword & Substrate Facets',
  'Scenario C: Down-Tracing a Domain Invariant to Ground-Truth Evidence',
  'Scenario D: Querying Concrete Implementation Evidence Packets',
  'Scenario E: Evidence-Constrained Architectural Critique & Adversarial Verification'
];
for (const sc of requiredScenarios) {
  assert(readmeMd.includes(sc), `README.md missing documented layer query scenario '${sc}'`);
}
console.log('  ✅ README.md includes verified examples across all 5 retrieval and critique layers');

// 7. Verify JSON code fences in mcp_contract.md are parseable examples/schemas
const jsonFenceMatches = [...contractMd.matchAll(/```json\s*([\s\S]*?)```/g)];
assert(jsonFenceMatches.length > 0, 'mcp_contract.md should contain JSON code-fenced schemas/examples');
for (const [idx, match] of jsonFenceMatches.entries()) {
  const jsonText = match[1].trim();
  assert(jsonText.length > 0, `JSON code fence #${idx + 1} in mcp_contract.md is empty`);
  try {
    JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`JSON code fence #${idx + 1} in mcp_contract.md is not parseable JSON: ${err.message}`);
  }
}
console.log(`  ✅ ${jsonFenceMatches.length} mcp_contract.md JSON code fences parse successfully`);

console.log('🎉 ALL MCP DOCS & SCHEMA SYNC TESTS PASSED PERFECTLY!\n');
