# ScopedLabs Category Modernizer V1

## Purpose

The ScopedLabs Category Modernizer is the factory runner for bringing a category of tools up to the current accepted ScopedLabs standard without hand-patching every page forever.

It should not be a blind rewrite tool. It should audit first, classify each tool, then apply only approved safe modules.

## Target Commands

~~~powershell
node .\scripts\audit-category-modernizer-v1.js --category physical-security
node .\scripts\modernize-category-tools-v1.js --category physical-security --dry-run
node .\scripts\modernize-category-tools-v1.js --category physical-security --apply
~~~

## Core Principle

Tool math stays local and explicit.

The Modernizer may standardize page shell, labels, badges, engine wiring, button rhythm, export shells, graphics contracts, Knowledge Base wiring, script order, cache-busting, and diagnostics.

It must not silently change formulas, auth, checkout, pipeline behavior, export payload meaning, snapshot behavior, assistant decisions, or local tool calculations.

## Classification Model

Each tool is classified before any write action.

~~~text
SAFE  -> Known pattern. Module can patch automatically.
WATCH -> Close pattern. Needs review before write.
SKIP  -> Protected/gold-standard/special page.
FAIL  -> Missing critical anchors or risky structure.
~~~

## Module Model

The Modernizer core should load versioned modules. Each module owns one narrow upgrade area.

Initial module families:

~~~text
ToolShellModule
BackContinueModule
BadgeCleanupModule
LabelStandardModule
ExportShellModule
AssistantExportModule
GraphicsContractModule
KbCardModule
ScriptOrderModule
CacheBustModule
DiagnosticsModule
~~~

Future module examples:

~~~text
SnapshotModule
ReportMetadataModule
GuideLinkModule
AnalyzerStandardModule
CADGraphicsModule
PipelineCarryoverModule
AccessibilityModule
SEOPageMetadataModule
~~~

## Module Manifest Requirements

Each module should declare:

~~~text
id
version
description
dependencies
required anchors / IDs
safe patterns
watch patterns
skip conditions
write behavior
cache-bust behavior
rollback notes
~~~

## Protected Pages

Protected pages must be declared in config, not buried randomly in patch logic.

Initial protected page:

~~~text
tools/physical-security/lens-selection/
~~~

Lens Selection remains frozen as the Physical Security visual/interaction gold standard until a factory can reproduce it safely.

## Back + Continue Standard

Accepted output:

~~~html
<div id="toolSpecificFlowActions" class="btn-row ...">
  <a class="btn" href="/tools/category/">Back to Category</a>
  <div id="next-step-row" class="btn-row ..." style="margin-top: 0; display:none;">
    <a id="continue" class="btn btn-primary" href="/tools/category/next-tool/">
      Continue → Next Tool
    </a>
  </div>
</div>
~~~

Then the page calls:

~~~html
<script>
  window.ScopedLabsToolShell?.applyBackContinueShell?.({ rowId: "toolSpecificFlowActions" });
</script>
~~~

Button-based continue behavior is allowed and must be preserved where present, such as Area Planner.

Final-step return behavior is allowed and must be preserved where present, such as License Plate.

## Modernizer Safety Rules

- Dry-run first.
- No browser auto-run behavior until repo-side audit and patching are proven.
- Keep page IDs intact.
- Preserve auth/gating, checkout, pipeline, export, snapshot, KB, assistant, and math behavior.
- Use UTF-8-safe Node scripts.
- Prefer small, reversible patches.
- Report every skip and watch item.
- Remove temporary scripts before commit.
