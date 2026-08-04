# Decree examples — third-party proof only

Isolated mini-apps / packages used to prove Decree against **established foreign design systems**.

## Policy

- **In scope:** shadcn-shaped stacks, MUI, Radix Themes, Chakra, etc.  
- **Out of scope:** Corvy, stevendeeds.com, `@stevendeeds/sd33ds` production, any personal production app  

If a change would touch production consumers, stop. Add a fixture here instead.

## Layout

| Path | System | Role |
|------|--------|------|
| `../fixtures/shadcn-*` | shadcn/ui-shaped | Golden clean/dirty verify |
| `../fixtures/mui-*` | MUI | Golden clean/dirty verify |
| `radix-themes-clean` / `radix-themes-dirty` | Radix Themes | Third 3rd-party pair |

Run from repo root:

```bash
node bin/decree.js verify fixtures/shadcn-clean
node bin/decree.js verify fixtures/mui-clean
node bin/decree.js verify examples/radix-themes-clean
```
