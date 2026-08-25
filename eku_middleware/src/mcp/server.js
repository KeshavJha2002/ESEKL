import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { ESEKLStore } from '../store/index.js';
import { registerDiscoveryTools } from './discovery.js';
import { registerEvidenceTools } from './evidence.js';
import { registerCritiqueTools } from './critique.js';
import { capture } from '../../bin/esekl.mjs';

export class ESEKLMCPServer {
  constructor(options = {}) {
    this.storeRoot = options.storeRoot || null;
    this.logFile = options.logJsonRpc || null;
    this.store = new ESEKLStore(this.storeRoot);
    this.tools = new Map();

    // Register all tool groups
    registerDiscoveryTools(this, this.store);
    registerEvidenceTools(this, this.store);
    registerCritiqueTools(this, this.store);

    if (this.logFile) {
      const logDir = path.dirname(path.resolve(this.logFile));
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  logTransaction(request, response, durationMs = 0) {
    if (!this.logFile) return;

    try {
      const toolName = (request.method === 'tools/call' && request.params) ? request.params.name : null;
      const sanitizedArgs = (request.params && request.params.arguments) ? { ...request.params.arguments } : null;

      // Redact oversized arguments if any
      if (sanitizedArgs) {
        for (const [k, v] of Object.entries(sanitizedArgs)) {
          if (typeof v === 'string' && v.length > 500) {
            sanitizedArgs[k] = v.slice(0, 500) + `... [TRUNCATED ${v.length} chars]`;
          }
        }
      }

      const responseStr = JSON.stringify(response);
      const responseByteSize = Buffer.byteLength(responseStr, 'utf-8');
      const responseHash = crypto.createHash('sha256').update(responseStr).digest('hex');

      const logEntry = {
        timestamp: new Date().toISOString(),
        requestId: request.id || null,
        method: request.method,
        toolName,
        arguments: sanitizedArgs,
        status: (response.error || (response.result && response.result.isError)) ? 'ERROR' : 'OK',
        durationMs,
        responseByteSize,
        responseHash
      };

      fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n', 'utf-8');
    } catch (e) {
      // Non-fatal logging error
    }
  }

  registerTool(name, def) {
    this.tools.set(name, def);
  }

  async handleRequest(request) {
    const startTime = Date.now();
    const { id, method, params } = request;
    let response = null;

    if (id === undefined || id === null) {
      // JSON-RPC Notification: notifications must not receive a response
      if (this.logFile) {
        this.logTransaction(request, { jsonrpc: '2.0', result: 'notification_received' }, 0);
      }
      return null;
    }

    if (method === 'initialize') {
      response = {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'esekl-mcp-server',
            version: '1.0.0'
          },
          capabilities: {
            tools: {}
          }
        }
      };
    } else if (method === 'ping') {
      response = {
        jsonrpc: '2.0',
        id,
        result: {}
      };
    } else if (method === 'tools/list') {
      const toolList = [];
      for (const [name, def] of this.tools.entries()) {
        toolList.push({
          name,
          description: def.description,
          inputSchema: def.parameters
        });
      }
      response = {
        jsonrpc: '2.0',
        id,
        result: {
          tools: toolList
        }
      };
    } else if (method === 'tools/call') {
      const { name, arguments: args } = params || {};
      const tool = this.tools.get(name);
      if (!tool) {
        response = {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Tool '${name}' not found`
          }
        };
      } else {
        try {
          const result = await tool.handler(args || {});
          capture('tool_call', { tool_name: name, status: 'ok' });
          response = {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            }
          };
        } catch (err) {
          capture('tool_call', { tool_name: name, status: 'error' });
          response = {
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: 'EXECUTION_ERROR', message: err.message })
                }
              ]
            }
          };
        }
      }
    } else {
      response = {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method '${method}' not implemented`
        }
      };
    }

    const durationMs = Date.now() - startTime;
    this.logTransaction(request, response, durationMs);
    return response;
  }

  startStdio() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', async (line) => {
      if (!line.trim()) return;
      try {
        const request = JSON.parse(line);
        const response = await this.handleRequest(request);
        if (response !== null && response !== undefined) {
          process.stdout.write(JSON.stringify(response) + '\n');
        }
      } catch (e) {
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error: ' + e.message }
        }) + '\n');
      }
    });
  }
}
