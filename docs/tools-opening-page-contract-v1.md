# ScopedLabs Tools Opening / Category Opening Page Contract V1

Date: 2026-06-12

## Purpose

This contract defines how ScopedLabs tools opening pages and category opening pages should be treated.

Opening pages are not calculator/tool pages. They are navigation, discovery, SEO, and routing pages.

They should not be modified by normal calculator shell migrations unless a dedicated landing-page audit proves the change is safe.

## Page Types

### Global tools opening pages

Examples:

```text
/tools/
/all-tools/
```

These pages help users find categories and tool families.

### Category opening pages

Examples:

```text
/tools/access-control/
/tools/physical-security/
/tools/networking/
/tools/life-safety/
```

These pages help users enter a specific category, choose tools, understand tool order, and reach category-specific flows.

### Calculator/tool pages

Examples:

```text
/tools/access-control/panel-capacity/
/tools/access-control/lock-power-budget/
```

These are the pages where calculator shell, output shell, export/report, snapshot, assistant, status, and result-ledger modules normally apply.

## Current Decision

Opening pages are classified as:

```text
TOOLS_OPENING_PAGE_CONTRACT_NEEDED
CATEGORY_OPENING_PAGE_CONTRACT_NEEDED
TOOL_CARD_GRID_REVIEW
SEO_INTERNAL_LINKING_REVIEW
PRO_LOCK_DISPLAY_REVIEW
PIPELINE_ENTRY_LINKS_REVIEW
KB_GUIDE_LINK_REVIEW
NO_CALCULATOR_SHELL_PATCH_YET
```

This means:

- Do not treat opening pages as calculators.
- Do not add calculator output shell, export report shell, result ledgers, snapshot buttons, or report metadata by default.
- Do not remove or rewrite tool cards without a landing-page audit.
- Do not alter Pro/lock display without a dedicated check.
- Do not alter SEO/internal-link structure blindly.
- Do not alter pipeline entry links blindly.
- Do not alter Knowledge Base / guide links blindly.

## In Scope

- Global tools navigation.
- Category page navigation.
- Tool card grids.
- Category cards.
- Internal links.
- SEO title/description/canonical checks.
- Pro/locked/free display review.
- Pipeline entry/start links.
- KB/guide/help links.
- Category summary/master assistant entry links when applicable.

## Out of Scope

- Calculator shell migrations.
- Export/report output shell.
- Snapshot behavior.
- Hidden result ledgers.
- Carry-forward state.
- Tool formulas.
- Tool-specific CAD/visual diagrams.
- Auth/checkout tier logic.
- Knowledge Base behavior changes.
- Physical Security summary/master assistant rebuild.
- Access Control summary/master assistant build until separately contracted.

## Required Audit

Use:

```powershell
node .\scripts\audit-tools-opening-pages-0612.js
node .\scripts\audit-tools-opening-pages-0612.js --details
```

Expected markers:

```text
TOOLS_OPENING_PAGE_CONTRACT_NEEDED
CATEGORY_OPENING_PAGE_CONTRACT_NEEDED
TOOL_CARD_GRID_REVIEW
SEO_INTERNAL_LINKING_REVIEW
PRO_LOCK_DISPLAY_REVIEW
PIPELINE_ENTRY_LINKS_REVIEW
KB_GUIDE_LINK_REVIEW
NO_CALCULATOR_SHELL_PATCH_YET
OVERALL: PASS
```

## Future Buckets

Possible future states:

```text
TOOLS_OPENING_PAGE_DOCUMENTED
CATEGORY_OPENING_PAGE_DOCUMENTED
GLOBAL_TOOLS_OPENING_PAGE_REVIEW
CATEGORY_OPENING_PAGE_REVIEW
CATEGORY_OPENING_PAGE_PROOF_GAP_REVIEW
TOOL_CARD_GRID_SAFE_FIX_READY
SEO_INTERNAL_LINKING_SAFE_FIX_READY
PRO_LOCK_DISPLAY_KEEP_REVIEW
PIPELINE_ENTRY_LINKS_KEEP_REVIEW
KB_GUIDE_LINK_KEEP_REVIEW
SUMMARY_PAGE_LINK_REVIEW
NO_CALCULATOR_SHELL_PATCH_YET
```

## Auto-Fix Rule

Auto-fix is allowed only for explicit `SAFE_FIX` buckets.

Likely future safe fixes may include:

- missing or inconsistent documentation markers
- known stale internal links after audit proof
- known missing category-card labels
- known missing sitemap/internal-link references
- repeated landing-page card metadata once a contract exists

Keep review-only unless separately proven:

- Pro/lock display
- checkout/auth tier links
- pipeline entry behavior
- summary/master assistant links
- Knowledge Base links
- category layout redesign
- calculator shell/module insertion

## Main-Gate Promotion Rule

Do not promote opening-page checks into main gates until:

1. The contract is stable.
2. The audit is stable.
3. Page paths are confirmed.
4. Safe-fix buckets exist.
5. Landing-page changes are visually verified.
6. No calculator shell behavior is introduced accidentally.
