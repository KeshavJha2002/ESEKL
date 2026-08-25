#!/usr/bin/env node
import { ESEKLMCPServer } from '../src/mcp/server.js';

let storeRoot = null;
let logJsonRpc = null;

for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--store-root=')) {
    storeRoot = arg.split('=')[1];
  } else if (arg.startsWith('--log-jsonrpc=')) {
    logJsonRpc = arg.split('=')[1];
  }
}

const server = new ESEKLMCPServer({ storeRoot, logJsonRpc });

if (process.argv.includes('--list-tools')) {
  const req = { id: 1, method: 'tools/list' };
  server.handleRequest(req).then(res => {
    console.log(JSON.stringify(res.result.tools, null, 2));
    process.exit(0);
  });
} else {
  server.startStdio();
}
