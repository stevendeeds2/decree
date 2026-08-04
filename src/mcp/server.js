/**
 * Decree MCP server — anti-forgery allowlist for agents.
 *
 * Tools expose ONLY what the contract allows. Invented components/tokens
 * are never listed. validate_snippet uses the same scanners as `decree verify`.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { resolve } from 'node:path';
import { loadContract } from '../contract/index.js';
import {
  listPrimitives,
  listTokens,
  isAllowedPrimitive,
  validateSnippet,
} from './allowlist.js';

/**
 * @param {string} contractPath
 */
export function createDecreeMcpServer(contractPath) {
  const contract = loadContract(resolve(contractPath));
  const server = new McpServer({
    name: 'decree',
    version: '0.0.0',
  });

  server.tool(
    'list_primitives',
    'List design-system components the agent is allowed to use. Never invent names outside this list.',
    {},
    async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              _mcp: 'decree',
              rule: 'Use only these primitives. Inventing components is forbidden.',
              primitives: listPrimitives(contract),
            },
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.tool(
    'list_tokens',
    'List design tokens the agent is allowed to use. Never hardcode hex or invent token names.',
    {},
    async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              _mcp: 'decree',
              rule: 'Use only these tokens. Hardcoded colors/spacing are forbidden.',
              tokens: listTokens(contract),
            },
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.tool(
    'is_allowed_primitive',
    'Check whether a component name is on the Decree allowlist.',
    { name: z.string().describe('Component name, e.g. Button') },
    async ({ name }) => {
      const allowed = isAllowedPrimitive(contract, name);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                _mcp: 'decree',
                name,
                allowed,
                message: allowed
                  ? `${name} is allowlisted.`
                  : `${name} is NOT allowlisted. Do not invent it — use list_primitives.`,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    'validate_snippet',
    'Run Decree scanners on a UI code snippet (same rules as CI verify).',
    {
      source: z.string().describe('TSX/JSX/CSS source to validate'),
      file: z
        .string()
        .optional()
        .describe('Optional filename for findings (default snippet.tsx)'),
    },
    async ({ source, file }) => {
      const result = validateSnippet(contract, source, file ?? 'snippet.tsx');
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                _mcp: 'decree',
                ok: result.ok,
                findings: result.findings,
                message: result.ok
                  ? 'Snippet complies with the Decree contract.'
                  : 'Snippet violates the Decree contract — fix before shipping.',
              },
              null,
              2,
            ),
          },
        ],
        isError: !result.ok,
      };
    },
  );

  return server;
}

/**
 * @param {string} contractPath
 */
export async function startDecreeMcpServer(contractPath) {
  const server = createDecreeMcpServer(contractPath);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
