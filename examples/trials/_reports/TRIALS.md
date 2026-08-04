# External trials report

Generated: 2026-08-04T15:28:55.427Z

Public third-party apps only. No personal production apps.

## mui-nextjs-ts

- **Source:** https://github.com/mui/material-ui/tree/master/examples/material-ui-nextjs-ts
- **Title:** Official MUI Next.js TypeScript example
- **Install:** ok
- **Contract:** 219 components, 0 tokens
- **Verify:** FAIL — 9 finding(s) across 8 files
- **Codes:**
  - `DECREE_UNKNOWN_COMPONENT`: 8
  - `DECREE_HARDCODED_HEX`: 1
- **Top files:**
  - `src/app/page.tsx`: 3
  - `src/app/about/page.tsx`: 2
  - `src/app/layout.tsx`: 1
  - `src/components/Copyright.tsx`: 1
  - `src/components/ProTip.tsx`: 1
  - `src/theme.ts`: 1
- Sample components from init: Accordion, AccordionActions, AccordionContext, AccordionDetails, AccordionSummary, Add, Alert, AlertTitle, AppBar, ArrowDownward, ArrowDropDown, Autocomplete, Avatar, AvatarGroup, Backdrop, Badge, BasePopper, BottomNavigation, BottomNavigationAction, Box

## radix-themes-playground

- **Source:** https://github.com/radix-ui/themes/tree/main/apps/playground
- **Title:** Radix Themes official playground (apps/playground)
- **Install:** ok
- **Contract:** 90 components, 1484 tokens
- **Verify:** FAIL — 638 finding(s) across 103 files
- **Codes:**
  - `DECREE_UNKNOWN_COMPONENT`: 563
  - `DECREE_NATIVE_ELEMENT`: 64
  - `DECREE_HARDCODED_COLOR`: 11
- **Top files:**
  - `app/(themeable)/test/textfield/page.tsx`: 83
  - `app/(themeable)/sink/page.tsx`: 61
  - `app/(themeable)/test/reset/page.tsx`: 39
  - `app/(themeable)/test/as-child/page.tsx`: 20
  - `app/(themeable)/test/grid-align-content/page.tsx`: 18
  - `app/(themeable)/test/appearance/page.tsx`: 16
  - `app/(themeable)/ghost-balance/page.tsx`: 14
  - `app/(themeable)/sink/select/page.tsx`: 14
  - `app/(themeable)/sink/skeleton/page.tsx`: 14
  - `app/(themeable)/sink/callout/page.tsx`: 12
  - `app/(themeable)/sink/sink-layout.navigation.tsx`: 12
  - `app/(themeable)/test/grid-justify-items/page.tsx`: 12
  - `app/(themeable)/sink/button/page.tsx`: 11
  - `app/(themeable)/sink/dropdown-menu/page.tsx`: 11
  - `app/(themeable)/sink/icon-button/page.tsx`: 11
- Sample components from init: AccessibleIcon, Action, AlertDialog, Anchor, AspectRatio, Avatar, Badge, BaseButton, Blockquote, Body, Box, Button, Callout, Cancel, Card, Cell, Checkbox, CheckboxCards, CheckboxGroup, CheckboxItem

## shadcn-dashboard-starter

- **Source:** https://github.com/Kiranism/next-shadcn-dashboard-starter
- **Title:** next-shadcn-dashboard-starter (Kiranism)
- **Install:** skipped
- **Contract:** 387 components, 0 tokens
- **Verify:** FAIL — 449 finding(s) across 205 files
- **Codes:**
  - `DECREE_UNKNOWN_COMPONENT`: 364
  - `DECREE_ARBITRARY_VALUE`: 68
  - `DECREE_NATIVE_ELEMENT`: 10
  - `DECREE_HARDCODED_HEX`: 7
- **Top files:**
  - `src/hooks/use-data-table.ts`: 18
  - `src/features/overview/components/overview.tsx`: 17
  - `src/app/dashboard/overview/layout.tsx`: 13
  - `src/components/forms/demo-form.tsx`: 12
  - `src/components/layout/app-sidebar.tsx`: 12
  - `src/features/chat/components/message-composer.tsx`: 11
  - `src/features/forms/components/sheet-form-demo.tsx`: 10
  - `src/lib/compose-refs.ts`: 10
  - `src/components/kbar/index.tsx`: 9
  - `src/features/overview/components/bar-graph.tsx`: 9
  - `src/hooks/use-controllable-state.tsx`: 9
  - `src/components/org-switcher.tsx`: 8
  - `src/features/chat/components/chat-area.tsx`: 8
  - `src/features/chat/components/conversation-list.tsx`: 8
  - `src/features/chat/components/conversation-select.tsx`: 8
- Sample components from init: Accordion, AccordionContent, AccordionItem, AccordionTrigger, Alert, AlertAction, AlertDescription, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogTrigger, AlertTitle

## Interpretation notes

- Failures are expected on first pass: consumer apps use local wrappers, icons, and layout shells outside the DS package allowlist.
- `DECREE_UNKNOWN_COMPONENT` volume is the main signal for contract curation (allow local shells vs enforce primitives only).
- Color findings (`HARDCODED_HEX` / `HARDCODED_COLOR`) show token discipline gaps.
- Native element findings show places still using raw HTML controls.

