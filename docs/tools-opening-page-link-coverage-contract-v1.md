# ScopedLabs Tools Opening Page Link Coverage Contract V1

Date: 2026-06-12

## Purpose

This contract defines how missing tool/category links on ScopedLabs opening pages should be reviewed and patched.

Opening pages are navigation and discovery pages. They are not calculator pages.

This contract exists because the opening-page SAFE_FIX audit found no blind auto-fix targets, but did identify category pages with missing expected tool links. Those are real user-facing gaps, but they need a targeted landing-page patch rather than calculator-shell migration.

## Current Decision

The opening pages are in this state:

```text
OPENING_PAGE_NO_SAFE_FIX_TARGETS_YET
OPENING_PAGE_KEEP_REVIEW_TARGETS_IDENTIFIED
CATEGORY_PAGE_MISSING_TOOL_LINKS
SUMMARY_PAGE_LINK_REVIEW
PRO_LOCK_DISPLAY_KEEP_REVIEW
PIPELINE_ENTRY_LINKS_KEEP_REVIEW
KB_GUIDE_LINK_KEEP_REVIEW
NO_CALCULATOR_SHELL_PATCH_YET
```

## Allowed Future Patch Type

A category opening page may receive a targeted link/card patch only when all are true:

1. The child tool page exists on disk.
2. The category opening page exists on disk.
3. The link is missing from the opening page.
4. The patch stays inside existing landing-page structure.
5. The patch does not add calculator shell scripts.
6. The patch does not add export/report/snapshot/result-ledger behavior.
7. The patch does not change auth/checkout logic.
8. The patch does not redesign the page.
9. The patch preserves existing IDs, classes, script order, and footer/header structure.
10. The patch is verified by an opening-page link coverage audit.

## Keep Review Areas

These must remain manual review unless separately contracted:

```text
PRO_LOCK_DISPLAY_KEEP_REVIEW
PIPELINE_ENTRY_LINKS_KEEP_REVIEW
KB_GUIDE_LINK_KEEP_REVIEW
SUMMARY_PAGE_LINK_REVIEW
CATEGORY_LAYOUT_KEEP_REVIEW
CHECKOUT_AUTH_KEEP_REVIEW
```

## Patch Buckets

### CATEGORY_PAGE_LINK_COVERAGE_COMPLETE

The category page links to all discovered child tool pages.

### CATEGORY_PAGE_MISSING_TOOL_LINKS

The category page exists, child tool pages exist, but some links are missing from the category opening page.

This may become patchable after visual structure review.

### SUMMARY_PAGE_LINK_REVIEW

A summary/master assistant page exists or is planned. It should be linked intentionally, not blindly.

Physical Security already has a summary/master assistant page and can serve as the baseline.

Access Control needs a future summary/master assistant lane.

### GLOBAL_TOOLS_CATEGORY_LINK_COVERAGE_COMPLETE

The global tools opening page links to every discovered category opening page.

### GLOBAL_TOOLS_MISSING_CATEGORY_LINKS

The global tools page exists but does not link to one or more category opening pages.

### NO_CALCULATOR_SHELL_PATCH_YET

No calculator shell behavior should be introduced into opening pages.

## Required Audits

Use:

```powershell
node .\scripts\audit-tools-opening-page-link-coverage-0612.js
node .\scripts\audit-tools-opening-page-link-coverage-0612.js --details
node .\scripts\audit-tools-opening-page-link-coverage-0612.js --plan
```

Expected decision markers:

```text
CATEGORY_PAGE_MISSING_TOOL_LINKS
SUMMARY_PAGE_LINK_REVIEW
OPENING_PAGE_LINK_PATCH_PLAN_READY
NO_CALCULATOR_SHELL_PATCH_YET
OVERALL: PASS
```

## Future Patch Rule

Do not patch immediately from broad KEEP_REVIEW counts.

First generate the link coverage plan, then patch one page family at a time.

Recommended first target:

```text
tools/access-control/index.html
```

Reason: Access Control is the current blueprint category and needs its category opening page aligned before the Access Control summary/master assistant lane.
