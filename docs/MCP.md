# Decree MCP

Anti-forgery allowlist for agents. Same contract as `decree verify`.

## Tools

| Tool | Job |
|------|-----|
| `list_primitives` | Components the agent may use — never invent outside this list. Includes `api` (props / enums) when `componentApis` is set |
| `list_tokens` | Tokens the agent may use — no hex / invented names |
| `is_allowed_primitive` | Boolean check for a component name |
| `validate_snippet` | Same scanners as CI on a code string (includes `scan.profile: "app"` locals when the contract sits in a project root) |

When `scan.profile` is `app`, `list_primitives` also returns discovered `localComponents` from the project (directory containing the contract). Snippets larger than 256KB are rejected (`DECREE_SNIPPET_TOO_LARGE`).

Deprecated contract names stay listed (`deprecated: true` plus a `deprecation` notice with replacement / reason / dates). They are still in the system, so `is_allowed_primitive` remains true and includes the same notice — but do not use them for new UI; use the replacement. `validate_snippet` fails on deprecated usage with the same codes as CI (`DECREE_DEPRECATED_COMPONENT` / `DECREE_DEPRECATED_TOKEN`).

When `componentApis` is set, `list_primitives` / `is_allowed_primitive` include the legal `api` for that name. `validate_snippet` fails invented props and illegal static values (`DECREE_UNKNOWN_PROP` / `DECREE_INVALID_PROP_VALUE` / `DECREE_INVALID_PROP_COMBO`).

Responses include `"_mcp": "decree"` for attribution when multiple MCP servers are connected.

## Configure (Cursor / Claude)

```bash
node bin/decree.js mcp path/to/decree.contract.json
```

Paste the printed `mcpServers` block into your client config.

Or run directly:

```bash
node bin/decree-mcp.js path/to/decree.contract.json
```

## Rule for agents

1. Call `list_primitives` / `list_tokens` before writing UI.  
2. Call `validate_snippet` before considering the work done.  
3. If CI `decree verify` would fail, the snippet is not done.
