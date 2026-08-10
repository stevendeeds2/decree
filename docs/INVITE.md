# Limited invite — Decree technical peers

Not a launch. Invite **2–3 design-system engineers** (not general frontend) after `@stevendeeds/decree@0.1.0` is installable.

## Pitch (one line)

If it’s not in the system, it doesn’t ship — Decree binds design-system contracts in CI and for AI agents.

## Flagship story

Official MUI Next.js TypeScript example → **1** `DECREE_HARDCODED_HEX` in absolute mode (theme dump). Everything else allowlisted via `scan.profile: "app"` + import-aware components.

## What to ask them to run

```bash
# 1) Install (see docs/INSTALL.md — GitHub Packages auth)
npm install -D @stevendeeds/decree@0.1.0

# 2) Bootstrap from their DS package
npx decree init ./node_modules/@their/design-system --force

# 3) Tune for a consumer app (typical)
# decree.contract.json → "scan": { "profile": "app" }

# 4) Day-1 ratchet (brownfield)
npx decree verify . --write-baseline decree.baseline.json
# commit contract + baseline

# 5) CI gate
npx decree verify . --baseline decree.baseline.json
```

Copy [`.github/workflows/decree-verify.example.yml`](../.github/workflows/decree-verify.example.yml) into their repo if useful.

## Known limits (say these up front)

- React / JSX-first scanners (CSS/`className` AST still later)  
- Hex detection is stronger with AST but kitchensinks stay noisy — use `--baseline`  
- Empty `tokens[]` skips positive `var(--token)` checks (MUI-style CSS-in-JS)  
- MCP allowlist is fail-open without agent hooks wired  
- Do not expect Decree on Steven’s personal production apps; proof is third-party systems  

## Feedback ask

1. False positives that would block merge wrongly?  
2. Gaps in `decree init` for their package layout?  
3. Would they require CI (`verify --baseline`) before trusting agents?  
4. Time to first useful baseline — under or over ~10 minutes?

## Outreach gate

**Do not cold-email** until:

- [x] Brownfield ratchet merged  
- [ ] `0.1.0` published and smoke-tested from a clean install  
- [ ] Steven reviews this brief  

## Suggested short message

> We’re testing Decree: CI + agent enforcement for design-system contracts. Flagship: MUI’s official Next example → one hex finding. Brownfield uses a baseline ratchet so day one isn’t 300 reds. If you lead a DS, would you try init → write-baseline → CI on a non-prod app and tell us what breaks?
