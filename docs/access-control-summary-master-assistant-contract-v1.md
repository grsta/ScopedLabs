# Access Control Summary / Master Assistant Contract V1

Date: 2026-06-12

## Purpose

Access Control needs a category summary page with a master assistant, using the existing Physical Security summary/master assistant as the reference pattern.

This contract defines the safe boundary before creating:

```text
/tools/access-control/summary/
```

The summary page should become the final Access Control category rollup and report host.

## Physical Security Baseline

Physical Security already has the reference implementation:

```text
/tools/physical-security/summary/index.html
/tools/physical-security/summary/script.js
```

Observed baseline concepts:

```text
PHYSICAL_SECURITY_SUMMARY_MASTER_ASSISTANT_BASELINE
MASTER_ASSISTANT_ROLLUP
CATEGORY_FINAL_REPORT_HOST
REPORT_METADATA_EXPORT_SECTION
OPEN_REPORT_AND_SAVE_SNAPSHOT
GUIDANCE_MEMORY_READ
AREA_STATE_READ
TOOL_NOTES_ROLLUP
CORE_TOOLS_AND_SPECIALTY_TOOLS
```

## Access Control Target

Access Control summary should provide:

```text
ACCESS_CONTROL_SUMMARY_PAGE
ACCESS_CONTROL_MASTER_ASSISTANT
ACCESS_CONTROL_CATEGORY_ROLLUP
ACCESS_CONTROL_FINAL_REPORT_HOST
ACCESS_CONTROL_TOOL_STATUS_ROLLUP
ACCESS_CONTROL_TOOL_NOTES_ROLLUP
ACCESS_CONTROL_REPORT_METADATA_SECTION
ACCESS_CONTROL_OPEN_REPORT_AND_SAVE_SNAPSHOT
```

## Initial Access Control Tool Families

The summary should roll up the current Access Control child tools discovered from:

```text
/tools/access-control/
```

Known current tools include:

```text
scope-planner
door-count-planner
reader-type-selector
credential-format
access-level-sizing
panel-capacity
lock-power-budget
door-cable-length
elevator-reader-count
fail-safe-fail-secure
special-locking-scope
anti-passback-zones
```

## Required Constraints

The summary/master assistant page must:

- Preserve the existing Access Control category/tool behavior.
- Preserve auth and checkout behavior.
- Preserve export/report/snapshot behavior.
- Preserve hidden result ledger and carry-forward behavior.
- Preserve Knowledge Base behavior.
- Preserve existing tool formulas.
- Avoid changing calculator pages while creating the summary page.
- Avoid redesigning the Access Control category opening page during summary work.
- Use the Physical Security summary as a reference, not a blind copy.

## Summary Page Role

The page should be a category-level rollup, not a calculator.

It may read saved/page-local/report metadata and category/session memory, but it should not perform calculator math directly.

## Implementation Boundary

Allowed future implementation files:

```text
tools/access-control/summary/index.html
tools/access-control/summary/script.js
tools/access-control/summary/style.css
```

Optional future shared assets are allowed only after separate contract/audit proof.

## Required Readiness Before Build

Before creating the page, the readiness audit must confirm:

```text
PHYSICAL_SECURITY_REFERENCE_BASELINE_FOUND
ACCESS_CONTROL_CATEGORY_OPENING_LINKS_COMPLETE
ACCESS_CONTROL_CHILD_TOOLS_DISCOVERED
ACCESS_CONTROL_SUMMARY_PAGE_MISSING_OR_READY_FOR_CREATION
ACCESS_CONTROL_GUIDANCE_MEMORY_REVIEW
ACCESS_CONTROL_REPORT_METADATA_COMPATIBLE
NO_IMPLEMENTATION_PATCH_YET
```

## Keep Review

These remain manual review until the build script proves exact placement:

```text
ACCESS_CONTROL_GUIDANCE_MEMORY_REVIEW
ACCESS_CONTROL_TOOL_NOTE_STORAGE_REVIEW
ACCESS_CONTROL_MASTER_ASSISTANT_COPY_REVIEW
ACCESS_CONTROL_REPORT_EXPORT_ROUTE_REVIEW
ACCESS_CONTROL_CATEGORY_OPENING_SUMMARY_LINK_REVIEW
AUTH_CHECKOUT_KEEP_REVIEW
KB_GUIDE_LINK_KEEP_REVIEW
```

## Future Build Rule

Build only after readiness audit passes.

Build should be a targeted new-page addition, not a broad category rewrite.

Recommended first implementation approach:

1. Create the Access Control summary directory.
2. Use Physical Security summary page structure as reference.
3. Create Access Control-specific copy and tool list.
4. Add report metadata/export controls only if shared report assets already support the page.
5. Add a summary-page proof audit.
6. Add the summary page link to the Access Control opening page only after the page exists.
