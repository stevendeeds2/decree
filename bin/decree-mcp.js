#!/usr/bin/env node
/**
 * Stdio MCP entry: decree-mcp [path-to-decree.contract.json]
 * Default: ./decree.contract.json
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { startDecreeMcpServer } from '../src/mcp/server.js';

const arg = process.argv[2];
const contractPath = resolve(arg ?? 'decree.contract.json');

if (!existsSync(contractPath)) {
  console.error(
    `decree-mcp: contract not found at ${contractPath}\n` +
      `Usage: decree-mcp [path/to/decree.contract.json]`,
  );
  process.exit(2);
}

await startDecreeMcpServer(contractPath);
