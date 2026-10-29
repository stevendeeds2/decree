# Decree for AI agents (MCP)

MCP is how tools like Cursor and Claude give an AI agent extra abilities. Decree's MCP server gives an agent the same list your CI checks against, so it can ask what's allowed before it writes UI, and check its code before it calls the work done.

## Set it up

From the app's folder, with `@stevendeeds/decree` installed:

```bash
npx decree mcp decree.contract.json
```

It prints a block like this. Paste it into `.cursor/mcp.json` (Cursor) or `claude_desktop_config.json` (Claude Desktop):

```json
{
  "mcpServers": {
    "decree": { "command": "npx", "args": ["decree-mcp", "decree.contract.json"] }
  }
}
```

The paths are relative to the app's folder, so the block works for teammates too. Claude Code: `claude mcp add decree -- npx decree-mcp decree.contract.json`.

## Tools

| Tool | Arguments | What it returns |
|------|-----------|-----------------|
| `list_primitives` | none | The design system's components, with allowed props when the contract lists them. Includes the app's own components when the contract's `scan.profile` is `app`. |
| `list_tokens` | none | The design system's tokens. |
| `is_allowed_primitive` | `name` | Whether a component is in the design system, and its allowed props. |
| `validate_snippet` | `source`, optional `file` | The same findings `decree verify` would report. `file` picks the reader by extension, for example `Card.vue` or `card.component.html`; the default is `snippet.tsx`. Snippets over 256 KB aren't checked. |

Retired components and tokens are still listed, marked `deprecated` with the replacement, so agents know not to use them for new UI.

## What to tell the agent

1. Call `list_primitives` and `list_tokens` before writing UI.
2. Call `validate_snippet` before saying the work is done.
3. If `validate_snippet` reports a problem, fix it; CI will report the same one.
