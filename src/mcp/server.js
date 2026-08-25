/**
 * Decree MCP server — anti-forgery allowlist for agents.
 *
 * Tools expose ONLY what the contract allows. Invented components/tokens
 * are never listed. validate_snippet uses the same scanners as `decree verify`,
 * including scan.profile app local components when the contract lives in a project.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { dirname, resolve } from 'node:path';
import { loadContract } from '../contract/index.js';
import { collectLocalComponents } from '../verify/local-components.js';
import { resolveExcludePrefixes } from '../verify/excludes.js';
import {
  listPrimitives,
  listTokens,
  describeAllowedPrimitive,
  validateSnippet,
} from './allowlist.js';

/**
 * @param {string} contractPath
 * @returns {{ contract: import('../contract/index.js').DecreeContract, localComponents: Set<string>, projectRoot: string }}
 */
export function loadMcpContext(contractPath) {
  const abs = resolve(contractPath);
  const contract = loadContract(abs);
  const projectRoot = dirname(abs);
  const scan = contract.scan || {};
  const excludePrefixes = resolveExcludePrefixes(scan);
  const profile = scan.profile === 'app' ? 'app' : 'strict';
  const localPrefixes =
    Array.isArray(scan.localComponentPrefixes) &&
    scan.localComponentPrefixes.length > 0
      ? scan.localComponentPrefixes
      : ['src/components'];
  const localComponents =
    profile === 'app'
      ? collectLocalComponents(projectRoot, localPrefixes, excludePrefixes)
      : new Set();
  return { contract, localComponents, projectRoot };
}

/**
 * @param {string} contractPath
 */
export function createDecreeMcpServer(contractPath) {
  const { contract, localComponents, projectRoot } =
    loadMcpContext(contractPath);
  const server = new McpServer({
    name: 'decree',
    version: '0.0.0',
  });

  server.tool(
    'list_primitives',
    'List design-system components the agent is allowed to use. Never invent names outside this list. Do not use deprecated primitives for new UI; use the listed replacement.',
    {},
    async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              _mcp: 'decree',
              rule: 'Use only these primitives (plus localComponents when profile is app). Inventing components is forbidden. Do not use deprecated primitives for new UI; use the listed replacement.',
              primitives: listPrimitives(contract),
              localComponents: [...localComponents].sort(),
              profile: contract.scan?.profile === 'app' ? 'app' : 'strict',
              projectRoot,
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
    'List design tokens the agent is allowed to use. Never hardcode hex or invent token names. Do not use deprecated tokens for new UI; use the listed replacement.',
    {},
    async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              _mcp: 'decree',
              rule: 'Use only these tokens. Hardcoded colors/spacing are forbidden. Do not use deprecated tokens for new UI; use the listed replacement.',
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
    'Check whether a component name is on the Decree allowlist (contract + app-local when profile is app).',
    { name: z.string().describe('Component name, e.g. Button') },
    async ({ name }) => {
      const info = describeAllowedPrimitive(contract, name, { localComponents });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                _mcp: 'decree',
                name,
                allowed: info.allowed,
                deprecated: info.deprecated,
                ...(info.deprecation ? { deprecation: info.deprecation } : {}),
                message: info.message,
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
    'Run Decree scanners on a UI code snippet (same rules as CI verify, including app-local components when configured).',
    {
      source: z.string().describe('TSX/JSX/CSS source to validate'),
      file: z
        .string()
        .optional()
        .describe('Optional filename for findings (default snippet.tsx)'),
    },
    async ({ source, file }) => {
      const result = validateSnippet(
        contract,
        source,
        file ?? 'snippet.tsx',
        { localComponents },
      );
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
